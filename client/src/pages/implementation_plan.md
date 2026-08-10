# Phase 1: Student Title Proposal Submission Module Implementation Plan

Implement the Student Title Proposal Submission Module allowing authenticated student research groups to submit, view, edit (when pending or revisions required), and delete (when pending) research title proposals using the established Firestore service layer architecture.

## User Review Required

> [!IMPORTANT]
> - **Strict Scope**: This implementation focuses solely on the Student Title Proposal module. Adviser review workflows, grading, scheduling, and notifications are excluded as requested.
> - **Service-Only Firestore Operations**: All Firestore operations will be performed through `titleProposalService` / `useTitleProposal`, maintaining 0 direct Firestore imports in page components.
> - **Field Alignment**: Proposals will support all required fields (`title`, `rationale`, `objectives`, `scopeAndDelimitation`, `methodology`, `researchCategory`, `groupId`, `submittedBy`, `studentId`, `status`, `submittedAt`, `updatedAt`).

## Open Questions

> [!NOTE]
> None. Requirements and field schemas are clearly defined.

---

## Proposed Changes

### 1. Data Layer (`src/types` & `src/services`)

#### [MODIFY] [proposal.types.ts](file:///c:/CoreResearch-Official/CoreResearch/client/src/types/proposal.types.ts)
- Update `TitleProposal` interface to include required fields: `rationale`, `objectives`, `scopeAndDelimitation`, `methodology`, `researchCategory`, `groupId`, `submittedBy`.
- Update `CreateProposalInput` and `UpdateProposalInput` accordingly.

#### [MODIFY] [titleProposal.service.ts](file:///c:/CoreResearch-Official/CoreResearch/client/src/services/titleProposal.service.ts)
- Ensure CRUD operations (`createProposal`, `getProposalById`, `getAllProposals`, `getProposalsByGroup`, `getProposalsByStudent`, `updateProposal`, `deleteProposal`) conform to updated entity model and use `proposals` Firestore collection.

#### [MODIFY] [useTitleProposal.ts](file:///c:/CoreResearch-Official/CoreResearch/client/src/hooks/useTitleProposal.ts)
- Provide hooks for proposal operations, loading state, error handling, refetching, and helper guards (`canEdit`, `canDelete`).

---

### 2. UI Pages & Components (`src/pages`)

#### [MODIFY] [Proposals.jsx](file:///c:/CoreResearch-Official/CoreResearch/client/src/pages/Proposals.jsx)
- Refactor to use `useTitleProposal()` hook.
- Display proposals submitted by the student/group with title, status, date submitted, and last updated timestamp.
- Provide Action buttons for View Detail, Edit (if `pending` or `revisions_required`), and Delete (if `pending`).

#### [MODIFY] [SubmitProposal.jsx](file:///c:/CoreResearch-Official/CoreResearch/client/src/pages/SubmitProposal.jsx)
- Support both **Create** and **Edit** modes.
- Implement comprehensive client-side form validation for mandatory fields (Title, Rationale, Objectives, Scope & Delimitation, Methodology, Research Category).
- Display error alerts and loading spinners during submission.

#### [MODIFY] [ProposalDetail.jsx](file:///c:/CoreResearch-Official/CoreResearch/client/src/pages/ProposalDetail.jsx)
- Refactor to load proposal via `titleProposalService`.
- Display full proposal structured fields (Rationale, Objectives, Scope & Delimitation, Methodology, Category, Timestamps, Group metadata).
- Display Edit/Delete options when allowed for students.

---

## Verification Plan

### Automated Tests
- Run `npm run typecheck` (`tsc --noEmit`) to verify that all TypeScript types, services, custom hooks, and pages build without type errors.

### Manual Verification
- Verify in browser using `npm run dev`:
  1. Navigate to `/proposals/new` as a student.
  2. Attempt empty form submission to verify field validation error messages.
  3. Fill in all fields and submit to verify Firestore creation.
  4. View submitted proposal in `/proposals` list (checking Title, Status, Date Submitted, Last Updated).
  5. Open `/proposals/:id` to verify full proposal details.
  6. Edit proposal while status is `Pending` and save changes.
  7. Delete proposal while status is `Pending` and verify removal.
