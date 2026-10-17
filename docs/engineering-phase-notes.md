# Engineering Phase Notes

Last updated: 2026-10-16

This is the working handoff for the CoreResearch remediation phases. Update the
inventory and validation notes as each phase progresses; use the file references
below to resume a trace without rescanning unrelated parts of the codebase.

## Current phase

**Priority 2 — Performance and reliability.** Priority 0 security changes and
Firestore Rules Emulator regression tests are complete. Priority 1 remains
partially open for the user/project consistency follow-ups below; its schedule
projection and user-profile synchronization changes are bounded fixes, not a
complete data migration.

## Store ownership inventory

| Entity | Current observed ownership | Important read/write paths | Open consistency work |
|---|---|---|---|
| Firebase account | Firebase Authentication is the identity provider. | `server/src/middleware/authMiddleware.js`, `server/src/controllers/authController.js` | `deleteUser` removes Firebase Auth first and now reports data-cleanup failures as partial persistence; retry/recovery behavior remains to be defined. |
| User profile | MongoDB is used as the profile source when connected; Firestore `users/{uid}` is a client-facing projection and fallback when MongoDB is unavailable. A development in-memory map is also used. | `server/src/models/User.js`, `server/src/controllers/authController.js`, `server/src/controllers/userController.js`, `server/src/services/userProfilePersistence.service.js`; client `src/context/AuthContext.jsx`, `src/services/user.service.ts`, `src/pages/Onboarding.jsx` | Direct-client create/read paths remain. `AuthContext` reads the Firestore profile on login; no client caller for `/auth/login-sync` was found. `User` model defaults status/approval to active/approved, so new upserts must explicitly set pending-registration values. Audit remaining Firestore-only user mutations and harden legacy fallback policy. |
| Proposals | Firestore `proposals` is the operational store; development mode uses an in-memory map. No proposal Mongo model/write path was found in the inspected controller. | `server/src/controllers/proposalController.js`, `server/src/middleware/resourceAuthorization.js`, `firestore.rules` | Review state transitions and proposal-to-project consistency after profile work. |
| Research projects | Firestore `research_projects` is the project record. MongoDB `Document` stores manuscript metadata/content under the same project ID; project creation writes Firestore and initializes Mongo, rolling Firestore back if Mongo initialization fails. Project listing reads Mongo documents when any exist, otherwise falls back to Firestore. | `server/src/controllers/projectController.js`, `server/src/models/Document.js`, `server/src/controllers/manuscriptController.js` | A non-empty Mongo document result can omit Firestore projects without a matching Mongo document. Define a stable project/document relationship and reconcile reads. |
| Manuscript workspaces | Firestore `manuscript_workspaces` is the operational store; development mode uses an in-memory map. Workspace/task/feedback logic is server-side, with manuscript features also reaching the collection. | `server/src/controllers/workspaceController.js`, `server/src/controllers/manuscriptController.js`, `server/src/controllers/repositoryController.js`, `firestore.rules` | No Mongo workspace model/path was found in the inspected code. Continue tracing direct client writes and ownership before migrating. |
| Defense schedules | MongoDB `Schedule` is authoritative for API reads/writes. Firestore `defense_schedules` is the client/faculty/evaluation projection. The older `schedules` collection is still referenced by a Phase 5 migration script. | `server/src/models/Schedule.js`, `server/src/controllers/scheduleController.js`, `server/src/services/scheduleProjection.js`, `server/src/services/scheduleProjection.service.js`, `client/src/services/schedule.service.ts`, `client/src/services/faculty.service.ts`, `firestore.rules` | Run `npm run sync:schedules --prefix server` with live database credentials to backfill existing data; check legacy `schedules` records separately before retiring them. |
| Research groups | Firestore `research_groups` is used by client services and backend authorization/workflows. | `client/src/services/group.service.ts`, `client/src/services/adviserRequest.service.ts`, `server/src/middleware/resourceAuthorization.js`, `firestore.rules` | Group creation automation is deferred until linked entity ownership is stable. |

