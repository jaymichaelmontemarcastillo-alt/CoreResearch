# ONLYOFFICE CoreResearch POC

## Environment

- **OS**: Windows (PowerShell)
- **Node version**: v22.17.1
- **Docker version**: N/A (Docker is not installed on the host)
- **ONLYOFFICE version**: latest (documentserver)
- **browser**: N/A (Could not open due to Docker failure)
- **manuscript used**: `CoreResearch-DOCX-Fidelity-Test.docx`

## Architecture

Browser
 ↓
POC React (port 5174)
 ↓
ONLYOFFICE Document Server (port 8080 - Docker)
 ↓
POC Node backend (port 4000)
 ↓
DOCX storage (local filesystem)

## Test Results

| Test | Result | Evidence | Classification |
|------|--------|----------|----------------|
| DOCX loading | FAILED | Document Server offline | [UNVERIFIED] |
| A4 | FAILED | Document Server offline | [UNVERIFIED] |
| Margins | FAILED | Document Server offline | [UNVERIFIED] |
| Pagination | FAILED | Document Server offline | [UNVERIFIED] |
| Fonts | FAILED | Document Server offline | [UNVERIFIED] |
| Paragraph formatting | FAILED | Document Server offline | [UNVERIFIED] |
| Tables | FAILED | Document Server offline | [UNVERIFIED] |
| Images | FAILED | Document Server offline | [UNVERIFIED] |
| Headers/footers | FAILED | Document Server offline | [UNVERIFIED] |
| Page numbers | FAILED | Document Server offline | [UNVERIFIED] |
| Editing | FAILED | Document Server offline | [UNVERIFIED] |
| Round-trip | FAILED | Document Server offline | [UNVERIFIED] |
| Collaboration | FAILED | Document Server offline | [UNVERIFIED] |
| Comments | FAILED | Document Server offline | [UNVERIFIED] |
| Track Changes | FAILED | Document Server offline | [UNVERIFIED] |
| Persistence | FAILED | Document Server offline | [UNVERIFIED] |
| Performance | FAILED | Document Server offline | [UNVERIFIED] |

## Collaboration Result

"Can two CoreResearch users simultaneously edit the same DOCX document?"
**INCONCLUSIVE.** Because the ONLYOFFICE Document Server requires Docker, and Docker is not installed on this machine, the POC could not be started. No actual POC evidence was gathered regarding simultaneous editing behavior.

## Round-trip Result

"Does DOCX → ONLYOFFICE → DOCX preserve the required CoreResearch formatting?"
**INCONCLUSIVE.** Because the editor could not be loaded, the document could not be exported to verify structural differences.

## Migration Impact

[FUTURE ARCHITECTURE — NOT IMPLEMENTED]

If ONLYOFFICE passes the POC in a capable environment, the architecture would shift significantly:

Current:
React
 ↓
Tiptap
 ↓
Yjs
 ↓
Hocuspocus
 ↓
MongoDB (JSON DOM)

Potential future:
React
 ↓
ONLYOFFICE
 ↓
ONLYOFFICE Document Server (New Docker Infra)
 ↓
Node callback (New Route)
 ↓
Object storage / GridFS (Binary)
 ↓
MongoDB metadata

## FINAL DECISION

**INCONCLUSIVE**

A critical requirement (running the Document Server) could not actually be tested due to environmental blockers (Docker is not installed on the system). No tests were run, and the POC could not be verified.

---

### Failure Handling
*   **Exact Error**: `docker : The term 'docker' is not recognized as the name of a cmdlet`
*   **Component Responsible**: Docker CLI / OS Environment
*   **Likely Cause**: Docker Desktop or Docker Engine is not installed on the Windows host.
*   **Limitation Type**: Environment limitation.
*   **Attempted Fix**: N/A. Docker cannot be silently installed on Windows without admin privileges, reboots, and WSL2 configurations.
*   **Result**: The ONLYOFFICE container cannot be started.

**To resume the POC test later once Docker is installed, run:**
`cd C:\CoreResearch-Official\CoreResearch\poc\onlyoffice && docker compose up -d`
