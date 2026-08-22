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
  async getProposalsByGroup(groupId: string): Promise<TitleProposal[]> {
    const q = query(collection(db, COLLECTION), where('groupId', '==', groupId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as TitleProposal);
    return list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
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
    // Firestore 'in' supports up to 30 values
    const q = query(
      collection(db, COLLECTION),
      where('groupId', 'in', groupIds.slice(0, 30)),
      where('status', 'in', ['submitted', 'needs_revision', 'approved'])
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as TitleProposal);
    return list.sort(
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
