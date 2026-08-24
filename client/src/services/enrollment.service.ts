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
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
  EnrollmentInvitation,
  CreateEnrollmentInvitationInput,
} from '../types/enrollmentInvitation.types';
import { userService } from './user.service';

const COLLECTION_NAME = 'enrollment_invitations';

export const enrollmentService = {
  /**
   * Create a new enrollment invitation link
   */
  async createInvitation(input: CreateEnrollmentInvitationInput): Promise<EnrollmentInvitation> {
    const inviteRef = doc(collection(db, COLLECTION_NAME));
    const now = new Date().toISOString();
    
    const newInvitation: EnrollmentInvitation = {
      id: inviteRef.id,
      ...input,
      createdAt: now,
    };
    
    await setDoc(inviteRef, newInvitation);
    return newInvitation;
  },

  /**
   * Fetch an invitation by its ID (invite code)
   */
  async getInvitationById(id: string): Promise<EnrollmentInvitation | null> {
    const inviteRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(inviteRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as EnrollmentInvitation;
  },

  /**
   * Get all invitations for a specific section
   */
  async getInvitationsBySection(sectionId: string): Promise<EnrollmentInvitation[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('sectionId', '==', sectionId)
    );
    const querySnap = await getDocs(q);
    return querySnap.docs.map((docSnap) => docSnap.data() as EnrollmentInvitation);
  },

  /**
   * Get invitations exactly matching the course, specialization, and section
   */
  async getInvitationsForFilters(courseId: string, specializationId?: string, sectionId?: string): Promise<EnrollmentInvitation[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('courseId', '==', courseId)
    );
    const querySnap = await getDocs(q);
    const invites = querySnap.docs.map((docSnap) => docSnap.data() as EnrollmentInvitation);
    
    return invites.filter(invite => {
      const invSpec = invite.specializationId || "";
      const querySpec = specializationId || "";
      if (invSpec !== querySpec) return false;
      
      const invSec = invite.sectionId || "";
      const querySec = sectionId || "";
      if (invSec !== querySec) return false;
      
      return true;
    });
  },

  /**
   * Deactivate an invitation
   */
  async deactivateInvitation(id: string): Promise<void> {
    const inviteRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(inviteRef, {
      active: false,
    });
  },

  /**
   * Enroll a student via an invitation
   */
  async enrollStudent(uid: string, invite: EnrollmentInvitation): Promise<void> {
    if (!invite.active) {
      throw new Error("This invitation is no longer active.");
    }
    
    const updates: any = {
      courseId: invite.courseId,
      sectionId: invite.sectionId,
    };
    
    if (invite.specializationId) {
      updates.specializationId = invite.specializationId;
    }
    
    await userService.updateUser(uid, updates);
  },

  /**
   * Delete an invitation permanently
   */
  async deleteInvitation(id: string): Promise<void> {
    const inviteRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(inviteRef);
  }
};

export default enrollmentService;