## Areas inspected

- **Priority 2 user directory path:** `server/src/controllers/userController.js`,
  `server/src/services/userListQuery.js`, `server/src/models/User.js`,
  `server/src/routes/userRoutes.js`, `client/src/services/user.service.ts`,
  `client/src/pages/UserDirectory.jsx`, and `client/src/pages/UserRequests.jsx`.
- **Authentication and profiles:** `server/src/controllers/authController.js`,
  `server/src/controllers/userController.js`, `server/src/models/User.js`,
  `server/src/routes/userRoutes.js`, `server/src/routes/authRoutes.js`,
  `client/src/context/AuthContext.jsx`, `client/src/services/user.service.ts`,
  and `client/src/pages/Onboarding.jsx`.
- **Projects and manuscript records:** `server/src/controllers/projectController.js`,
  `server/src/controllers/manuscriptController.js`, and
  `server/src/models/Document.js`.
- **Proposals and workspaces:** `server/src/controllers/proposalController.js`,
  `server/src/controllers/workspaceController.js`, and
  `server/src/routes/workspaceRoutes.js`.
- **Schedules and their Firestore consumers:** `server/src/controllers/scheduleController.js`,
  `server/src/models/Schedule.js`, `client/src/services/schedule.service.ts`,
  `client/src/services/faculty.service.ts`, and the schedule-related Firestore
  rules.
- **Authorization:** `server/src/middleware/resourceAuthorization.js` and
  `firestore.rules`.

## Changes completed during Priority 1

### Schedule projection

- API schedule CRUD and bulk replacement use MongoDB as the authoritative
  record; projection writes now target `defense_schedules`, the collection read
  by faculty pages and consulted by Firestore evaluation authorization.
- Client schedule mutations no longer fall back to independent Firestore
  writes after API failure.
- MongoDB success followed by Firestore projection failure returns an explicit
  partial-persistence error.
- Added `server/src/scripts/syncDefenseSchedules.js` and the
  `sync:schedules` server script to backfill existing Mongo schedules.
- Added client API-error regression tests and pure schedule-projection mapping
  tests.

### User profile synchronization (current work)

- When MongoDB is available, profile updates through admin role/profile
  endpoints and the authenticated self-profile endpoint update MongoDB first
  and mirror the persisted record into Firestore.
- A missing Firestore projection or projection-write failure after a MongoDB
  update is reported as partial persistence, rather than successful completion.
- Registration no longer treats failed MongoDB/Firestore writes as a successful
  registration; MongoDB profile reads are mirrored to Firestore during login
  sync.
- Client registration, onboarding, self-profile editing, and `userService`
  profile updates now use backend endpoints rather than writing Firestore
  first. Remaining direct Firestore reads support login/approval listeners and
  other client lookup behavior.
- Still to inspect: unused/legacy `userService.createUser`, group membership
  metadata writes to user profiles in `client/src/services/group.service.ts`,
  and remaining profile readers/approval listeners that depend on Firestore.
- `userService.deleteUser` no longer falls back to deleting only Firestore after
  an API failure. `approveUser` and `rejectUser` now persist through the API.
- Server deletion now reports Firebase Auth/MongoDB/Firestore cleanup failures
  instead of returning success-shaped responses. Firebase Auth is deleted
  first; retry/recovery for partial cleanup still needs an explicit policy.

## Priority 2 progress

### User directory query path

- MongoDB receives candidate filters for role, approval status, program,
  specialization, and search before user documents are materialized in
  `getAllUsers`. Candidate filters include legacy specialization-name aliases
  and the legacy WMAD student default so profile normalization does not exclude
  matching records before the existing filters run.
- For requests without search/program/specialization filters, role/status
  pagination uses `countDocuments`, stable `_id` ordering, and MongoDB
  `skip`/`limit`, rather than loading and slicing the full matching result set
  in Node.
