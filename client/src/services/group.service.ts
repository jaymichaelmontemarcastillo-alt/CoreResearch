// src/services/group.service.ts
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { ResearchGroup, CreateResearchGroupInput } from '../types/group.types';

const COLLECTION_NAME = 'research_groups';

export const groupService = {
  /**
   * Create a new research group.
   * Enforces One Group Per Student rule and auto-associates academic details.
   */
  async createGroup(input: CreateResearchGroupInput): Promise<ResearchGroup> {
    // 0. Enforce maximum 3 members rule
    if (input.memberIds && input.memberIds.length > 3) {
      throw new Error('Group Limit Exceeded: A research group can have a maximum of 3 members.');
    }

    // 1. Enforce One Group Per Student rule for all initial members
    for (const memberId of input.memberIds) {
      const existing = await this.getGroupByStudentId(memberId);
      if (existing) {
        throw new Error('Already in a Group: You are already a member of a research group and cannot join another group.');
      }
    }

    // 2. Determine the next group number for this section if name not provided
    const existingGroups = await this.getGroupsBySection(input.sectionId);
    let name = input.name?.trim();
    if (!name) {
      const groupNumber = existingGroups.length + 1;
      const paddedNumber = groupNumber.toString().padStart(2, '0');
      name = `Group ${paddedNumber}`;
    }

    const groupRef = doc(collection(db, COLLECTION_NAME));
    const now = new Date().toISOString();
    
    const d = new Date(now);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0 = Jan, 7 = Aug
    const academicYear = month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    
    let semester = 'summer';
    if (month >= 7 && month <= 11) semester = '1st';
    else if (month >= 0 && month <= 4) semester = '2nd';

    const newGroup: ResearchGroup = {
      id: groupRef.id,
      name,
      ...input,
      academicYear,
      semester,
      status: input.memberIds.length >= 3 ? 'ready' : 'incomplete',
      createdAt: now,
      updatedAt: now,
    };
    
    await setDoc(groupRef, newGroup);

    // Auto-sync initial members to the group's project and user profile
    for (const memberId of input.memberIds) {
      const memberInfo = input.members?.find((m) => m.uid === memberId);
      this.syncMemberToGroupProject(newGroup.id, memberId, memberInfo).catch((err) => {
        console.warn(`[groupService] Auto-sync failed for member ${memberId}:`, err);
      });
    }

    return newGroup;
  },

  /**
   * Add a student member to an existing group.
   * Validates:
   * 1. Group does not already have 3 members.
   * 2. Student does not already belong to any research group.
   * 3. Student is not already in this group.
   *
   * Automatically assigns and synchronizes the group's current project,
   * research title, adviser, and workspace to the new member.
   */
  async addMemberToGroup(
    groupId: string,
    newMember: { uid: string; fullName: string; email: string; studentNumber?: string }
  ): Promise<ResearchGroup> {
    const group = await this.getGroupById(groupId);
    if (!group) {
      throw new Error('Research group not found.');
    }

    // Validate maximum 3 members rule
    if ((group.members && group.members.length >= 3) || (group.memberIds && group.memberIds.length >= 3)) {
      throw new Error('Group is Full: A research group can have a maximum of 3 members.');
    }

    // Validate if student is already in this group
    if (group.memberIds.includes(newMember.uid)) {
      throw new Error('This student is already a member of this research group.');
    }

    // Validate if student is already in ANY other research group
    const existingGroup = await this.getGroupByStudentId(newMember.uid);
    if (existingGroup) {
      throw new Error('Already in a Group: This student is already a member of a research group and cannot join another group.');
    }

    const updatedMembers = [...group.members, newMember];
    const updatedMemberIds = [...group.memberIds, newMember.uid];
    const updatedStatus = updatedMemberIds.length >= 3 ? 'ready' : 'incomplete';

    const groupRef = doc(db, COLLECTION_NAME, groupId);
    const now = new Date().toISOString();

    await updateDoc(groupRef, {
      members: updatedMembers,
      memberIds: updatedMemberIds,
      status: updatedStatus,
      updatedAt: now,
    });

    // Automatically assign group project, title, adviser & workspace to the new member
    await this.syncMemberToGroupProject(groupId, newMember.uid, newMember);

    return {
      ...group,
      members: updatedMembers,
      memberIds: updatedMemberIds,
      status: updatedStatus,
      updatedAt: now,
    };
  },

  /**
   * Remove a student member from a research group.
   */
  async removeMemberFromGroup(groupId: string, memberUid: string): Promise<ResearchGroup> {
    const group = await this.getGroupById(groupId);
    if (!group) throw new Error('Research group not found.');

    const updatedMembers = group.members.filter(m => m.uid !== memberUid);
    const updatedMemberIds = group.memberIds.filter(id => id !== memberUid);
    const updatedStatus = updatedMemberIds.length >= 3 ? 'ready' : 'incomplete';
    const now = new Date().toISOString();

    const groupRef = doc(db, COLLECTION_NAME, groupId);
    await updateDoc(groupRef, {
      members: updatedMembers,
      memberIds: updatedMemberIds,
      status: updatedStatus,
      updatedAt: now,
    });

    // Unlink member from the group's research project and workspace
    await this.unlinkMemberFromGroupProject(groupId, memberUid);

    return {
      ...group,
      members: updatedMembers,
      memberIds: updatedMemberIds,
      status: updatedStatus,
      updatedAt: now,
    };
  },

  /**
   * Fetch research groups for a specific section.
   */
  async getGroupsBySection(sectionId: string): Promise<ResearchGroup[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('sectionId', '==', sectionId)
    );
    const querySnap = await getDocs(q);
    const groups = querySnap.docs.map((docSnap) => docSnap.data() as ResearchGroup);
    
    return groups.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  /**
   * Fetch research group by student member ID.
   */
  async getGroupByStudentId(studentId: string): Promise<ResearchGroup | null> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('memberIds', 'array-contains', studentId)
    );
    const querySnap = await getDocs(q);
    let group: ResearchGroup | null = null;

    if (!querySnap.empty) {
      // Filter out archived groups to only return the active one
      const activeGroups = querySnap.docs
        .map(doc => doc.data() as ResearchGroup)
        .filter(g => g.status !== 'archived' && !g.isArchived);
      
      if (activeGroups.length > 0) {
        group = activeGroups[0];
      }
    } 

    if (!group) {
      // Fallback: check if the student's user profile has groupId
      try {
        const userDoc = await getDoc(doc(db, 'users', studentId));
        if (userDoc.exists() && userDoc.data().groupId) {
          const fallbackGroup = await this.getGroupById(userDoc.data().groupId);
          if (fallbackGroup && fallbackGroup.status !== 'archived' && !fallbackGroup.isArchived) {
            group = fallbackGroup;
          }
        }
      } catch (e) {}
    }

    if (!group) return null;

    // If group does not have title in its record, check if workspace/proposal has it
    if (!group.title) {
      try {
        const wsQuery = query(collection(db, 'manuscript_workspaces'), where('groupId', '==', group.id));
        const wsSnap = await getDocs(wsQuery);
        if (!wsSnap.empty && wsSnap.docs[0].data().title) {
          group.title = wsSnap.docs[0].data().title;
        } else {
          const propQuery = query(collection(db, 'proposals'), where('groupId', '==', group.id));
          const propSnap = await getDocs(propQuery);
          if (!propSnap.empty && propSnap.docs[0].data().title) {
            group.title = propSnap.docs[0].data().title;
          }
        }
      } catch (e) {}
    }

    return group;
  },

  /**
   * Fetch all groups assigned to a specific adviser.
   */
  async getGroupsByAdviserId(adviserId: string): Promise<ResearchGroup[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('adviserId', '==', adviserId)
    );
    const querySnap = await getDocs(q);
    return querySnap.docs.map((d) => d.data() as ResearchGroup);
  },

  /**
   * Assign (or update) an adviser on a group.
   * Called by admin from the User Directory.
   */
  async updateGroupAdviser(
    groupId: string,
    adviserId: string,
    adviserName: string
  ): Promise<void> {
    const ref = doc(db, COLLECTION_NAME, groupId);
    await updateDoc(ref, {
      adviserId,
      adviserName,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Update a research group with new data.
   * Used for editing group details like adviser, members, etc.
   */
  async updateGroup(
    groupId: string,
    data: {
      adviserName?: string;
      members?: Array<{ uid: string; fullName: string; email?: string }>;
      memberIds?: string[];
      status?: string;
      name?: string;
      courseId?: string;
      courseName?: string;
      sectionId?: string;
      sectionName?: string;
      adviserId?: string;
      panelists?: any[];
      title?: string;
    }
  ): Promise<void> {
    const ref = doc(db, COLLECTION_NAME, groupId);
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };
    
    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    
    if (data.adviserName !== undefined) {
      updateData.adviserName = data.adviserName;
    }
    
    if (data.adviserId !== undefined) {
      updateData.adviserId = data.adviserId;
    }

    if (data.panelists !== undefined) {
      updateData.panelists = data.panelists;
    }
    
    if (data.members !== undefined) {
      updateData.members = data.members;
      // Also update memberIds array for querying
      updateData.memberIds = data.members.map(m => m.uid);
    }
    
    if (data.memberIds !== undefined) {
      updateData.memberIds = data.memberIds;
    }
    
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    
    if (data.courseId !== undefined) {
      updateData.courseId = data.courseId;
    }
    
    if (data.courseName !== undefined) {
      updateData.courseName = data.courseName;
    }
    
    if (data.sectionId !== undefined) {
      updateData.sectionId = data.sectionId;
    }
    
    if (data.sectionName !== undefined) {
      updateData.sectionName = data.sectionName;
    }
    
    await updateDoc(ref, updateData);

    // If members were updated, auto-sync each member to the group project
    if (data.members !== undefined && Array.isArray(data.members)) {
      for (const m of data.members) {
        if (m.uid) {
          this.syncMemberToGroupProject(groupId, m.uid, m).catch((err) => {
            console.warn(`[groupService] updateGroup sync error for ${m.uid}:`, err);
          });
        }
      }
    }
  },

  /**
   * Automatically synchronize a group member's account to inherit the group's
   * current project, title, adviser, and workspace details.
   */
  async syncMemberToGroupProject(
    groupId: string,
    memberUid: string,
    memberInfo?: { fullName?: string; email?: string; studentNumber?: string }
  ): Promise<void> {
    if (!groupId || !memberUid) return;

    try {
      const groupRef = doc(db, COLLECTION_NAME, groupId);
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) return;
      const group = groupSnap.data() as ResearchGroup;

      let projectTitle = group.title || '';
      let adviserId = group.adviserId || '';
      let adviserName = group.adviserName || '';

      const leaderUid = group.memberIds?.[0] || group.members?.[0]?.uid || '';

      // 1. Check existing Manuscript Workspaces for this group (or leader)
      try {
        let wsSnap = await getDocs(
          query(collection(db, 'manuscript_workspaces'), where('groupId', '==', groupId))
        );

        if (wsSnap.empty && leaderUid) {
          wsSnap = await getDocs(
            query(collection(db, 'manuscript_workspaces'), where('studentId', '==', leaderUid))
          );
          if (wsSnap.empty) {
            wsSnap = await getDocs(
              query(collection(db, 'manuscript_workspaces'), where('memberIds', 'array-contains', leaderUid))
            );
          }
        }

        if (!wsSnap.empty) {
          for (const d of wsSnap.docs) {
            const ws = d.data();
            if (!projectTitle && ws.title) projectTitle = ws.title;
            if (!adviserId && ws.adviserId) {
              adviserId = ws.adviserId;
              adviserName = ws.adviserName || adviserName;
            }

            const existingMemberIds = Array.isArray(ws.memberIds) ? ws.memberIds : [ws.studentId];
            const allGroupMemberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
            const updatedMemberIds = Array.from(new Set([...existingMemberIds, ...allGroupMemberIds, memberUid]));
            const existingMembers = Array.isArray(ws.members) ? ws.members : [];
            const groupMembers = Array.isArray(group.members) ? group.members : [];
            
            const memberMap = new Map();
            existingMembers.forEach((m: any) => memberMap.set(m.uid, m));
            groupMembers.forEach((m: any) => memberMap.set(m.uid, m));
            if (memberInfo && memberUid) {
              memberMap.set(memberUid, {
                uid: memberUid,
                fullName: memberInfo.fullName || 'Student Researcher',
                email: memberInfo.email || '',
                studentNumber: memberInfo.studentNumber || '',
              });
            }

            const wsUpdates: any = {
              groupId: groupId,
              groupName: group.name || ws.groupName || 'Research Group',
              memberIds: updatedMemberIds,
              members: Array.from(memberMap.values()),
              updatedAt: new Date().toISOString(),
            };
            await updateDoc(d.ref, wsUpdates);
          }
        }
      } catch (wsErr) {
        console.warn('[groupService] Workspace sync error:', wsErr);
      }

      // 2. Check existing Proposals for this group (or leader)
      try {
        let propSnap = await getDocs(
          query(collection(db, 'proposals'), where('groupId', '==', groupId))
        );
        if (propSnap.empty && leaderUid) {
          propSnap = await getDocs(
            query(collection(db, 'proposals'), where('submittedByUid', '==', leaderUid))
          );
        }

        if (!propSnap.empty) {
          for (const d of propSnap.docs) {
            const prop = d.data();
            if (!projectTitle && prop.title) projectTitle = prop.title;

            const propMemberIds = Array.isArray(prop.memberIds) ? prop.memberIds : [prop.submittedByUid];
            const allGroupMemberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
            const updatedMemberIds = Array.from(new Set([...propMemberIds, ...allGroupMemberIds, memberUid]));
            const existingMembers = Array.isArray(prop.members) ? prop.members : [];
            const groupMembers = Array.isArray(group.members) ? group.members : [];

            const memberMap = new Map();
            existingMembers.forEach((m: any) => memberMap.set(m.uid, m));
            groupMembers.forEach((m: any) => memberMap.set(m.uid, m));
            if (memberInfo && memberUid) {
              memberMap.set(memberUid, {
                uid: memberUid,
                fullName: memberInfo.fullName || 'Student Researcher',
                email: memberInfo.email || '',
                studentNumber: memberInfo.studentNumber || '',
              });
            }

            await updateDoc(d.ref, {
              groupId: groupId,
              groupName: group.name || prop.groupName || 'Research Group',
              memberIds: updatedMemberIds,
              members: Array.from(memberMap.values()),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } catch (propErr) {
        console.warn('[groupService] Proposals sync error:', propErr);
      }

      // 3. Check existing Adviser Requests for this group (or leader)
      try {
        let reqSnap = await getDocs(
          query(collection(db, 'adviser_requests'), where('groupId', '==', groupId))
        );
        if (reqSnap.empty && leaderUid) {
          reqSnap = await getDocs(
            query(collection(db, 'adviser_requests'), where('studentId', '==', leaderUid))
          );
        }

        if (!reqSnap.empty) {
          for (const d of reqSnap.docs) {
            const req = d.data();
            if (!projectTitle && req.researchTitle) projectTitle = req.researchTitle;
            if (!adviserId && req.adviserId) {
              adviserId = req.adviserId;
              adviserName = req.adviserName || adviserName;
            }

            const reqMemberIds = Array.isArray(req.memberIds) ? req.memberIds : [req.studentId];
            const allGroupMemberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
            const updatedMemberIds = Array.from(new Set([...reqMemberIds, ...allGroupMemberIds, memberUid]));
            const existingMembers = Array.isArray(req.members) ? req.members : [];
            const groupMembers = Array.isArray(group.members) ? group.members : [];

            const memberMap = new Map();
            existingMembers.forEach((m: any) => memberMap.set(m.uid, m));
            groupMembers.forEach((m: any) => memberMap.set(m.uid, m));
            if (memberInfo && memberUid) {
              memberMap.set(memberUid, {
                uid: memberUid,
                fullName: memberInfo.fullName || 'Student Researcher',
                email: memberInfo.email || '',
              });
            }

            await updateDoc(d.ref, {
              groupId: groupId,
              groupName: group.name || req.groupName || 'Research Group',
              memberIds: updatedMemberIds,
              members: Array.from(memberMap.values()),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } catch (reqErr) {
        console.warn('[groupService] Adviser requests sync error:', reqErr);
      }

      // 4. Check existing Documents (link leader's documents to the group)
      try {
        if (leaderUid) {
          const docSnap = await getDocs(
            query(collection(db, 'documents'), where('ownerId', '==', leaderUid))
          );
          for (const d of docSnap.docs) {
            const docData = d.data();
            if (!docData.groupId) {
              await updateDoc(d.ref, {
                groupId: groupId,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
      } catch (docErr) {
        console.warn('[groupService] Document sync error:', docErr);
      }

      // 5. If group doc itself was missing title or adviser, backfill it
      if ((!group.title && projectTitle) || (!group.adviserId && adviserId)) {
        const groupUpdates: any = { updatedAt: new Date().toISOString() };
        if (!group.title && projectTitle) groupUpdates.title = projectTitle;
        if (!group.adviserId && adviserId) {
          groupUpdates.adviserId = adviserId;
          groupUpdates.adviserName = adviserName;
        }
        await updateDoc(groupRef, groupUpdates);
      }

      // 6. Update user profiles for ALL members in this group to bind them to the leader's project
      const allMembersToSync = Array.from(new Set([...(group.memberIds || []), memberUid]));
      for (const uid of allMembersToSync) {
        if (!uid) continue;
        try {
          const userRef = doc(db, 'users', uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const userUpdates: any = {
              groupId: group.id,
              groupName: group.name,
              updated_at: new Date().toISOString(),
            };

            if (group.courseId && !userData.courseId) userUpdates.courseId = group.courseId;
            if (group.courseName && !userData.program) userUpdates.program = group.courseName;
            if (group.sectionId && !userData.sectionId) userUpdates.sectionId = group.sectionId;
            if (group.sectionName && !userData.sectionName) userUpdates.sectionName = group.sectionName;

            if (projectTitle) {
              userUpdates.projectTitle = projectTitle;
              userUpdates.researchTitle = projectTitle;
            }
            if (adviserId) {
              userUpdates.adviserId = adviserId;
              userUpdates.adviserName = adviserName;
            }

            await updateDoc(userRef, userUpdates);
          }
        } catch (uErr) {
          console.warn(`[groupService] Error updating user profile ${uid}:`, uErr);
        }
      }
    } catch (err) {
      console.error('[groupService] syncMemberToGroupProject failed:', err);
    }
  },

  /**
   * Unlink a student member from a group's project and workspace records
   */
  async unlinkMemberFromGroupProject(groupId: string, memberUid: string): Promise<void> {
    if (!groupId || !memberUid) return;

    try {
      // 1. Clear group fields on user profile
      const userRef = doc(db, 'users', memberUid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          groupId: '',
          groupName: '',
          projectTitle: '',
          researchTitle: '',
          adviserId: '',
          adviserName: '',
          updated_at: new Date().toISOString(),
        });
      }

      // 2. Remove member from manuscript_workspaces
      const wsQuery = query(collection(db, 'manuscript_workspaces'), where('groupId', '==', groupId));
      const wsSnap = await getDocs(wsQuery);
      for (const d of wsSnap.docs) {
        const ws = d.data();
        const memberIds = Array.isArray(ws.memberIds) ? ws.memberIds.filter((id: string) => id !== memberUid) : [];
        const members = Array.isArray(ws.members) ? ws.members.filter((m: any) => m.uid !== memberUid) : [];
        await updateDoc(d.ref, {
          memberIds,
          members,
          updatedAt: new Date().toISOString(),
        });
      }

      // 3. Remove member from proposals
      const propQuery = query(collection(db, 'proposals'), where('groupId', '==', groupId));
      const propSnap = await getDocs(propQuery);
      for (const d of propSnap.docs) {
        const prop = d.data();
        const memberIds = Array.isArray(prop.memberIds) ? prop.memberIds.filter((id: string) => id !== memberUid) : [];
        const members = Array.isArray(prop.members) ? prop.members.filter((m: any) => m.uid !== memberUid) : [];
        await updateDoc(d.ref, {
          memberIds,
          members,
          updatedAt: new Date().toISOString(),
        });
      }

      // 4. Remove member from adviser_requests
      const reqQuery = query(collection(db, 'adviser_requests'), where('groupId', '==', groupId));
      const reqSnap = await getDocs(reqQuery);
      for (const d of reqSnap.docs) {
        const req = d.data();
        const memberIds = Array.isArray(req.memberIds) ? req.memberIds.filter((id: string) => id !== memberUid) : [];
        const members = Array.isArray(req.members) ? req.members.filter((m: any) => m.uid !== memberUid) : [];
        await updateDoc(d.ref, {
          memberIds,
          members,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('[groupService] unlinkMemberFromGroupProject failed:', err);
    }
  },

  /**
   * Delete a research group by ID.
   */
  async deleteGroup(groupId: string): Promise<void> {
    const group = await this.getGroupById(groupId);
    if (group && Array.isArray(group.memberIds)) {
      for (const uid of group.memberIds) {
        await this.unlinkMemberFromGroupProject(groupId, uid).catch(() => {});
      }
    }
    const ref = doc(db, COLLECTION_NAME, groupId);
    await deleteDoc(ref);
  },

  /**
   * Fetch a single research group by ID.
   */
  async getGroupById(groupId: string): Promise<ResearchGroup | null> {
    const ref = doc(db, COLLECTION_NAME, groupId);
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) return null;
    return docSnap.data() as ResearchGroup;
  },

  /**
   * Fetch all research groups.
   */
  async getAllGroups(): Promise<ResearchGroup[]> {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnap = await getDocs(q);
    return querySnap.docs.map((docSnap) => docSnap.data() as ResearchGroup);
  },

  /**
   * Archive an advisee group once they have completed their research.
   * Permission: Only the assigned research adviser (or an admin/coordinator) can archive.
   */
  async archiveAdviseeGroup(
    groupId: string,
    adviserUid: string,
    adviserName?: string,
    archiveReason?: string,
    userRole?: string
  ): Promise<ResearchGroup> {
    const groupRef = doc(db, COLLECTION_NAME, groupId);
    const snap = await getDoc(groupRef);
    if (!snap.exists()) {
      throw new Error('Research group not found.');
    }

    const group = snap.data() as ResearchGroup;
    const isAssignedAdviser = group.adviserId === adviserUid;
    const isPrivileged = userRole === 'admin' || userRole === 'research_coordinator';

    if (!isAssignedAdviser && !isPrivileged) {
      throw new Error('Permission Denied: Only the assigned research adviser can archive this advisee group.');
    }

    const now = new Date().toISOString();
    const reason = archiveReason?.trim() || 'Research manuscript completed and signed off by adviser.';

    const updates: Partial<ResearchGroup> = {
      isArchived: true,
      status: 'archived',
      archivedAt: now,
      archivedBy: adviserUid,
      archivedByName: adviserName || group.adviserName || 'Faculty Adviser',
      archiveReason: reason,
      updatedAt: now,
    };

    await updateDoc(groupRef, updates);

    // Also mark any associated workspaces as completed / archived
    try {
      const wsQ = query(collection(db, 'manuscript_workspaces'), where('groupId', '==', groupId));
      const wsSnap = await getDocs(wsQ);
      for (const d of wsSnap.docs) {
        await updateDoc(d.ref, {
          isArchived: true,
          status: 'completed',
          archivedAt: now,
          archivedBy: adviserUid,
          archivedByName: adviserName || group.adviserName || 'Faculty Adviser',
          archiveReason: reason,
          updatedAt: now,
        });
      }
    } catch (wsErr) {
      console.warn('[groupService] Error archiving associated workspaces:', wsErr);
    }

    // Log to system activity
    try {
      const { systemActivityService } = await import('./systemActivity.service');
      await systemActivityService.logActivity({
        actorId: adviserUid,
        actorName: adviserName || group.adviserName || 'Faculty Adviser',
        actorRole: 'adviser',
        category: 'workspace',
        action: 'group_archived',
        title: 'Advisee Group Archived',
        description: `${adviserName || 'Adviser'} archived advisee group "${group.name}" (${group.title || 'Research'}) upon completion. Reason: ${reason}`,
        targetId: groupId,
        targetType: 'group',
      });
    } catch (actErr) {
      console.warn('[groupService] Error logging archive activity:', actErr);
    }

    return { ...group, ...updates } as ResearchGroup;
  },

  /**
   * Restore / Unarchive an advisee group back to active status.
   * Permission: Only the assigned research adviser (or an admin/coordinator) can unarchive.
   */
  async unarchiveAdviseeGroup(
    groupId: string,
    adviserUid: string,
    adviserName?: string,
    userRole?: string
  ): Promise<ResearchGroup> {
    const groupRef = doc(db, COLLECTION_NAME, groupId);
    const snap = await getDoc(groupRef);
    if (!snap.exists()) {
      throw new Error('Research group not found.');
    }

    const group = snap.data() as ResearchGroup;
    const isAssignedAdviser = group.adviserId === adviserUid;
    const isPrivileged = userRole === 'admin' || userRole === 'research_coordinator';

    if (!isAssignedAdviser && !isPrivileged) {
      throw new Error('Permission Denied: Only the assigned research adviser can restore this advisee group.');
    }

    const now = new Date().toISOString();
    const updates: Partial<ResearchGroup> = {
      isArchived: false,
      status: 'active',
      archiveReason: '',
      updatedAt: now,
    };

    await updateDoc(groupRef, updates);

    // Restore workspace status
    try {
      const wsQ = query(collection(db, 'manuscript_workspaces'), where('groupId', '==', groupId));
      const wsSnap = await getDocs(wsQ);
      for (const d of wsSnap.docs) {
        await updateDoc(d.ref, {
          isArchived: false,
          status: 'in_progress',
          updatedAt: now,
        });
      }
    } catch (wsErr) {
      console.warn('[groupService] Error restoring associated workspaces:', wsErr);
    }

    // Log to system activity
    try {
      const { systemActivityService } = await import('./systemActivity.service');
      await systemActivityService.logActivity({
        actorId: adviserUid,
        actorName: adviserName || group.adviserName || 'Faculty Adviser',
        actorRole: 'adviser',
        category: 'workspace',
        action: 'group_restored',
        title: 'Advisee Group Restored',
        description: `${adviserName || 'Adviser'} restored advisee group "${group.name}" back to active status.`,
        targetId: groupId,
        targetType: 'group',
      });
    } catch (actErr) {}

    return { ...group, ...updates } as ResearchGroup;
  }
};

export default groupService;