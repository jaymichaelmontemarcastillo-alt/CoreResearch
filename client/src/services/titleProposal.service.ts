// ─────────────────────────────────────────────────────────────────────────────
// Title Proposal Service — CoreResearch Phase 1
// ─────────────────────────────────────────────────────────────────────────────
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
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
  TitleProposal,
  CreateProposalInput,
  UpdateProposalInput,
  CoordinatorEvaluationInput,
  ProposalStatus,
} from '../types/proposal.types';

const COLLECTION = 'proposals';

/**
 * Removes all keys whose value is `undefined` before writing to Firestore.
 * Firestore rejects documents containing `undefined` values.
 */
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export const titleProposalService = {

  // ── Create ──────────────────────────────────────────────────────────────────

  /**
   * Create a new proposal document.
   * Default status is 'draft' unless overridden in input.
   */
  async createProposal(input: CreateProposalInput): Promise<TitleProposal> {
    const ref = doc(collection(db, COLLECTION));
    const now = new Date().toISOString();

    const d = new Date(now);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0 = Jan, 7 = Aug
    const academicYear = month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    
    let semester = 'summer';
    if (month >= 7 && month <= 11) semester = '1st';
    else if (month >= 0 && month <= 4) semester = '2nd';

    const newProposal: TitleProposal = {
      id: ref.id,
      title: input.title,
      description: input.description || input.rationale || '',
      researchCategory: input.researchCategory,
      categoryId: input.categoryId,
      rationale: input.rationale,
      objectives: input.objectives,
      scopeAndDelimitation: input.scopeAndDelimitation,
      methodology: input.methodology,
      attachments: input.attachments || [],

      studentId: input.submittedByUid,
      studentName: input.submittedByName,
      groupId: input.groupId,
      groupName: input.groupName,

      courseId: input.courseId,
      courseName: input.courseName,
      sectionId: input.sectionId,
      sectionName: input.sectionName,
      academicYear,
      semester,

      submittedByUid: input.submittedByUid,
      submittedByName: input.submittedByName,

      status: input.status ?? 'draft',
      createdAt: now,
      updatedAt: now,
      revisionCount: 0,
      ...(input.status === 'submitted' ? { submittedAt: now, lastSubmittedAt: now } : {})
    };

    await setDoc(ref, stripUndefined(newProposal) as TitleProposal);
    return newProposal;
  },

  // ── Read ────────────────────────────────────────────────────────────────────

  /**
   * Fetch a single proposal by document ID.
   */
  async getProposalById(id: string): Promise<TitleProposal | null> {
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as TitleProposal;
  },

  /**
   * Fetch all proposals belonging to a specific research group.
   * Students should always query by groupId.
   */
  async getProposalsByGroup(groupId: string, leaderUid?: string): Promise<TitleProposal[]> {
    if (!groupId) return [];
    const q = query(collection(db, COLLECTION), where('groupId', '==', groupId));
    const snap = await getDocs(q);
    let list = snap.docs.map((d) => d.data() as TitleProposal);

    if (list.length === 0) {
      // If no leaderUid passed, attempt reading from group doc
      let resolvedLeaderUid = leaderUid;
      let groupMembers: any[] = [];
      let groupMemberIds: string[] = [];
      try {
        const gSnap = await getDoc(doc(db, 'research_groups', groupId));
        if (gSnap.exists()) {
          const gData = gSnap.data();
          if (!resolvedLeaderUid) {
            resolvedLeaderUid = gData.memberIds?.[0] || gData.members?.[0]?.uid;
          }
          groupMembers = gData.members || [];
          groupMemberIds = gData.memberIds || [];
        }
      } catch (e) {}

      if (resolvedLeaderUid) {
        const leaderQ = query(collection(db, COLLECTION), where('submittedByUid', '==', resolvedLeaderUid));
        const leaderSnap = await getDocs(leaderQ);
        if (!leaderSnap.empty) {
          list = leaderSnap.docs.map((d) => d.data() as TitleProposal);
          // Link this proposal to the group in Firestore
          for (const d of leaderSnap.docs) {
            const prop = d.data() as TitleProposal;
            const curMemberIds = Array.isArray(prop.memberIds) ? prop.memberIds : [prop.submittedByUid];
            const mergedIds = Array.from(new Set([...curMemberIds, ...groupMemberIds]));
            updateDoc(d.ref, {
              groupId: groupId,
              memberIds: mergedIds,
              members: groupMembers.length > 0 ? groupMembers : (prop.members || []),
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
          }
        }
      }
    }

    return list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  /**
   * Fetch all proposals submitted by or associated with a specific student UID.
   */
  async getProposalsByStudentId(studentUid: string): Promise<TitleProposal[]> {
    if (!studentUid) return [];
    const qSubmitted = query(collection(db, COLLECTION), where('submittedByUid', '==', studentUid));
    const snapSubmitted = await getDocs(qSubmitted);
    const list = snapSubmitted.docs.map((d) => d.data() as TitleProposal);

    const qMember = query(collection(db, COLLECTION), where('memberIds', 'array-contains', studentUid));
    const snapMember = await getDocs(qMember);
    const memberList = snapMember.docs.map((d) => d.data() as TitleProposal);

    const map = new Map<string, TitleProposal>();
    [...list, ...memberList].forEach((p) => map.set(p.id, p));
    const merged = Array.from(map.values());

    return merged.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  /**
   * Add a student member to an existing proposal
   */
  async addMemberToProposal(
    proposalId: string,
    member: { uid: string; fullName: string; email?: string; studentNumber?: string }
  ): Promise<void> {
    const ref = doc(db, COLLECTION, proposalId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data() as TitleProposal;
    const currentMemberIds = Array.isArray(data.memberIds) ? data.memberIds : [data.submittedByUid];
    if (currentMemberIds.includes(member.uid)) return;

    const updatedMemberIds = [...currentMemberIds, member.uid];
    const currentMembers = Array.isArray(data.members) ? data.members : [];
    const updatedMembers = [...currentMembers.filter((m: any) => m.uid !== member.uid), member];

    await updateDoc(ref, {
      memberIds: updatedMemberIds,
      members: updatedMembers,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Remove a student member from a proposal
   */
  async removeMemberFromProposal(proposalId: string, memberUid: string): Promise<void> {
    const ref = doc(db, COLLECTION, proposalId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data() as TitleProposal;
    const currentMemberIds = Array.isArray(data.memberIds) ? data.memberIds : [];
    const currentMembers = Array.isArray(data.members) ? data.members : [];

    await updateDoc(ref, {
      memberIds: currentMemberIds.filter((id) => id !== memberUid),
      members: currentMembers.filter((m: any) => m.uid !== memberUid),
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Fetch all proposals with status 'submitted' or 'needs_revision' for coordinator queue.
   * Coordinators see all non-draft proposals.
   */
  async getSubmittedProposals(): Promise<TitleProposal[]> {
    const q = query(
      collection(db, COLLECTION),
      where('status', 'in', ['submitted', 'needs_revision', 'approved'])
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as TitleProposal);
    return list.sort(
      (a, b) =>
        new Date(b.lastSubmittedAt ?? b.submittedAt ?? b.createdAt).getTime() -
        new Date(a.lastSubmittedAt ?? a.submittedAt ?? a.createdAt).getTime()
    );
  },

  /**
   * Real-time subscription to coordinator queue
   */
  subscribeSubmittedProposals(
    onUpdate: (proposals: TitleProposal[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const q = query(
      collection(db, COLLECTION),
      where('status', 'in', ['submitted', 'needs_revision', 'approved'])
    );
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as TitleProposal);
        list.sort(
          (a, b) =>
            new Date(b.lastSubmittedAt ?? b.submittedAt ?? b.createdAt).getTime() -
            new Date(a.lastSubmittedAt ?? a.submittedAt ?? a.createdAt).getTime()
        );
        onUpdate(list);
      },
      (err) => {
        console.warn('[titleProposalService] subscribeSubmittedProposals error:', err);
        if (onError) onError(err);
      }
    );
  },

  /**
   * Fetch proposals for an adviser — returns all non-draft proposals for their assigned groups.
   * groupIds should come from groupService.getGroupsByAdviserId().
   */
  async getProposalsByGroupIds(groupIds: string[]): Promise<TitleProposal[]> {
    if (groupIds.length === 0) return [];
    
    // Firestore supports a maximum of 30 disjunctions per query.
    // We have 3 items in the 'status' IN clause, so we can only query up to 10 'groupId' items at a time (10 * 3 = 30).
    const chunkSize = 10;
    const allProposals: TitleProposal[] = [];
    
    for (let i = 0; i < groupIds.length; i += chunkSize) {
      const chunk = groupIds.slice(i, i + chunkSize);
      const q = query(
        collection(db, COLLECTION),
        where('groupId', 'in', chunk),
        where('status', 'in', ['submitted', 'needs_revision', 'approved'])
      );
      const snap = await getDocs(q);
      allProposals.push(...snap.docs.map((d) => d.data() as TitleProposal));
    }
    
    return allProposals.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  /**
   * Fetch ALL proposals (admin use).
   */
  async getAllProposals(): Promise<TitleProposal[]> {
    const q = query(collection(db, COLLECTION));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as TitleProposal);
    return list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  // ── Student Actions ─────────────────────────────────────────────────────────

  /**
   * Save a proposal as draft (partial content allowed).
   */
  async saveDraft(id: string, updates: UpdateProposalInput): Promise<void> {
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, stripUndefined({
      status: 'draft',
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  },

  /**
   * Submit a proposal to the coordinator review queue.
   * Sets status to 'submitted' and records submission timestamps.
   */
  async submitProposal(id: string, submittedByUid: string, submittedByName: string): Promise<void> {
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Proposal not found.');

    const existing = snap.data() as TitleProposal;
    const now = new Date().toISOString();

    await updateDoc(ref, stripUndefined({
      status: 'submitted',
      submittedByUid,
      submittedByName,
      // Set submittedAt only on first submission
      ...(existing.submittedAt ? {} : { submittedAt: now }),
      lastSubmittedAt: now,
      updatedAt: now,
    }));
  },

  /**
   * Resubmit a proposal that was in 'needs_revision'.
   * Increments revisionCount and updates lastSubmittedAt.
   */
  async resubmitProposal(
    id: string,
    updates: UpdateProposalInput,
    submittedByUid: string,
    submittedByName: string
  ): Promise<void> {
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Proposal not found.');

    const existing = snap.data() as TitleProposal;
    const now = new Date().toISOString();

    await updateDoc(ref, stripUndefined({
      ...updates,
      status: 'submitted',
      submittedByUid,
      submittedByName,
      lastSubmittedAt: now,
      updatedAt: now,
      revisionCount: (existing.revisionCount ?? 0) + 1,
      // Clear previous coordinator feedback so coordinator provides fresh feedback
      coordinatorFeedback: '',
      reviewedAt: null,
    }));
  },

  /**
   * Generic field update (for auto-save / draft updates).
   */
  async updateProposal(id: string, updates: UpdateProposalInput): Promise<void> {
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, stripUndefined({
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  },

  // ── Coordinator Actions ─────────────────────────────────────────────────────

  /**
   * Coordinator requests revision.
   * Sets status to 'needs_revision' and records feedback.
   */
  async requestRevision(proposalId: string, evaluation: CoordinatorEvaluationInput): Promise<void> {
    const ref = doc(db, COLLECTION, proposalId);
    const now = new Date().toISOString();
    await updateDoc(ref, stripUndefined({
      status: 'needs_revision',
      coordinatorId: evaluation.coordinatorId,
      coordinatorName: evaluation.coordinatorName,
      coordinatorFeedback: evaluation.coordinatorFeedback,
      reviewedAt: now,
      updatedAt: now,
    }));
  },

  /**
   * Coordinator approves the proposal.
   * Sets status to 'approved', records approval info.
   * Proposal becomes locked from student editing.
   */
  async approveProposal(proposalId: string, evaluation: CoordinatorEvaluationInput): Promise<void> {
    const ref = doc(db, COLLECTION, proposalId);
    const now = new Date().toISOString();
    await updateDoc(ref, stripUndefined({
      status: 'approved',
      coordinatorId: evaluation.coordinatorId,
      coordinatorName: evaluation.coordinatorName,
      coordinatorFeedback: evaluation.coordinatorFeedback,
      reviewedAt: now,
      approvedAt: now,
      updatedAt: now,
    }));
  },

  /**
   * Coordinator rejects the proposal.
   */
  async rejectProposal(proposalId: string, evaluation: CoordinatorEvaluationInput): Promise<void> {
    const ref = doc(db, COLLECTION, proposalId);
    const now = new Date().toISOString();
    await updateDoc(ref, stripUndefined({
      status: 'rejected',
      coordinatorId: evaluation.coordinatorId,
      coordinatorName: evaluation.coordinatorName,
      coordinatorFeedback: evaluation.coordinatorFeedback,
      reviewedAt: now,
      updatedAt: now,
    }));
  },

  // ── Delete ──────────────────────────────────────────────────────────────────

  /**
   * Permanently delete a proposal (only allowed for drafts).
   */
  async deleteProposal(id: string): Promise<void> {
    const ref = doc(db, COLLECTION, id);
    await deleteDoc(ref);
  },

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Returns true if the student can edit this proposal.
   * Editing is allowed for: draft, needs_revision.
   */
  canStudentEdit(status: ProposalStatus): boolean {
    return status === 'draft' || status === 'needs_revision';
  },

  /**
   * Returns true if the student can delete this proposal.
   * Only drafts can be deleted.
   */
  canStudentDelete(status: ProposalStatus): boolean {
    return status === 'draft';
  },

  /**
   * Returns true if the coordinator can review this proposal.
   */
  canCoordinatorReview(status: ProposalStatus): boolean {
    return status === 'submitted';
  },
};

export default titleProposalService;
