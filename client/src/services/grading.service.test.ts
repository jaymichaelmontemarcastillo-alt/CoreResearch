import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseMock = vi.hoisted(() => ({
  db: {}
}));

const firestoreMock = vi.hoisted(() => ({
  collection: vi.fn((_db, coll) => ({ coll })),
  doc: vi.fn((_db, coll, id) => ({ coll, id })),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn()
}));

vi.mock('../firebase/firebase', () => firebaseMock);
vi.mock('firebase/firestore', () => firestoreMock);

import { gradingService } from './grading.service';

describe('gradingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitProposalEvaluation', () => {
    it('persists evaluation with complete linking metadata and touches workspace', async () => {
      firestoreMock.setDoc.mockResolvedValue(undefined);
      firestoreMock.updateDoc.mockResolvedValue(undefined);

      const input = {
        defenseId: 'def-101',
        workspaceId: 'ws-202',
        projectId: 'proj-303',
        groupId: 'grp-404',
        documentId: 'doc-505',
        panelistId: 'panelist-99',
        panelistName: 'Dr. Test Panelist',
        scores: {
          format: 7,
          researchProblems: 8,
          relatedLiterature: 7,
          methodology: 8,
          presentation: 14,
          defense: 13,
          innovation: 14,
          application: 14,
          impact: 9
        },
        subTotals: {
          manuscript: 30,
          oral: 27,
          project: 37,
          overall: 94
        },
        verdict: 'APPROVED' as const
      };

      const result = await gradingService.submitProposalEvaluation(input);

      expect(firestoreMock.doc).toHaveBeenCalledWith(
        expect.anything(),
        'proposal_evaluations',
        'def-101_panelist-99'
      );
      expect(firestoreMock.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ coll: 'proposal_evaluations', id: 'def-101_panelist-99' }),
        expect.objectContaining({
          id: 'def-101_panelist-99',
          defenseId: 'def-101',
          workspaceId: 'ws-202',
          projectId: 'proj-303',
          groupId: 'grp-404',
          documentId: 'doc-505',
          verdict: 'APPROVED'
        }),
        { merge: true }
      );
      expect(firestoreMock.updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ coll: 'manuscript_workspaces', id: 'ws-202' }),
        expect.objectContaining({ updatedAt: expect.any(String) })
      );
      expect(result.id).toBe('def-101_panelist-99');
    });
  });

  describe('submitFinalDefenseEvaluation', () => {
    it('persists final defense evaluation with directives and metadata', async () => {
      firestoreMock.setDoc.mockResolvedValue(undefined);
      firestoreMock.updateDoc.mockResolvedValue(undefined);

      const input = {
        defenseId: 'def-final-1',
        workspaceId: 'ws-final-1',
        groupId: 'grp-1',
        projectId: 'proj-1',
        documentId: 'doc-1',
        panelistId: 'pan-1',
        panelistName: 'Prof. Garcia',
        scores: {
          format: 5,
          researchProblems: 5,
          relatedLiterature: 5,
          methodology: 5,
          technicalBackground: 5,
          summaryConclusions: 5,
          presentation: 10,
          defense: 10,
          functionality: 15,
          usability: 18,
          reliability: 14
        },
        subTotals: {
          manuscript: 30,
          oral: 20,
          project: 47,
          overall: 97
        },
        verdict: 'PASSED' as const,
        revisionDirectives: 'Revise section 3.2 data pipeline flow'
      };

      const result = await gradingService.submitFinalDefenseEvaluation(input);

      expect(firestoreMock.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ coll: 'final_evaluations', id: 'def-final-1_pan-1' }),
        expect.objectContaining({
          id: 'def-final-1_pan-1',
          workspaceId: 'ws-final-1',
          groupId: 'grp-1',
          projectId: 'proj-1',
          documentId: 'doc-1',
          revisionDirectives: 'Revise section 3.2 data pipeline flow',
          verdict: 'PASSED'
        }),
        { merge: true }
      );
      expect(result.subTotals.overall).toBe(97);
    });
  });

  describe('getEvaluationsForEntity', () => {
    it('retrieves and deduplicates evaluations across matching entity keys', async () => {
      const mockPropDocs = [
        {
          id: 'eval-p1',
          data: () => ({
            id: 'eval-p1',
            groupId: 'grp-target',
            panelistName: 'Panelist A',
            totalScore: 92
          })
        },
        {
          id: 'eval-p2',
          data: () => ({
            id: 'eval-p2',
            workspaceId: 'ws-other',
            groupId: 'grp-unrelated',
            totalScore: 80
          })
        }
      ];

      const mockFinalDocs = [
        {
          id: 'eval-f1',
          data: () => ({
            id: 'eval-f1',
            workspaceId: 'ws-target',
            panelistName: 'Panelist B',
            totalScore: 95
          })
        }
      ];

      firestoreMock.getDocs.mockImplementation(async (target: any) => {
        if (target?.coll === 'proposal_evaluations') {
          return { docs: mockPropDocs };
        }
        if (target?.coll === 'final_evaluations') {
          return { docs: mockFinalDocs };
        }
        return { docs: [] };
      });

      const res = await gradingService.getEvaluationsForEntity(['ws-target', 'grp-target']);

      expect(res.proposalEvaluations).toHaveLength(1);
      expect(res.proposalEvaluations[0].id).toBe('eval-p1');
      expect(res.finalEvaluations).toHaveLength(1);
      expect(res.finalEvaluations[0].id).toBe('eval-f1');
    });
  });
});
