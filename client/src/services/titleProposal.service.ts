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
import {
  TitleProposal,
  CreateProposalInput,
  UpdateProposalInput,
  ProposalStatus,
  ProposalReviewComment,
} from '../types/proposal.types';

const COLLECTION_NAME = 'proposals';

export const titleProposalService = {
  /**
   * Create a new title proposal document.
   */
  async createProposal(input: CreateProposalInput): Promise<TitleProposal> {
    const proposalRef = doc(collection(db, COLLECTION_NAME));
    const now = new Date().toISOString();
    const newProposal: TitleProposal = {
      id: proposalRef.id,
      ...input,
      status: 'pending',
      comments: [],
      submittedAt: now,
      updatedAt: now,
    };
    await setDoc(proposalRef, newProposal);
    return newProposal;
  },

  /**
   * Fetch a single proposal by ID.
   */
  async getProposalById(id: string): Promise<TitleProposal | null> {
    const proposalRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(proposalRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as TitleProposal;
  },

  /**
   * Fetch all proposals.
   */
  async getAllProposals(): Promise<TitleProposal[]> {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnap = await getDocs(q);
    const list = querySnap.docs.map((docSnap) => docSnap.data() as TitleProposal);
    return list.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  },

  /**
   * Fetch proposals created by a specific student.
   */
  async getProposalsByStudent(studentId: string): Promise<TitleProposal[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentId)
    );
    const querySnap = await getDocs(q);
    const list = querySnap.docs.map((docSnap) => docSnap.data() as TitleProposal);
    return list.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  },

  /**
   * Fetch proposals for a specific research group.
   */
  async getProposalsByGroup(groupId: string): Promise<TitleProposal[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('groupId', '==', groupId)
    );
    const querySnap = await getDocs(q);
    const list = querySnap.docs.map((docSnap) => docSnap.data() as TitleProposal);
    return list.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  },

  /**
   * Fetch proposals assigned to a specific adviser.
   */
  async getProposalsByAdviser(adviserId: string): Promise<TitleProposal[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('adviserId', '==', adviserId)
    );
    const querySnap = await getDocs(q);
    const list = querySnap.docs.map((docSnap) => docSnap.data() as TitleProposal);
    return list.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  },

  /**
   * Fetch proposals filtered by status.
   */
  async getProposalsByStatus(status: ProposalStatus): Promise<TitleProposal[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', status)
    );
    const querySnap = await getDocs(q);
    const list = querySnap.docs.map((docSnap) => docSnap.data() as TitleProposal);
    return list.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  },

  /**
   * Update a proposal (only permitted if status is 'pending' or 'revisions_required').
   */
  async updateProposal(id: string, updates: UpdateProposalInput): Promise<void> {
    const proposalRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(proposalRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Add a review comment to a proposal.
   */
  async addComment(proposalId: string, comment: ProposalReviewComment): Promise<void> {
    const proposal = await this.getProposalById(proposalId);
    if (!proposal) throw new Error('Proposal not found');

    const updatedComments = [...(proposal.comments || []), comment];
    await this.updateProposal(proposalId, { comments: updatedComments });
  },

  /**
   * Delete a proposal document.
   */
  async deleteProposal(id: string): Promise<void> {
    const proposalRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(proposalRef);
  },
};

export default titleProposalService;