- Added a compound `{ role, status }` index and unit coverage for role/status
  constraints, escaped search strings, and legacy program/specialization
  aliases.
- Search regex input is escaped so user-provided punctuation is treated
  literally rather than as regex syntax.
- This is the first bounded performance improvement. More profiling is needed
  to identify which remaining broad Firestore reads are hot before changing
  additional query paths.

## Priority 1 remaining work

1. Validate the profile update/registration paths in an environment with
   server dependencies, MongoDB, and Firebase configured; verify partial
   persistence responses and the admin approval/login flow.
2. Trace all remaining user-profile Firestore mutations, especially
   `userService.createUser` and group metadata sync in
   `client/src/services/group.service.ts`; move them to an authorized backend
   workflow or explicitly classify them as Firestore-owned fields.
3. Review profile deletion for idempotency and recovery after Firebase Auth is
   deleted but a database cleanup fails.
4. Resolve project versus manuscript-document query consistency, then inspect
   proposal/workspace linking and status transitions.
5. Record decisions here before changing persistence behavior for another
   entity.

## Priority 2 remaining work

1. Benchmark paginated user-list requests against representative data and
   inspect MongoDB explain plans to confirm the `{ role, status }` index is
   selected.
2. Measure remaining broad Firestore reads, starting with manuscript,
   proposal, evaluation, and workspace list operations; add pagination only
   where callers and ordering requirements are understood.
3. Investigate client bundle splitting: the latest production build emits a
   1,172.67 kB main JavaScript chunk (310.50 kB gzip) and reports mixed
   static/dynamic imports for system activity, research workspace, and group
   services.
4. Review repository publication search/aggregation and notification fan-out
   for query count and payload size.
5. Check Firestore composite-index requirements and add only indexes that
   match measured query shapes.
6. Capture before/after latency and document results here.

## Later phases

- **Priority 2 — Performance and reliability:** reduce broad Firestore reads,
  add pagination and required indexes, and improve aggregation and retry/error
  behavior.
- **Priority 3 — Research-group automation:** automate group creation and
  linked workflows after entity ownership is settled.
- **Priority 4 — Production readiness:** verify secrets, Storage rules,
  backups, monitoring, and staging rollout/rollback.

## Validation and environment notes

- Firestore Rules tests were run successfully against the Firebase Emulator
  for the five added security regression cases; the client production build
  passed at that stage.
- Schedule projection tests pass with `node --test
  server/src/services/scheduleProjection.test.js`; schedule service client
  and profile-persistence client tests pass with `npm --prefix client exec
  -- vitest run src/services/schedule.service.test.ts
  src/services/user.service.test.ts`.
- Client production builds have passed. The full client typecheck has existing
  Firebase declaration failures (`firebase/firestore` and `firebase/storage`);
  remaining diagnostics in `user.service.ts` are also caused by those missing
  declarations and implicit `any` fallout. No diagnostics were reported for
  the edited `AuthContext.jsx` or `Onboarding.jsx`.
- Server Node syntax checks passed for the edited controllers/services. The
  earlier schedule phase could not run server integration checks because
  server runtime packages were not installed. Repeat runtime/integration
  checks when dependencies and services are available.
- Merge conflicts from the user's `master` pull are resolved in
  `server/package.json`, `server/src/controllers/scheduleController.js`, and
  `client/src/services/schedule.service.ts`. Both server package scripts were
  retained; schedule writes continue through the API with MongoDB authority
  and a `defense_schedules` projection. No merge commit was created.
- User-list query builder tests pass with
  `node --test server/src/services/userListQuery.test.js
  server/src/services/scheduleProjection.test.js`; the client schedule and
  user service tests pass. Changed server files pass `node --check`.
- The post-merge client production build passes; Vite reports the main bundle
  size and mixed static/dynamic imports noted above. No live benchmark or
  MongoDB explain plan has been run yet.
- Windows environment: workspace path is `C:\CoreResearch-backend`.
