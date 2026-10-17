# Repository Batch Import Folder

### Folder Structure:
- **`BSCS/`** (`repository-imports/BSCS`):
  Place Computer Science research papers here. They will automatically be tagged with department **`Computer Science`** and publication year **`2025`**.
- **`BSIT/`** (`repository-imports/BSIT`):
  Place Information Technology research papers here. They will automatically be tagged with department **`Information Technology`** and publication year **`2025`**.

---

### Automated Ingestion Process:
Once your files are placed in this directory, the automated batch importer will:
1. **Parse Full Document Content:**
   - Extracts title, authors, adviser name, abstract, and research keywords directly from the manuscript using Gemini AI extraction (with regex fallback).
2. **Enforce Publication Year:**
   - Sets `publicationYear: 2025` across all imported documents.
3. **Upload to Storage:**
   - Stores each document in the repository file store (`/api/storage/assets/repository/...`).
4. **Publish to Repository:**
   - Populates MongoDB collection `RepositoryPublication` with status `approved`.

---

### How to trigger the import:
Tell the assistant: **"I have placed the files, proceed with import"** or run in terminal:
```bash
npm --prefix server run import:repository
```
