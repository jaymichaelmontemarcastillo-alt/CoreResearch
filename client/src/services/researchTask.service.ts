// src/services/researchTask.service.ts
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
  ResearchTask,
  CreateTaskInput,
  TaskStatus,
} from '../types/researchWorkspace.types';

const COLLECTION_NAME = 'research_tasks';

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export const researchTaskService = {
  /**
   * Create a new research task assigned to a student
   */
  async createTask(input: CreateTaskInput): Promise<ResearchTask> {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const now = new Date().toISOString();

    const newTask: ResearchTask = {
      id: docRef.id,
      workspaceId: input.workspaceId,
      proposalId: input.proposalId,
      projectId: input.projectId,
      studentId: input.studentId,
      studentName: input.studentName,
      adviserId: input.adviserId,
      adviserName: input.adviserName,
      sectionId: input.sectionId,
      title: input.title.trim(),
      description: input.description.trim(),
      priority: input.priority || 'medium',
      status: 'todo',
      dueDate: input.dueDate,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, stripUndefined(newTask) as ResearchTask);
    return newTask;
  },

  /**
   * Fetch all tasks for a specific workspace
   */
  async getTasksByWorkspace(workspaceId: string): Promise<ResearchTask[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('workspaceId', '==', workspaceId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as ResearchTask);
    return list.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  },

  /**
   * Fetch all tasks assigned to a specific student
   */
  async getTasksByStudent(studentId: string): Promise<ResearchTask[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as ResearchTask);
    return list.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  },

  /**
   * Fetch all tasks created by a specific adviser
   */
  async getTasksByAdviser(adviserId: string): Promise<ResearchTask[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('adviserId', '==', adviserId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as ResearchTask);
    return list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  /**
   * Real-time subscription to workspace tasks
   */
  subscribeWorkspaceTasks(
    workspaceId: string,
    onUpdate: (tasks: ResearchTask[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('workspaceId', '==', workspaceId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ResearchTask);
        list.sort(
          (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );
        onUpdate(list);
      },
      (err) => {
        console.warn('[researchTaskService] subscribe error:', err);
        if (onError) onError(err);
      }
    );
  },

  /**
   * Student updates task status or submits completion note
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    submissionNote?: string
  ): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, taskId);
    const now = new Date().toISOString();

    const updates: Partial<ResearchTask> = {
      status,
      updatedAt: now,
      ...(submissionNote !== undefined ? { submissionNote } : {}),
      ...(status === 'submitted' ? { submittedAt: now } : {}),
      ...(status === 'completed' ? { completedAt: now } : {}),
    };

    await updateDoc(docRef, stripUndefined(updates));
  },

  /**
   * Adviser reviews task (approve as completed or request revision)
   */
  async reviewTask(
    taskId: string,
    decision: 'completed' | 'revision_required',
    feedback?: string
  ): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, taskId);
    const now = new Date().toISOString();

    await updateDoc(docRef, stripUndefined({
      status: decision,
      updatedAt: now,
      ...(decision === 'completed' ? { completedAt: now } : {}),
    }));
  },

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, taskId);
    await deleteDoc(docRef);
  },
};

export default researchTaskService;
