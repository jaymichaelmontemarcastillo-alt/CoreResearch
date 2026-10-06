import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Modal } from "../components/ui/Modal";
import { Toast } from "../components/ui/Toast";
import {
  HiBookOpen,
  HiMagnifyingGlass,
  HiOutlineStar,
  HiOutlineDocumentText,
  HiOutlineSparkles,
  HiPlusCircle,
  HiPencilSquare,
  HiTrash,
} from "react-icons/hi2";
import { useAuth } from "../context/AuthContext";
import { PublicationDetailModal } from "../components/research/PublicationDetailModal";

export const Repository = () => {
  const { role } = useAuth();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  
  // Filters
  const [department, setDepartment] = useState("all");
  const [yearFilter, setYearFilter] = useState("any");
  const [sortBy, setSortBy] = useState("relevance");

  // Abstract & Citation Modal
  const [selectedPub, setSelectedPub] = useState(null);

  // Admin/Student Publish Modal
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [pubTitle, setPubTitle] = useState("");
  const [pubAuthors, setPubAuthors] = useState("");
  const [pubAdviser, setPubAdviser] = useState("Dr. Eleanor Vance");
  const [pubDept, setPubDept] = useState("Computer Science");
  const [pubYear, setPubYear] = useState("2026");
  const [pubAbstract, setPubAbstract] = useState("");
  const [pubKeywords, setPubKeywords] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pdfBase64, setPdfBase64] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Admin Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPub, setEditingPub] = useState(null);
  const [editDepartment, setEditDepartment] = useState("");
  const [updating, setUpdating] = useState(false);

  // Admin Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pubToDelete, setPubToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setPreviewLoading(true);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPdfBase64(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please select a valid PDF file.");
      setSelectedFile(null);
      setPreviewUrl(null);
      setPdfBase64("");
      setPreviewLoading(false);
    }
  };

  const fetchPublications = async () => {
    setLoading(true);
    try {
      // Fetch all publications once, we'll apply filters locally for instant Scholar-like UX
      const res = await api.get("/repository");
      if (res.data && res.data.data) {
        setPublications(res.data.data);
      }
    } catch (err) {
      console.error("[Repository] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublications();
    // Initialize search from URL if present
    const urlQuery = searchParams.get("search");
    if (urlQuery) {
      setSearch(urlQuery);
    }
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams(search ? { search } : {});
  };

  const handlePublishSubmit = async (e) => {
    e.preventDefault();
    if (!pubTitle || !pubAbstract) return alert("Title and Abstract are required.");

    setPublishing(true);
    try {
      await api.post("/repository/publish", {
        title: pubTitle,
        authors: pubAuthors.split(",").map((a) => a.trim()),
        adviserName: pubAdviser,
        department: pubDept,
        publicationYear: pubYear,
        abstract: pubAbstract,
        keywords: pubKeywords,
        pdfUrl: pdfBase64 || undefined,
        citation: `${pubAuthors} (${pubYear}). ${pubTitle}. CoreResearch University Repository.`,
      });

      setToast("Research paper published to Institutional Repository successfully!");
      setPublishModalOpen(false);
      setPubTitle("");
      setPubAbstract("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setPdfBase64("");
      await fetchPublications();
    } catch (err) {
      alert(`Publishing error: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = (pub) => {
    setPubToDelete(pub);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!pubToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/repository/${pubToDelete.id}`);
      setToast("Publication deleted successfully.");
      setDeleteModalOpen(false);
      setPubToDelete(null);
      fetchPublications();
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (pub) => {
    setEditingPub(pub);
    setEditDepartment(pub.department);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingPub) return;
    setUpdating(true);
    try {
      await api.put(`/repository/${editingPub.id}`, { department: editDepartment });
      setToast("Publication department updated successfully.");
      setEditModalOpen(false);
      setEditingPub(null);
      fetchPublications();
    } catch (err) {
      alert(`Update error: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // Apply local filtering & sorting instantly
  const filteredPublications = publications
    .filter((pub) => {
      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const matchTitle = pub.title?.toLowerCase().includes(q);
        const matchAbstract = pub.abstract?.toLowerCase().includes(q);
        const matchAuthors = Array.isArray(pub.authors) 
          ? pub.authors.some(a => a.toLowerCase().includes(q)) 
          : pub.authors?.toLowerCase().includes(q);
        const matchKeywords = Array.isArray(pub.keywords) && pub.keywords.some(k => k.toLowerCase().includes(q));
        
        if (!matchTitle && !matchAbstract && !matchAuthors && !matchKeywords) {
          return false;
        }
      }

      // Department filter
      if (department !== "all" && pub.department !== department) return false;
      
      // Date filter
      if (yearFilter !== "any") {
        const pYear = Number(pub.publicationYear);
        if (yearFilter === "2026" && pYear < 2026) return false;
        if (yearFilter === "2025" && pYear < 2025) return false;
        if (yearFilter === "2022" && pYear < 2022) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : new Date(`${a.publicationYear}-01-01`).getTime();
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : new Date(`${b.publicationYear}-01-01`).getTime();
        return dateB - dateA;
      }
      return (b.viewsCount || 0) - (a.viewsCount || 0); // Relevance fallback
    });

  return (
    <div className="bg-white min-h-screen dark:bg-[#202124] text-gray-900 dark:text-gray-100 font-sans">
      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast("")} />
      )}

      {/* Top Header / Search Area */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 bg-white dark:bg-[#202124] z-30 shadow-sm relative">
        <div className="flex-1 w-full flex justify-center">
          <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search articles, theses, authors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pl-5 pr-12 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#303134] focus:outline-none focus:shadow-md dark:text-white transition-shadow text-base"
              />
              <button 
                type="submit" 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary dark:text-[#8ab4f8] p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <HiMagnifyingGlass className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>

        {/* Publish Action */}
        {(role === "admin" || role === "student") && (
          <Button variant="primary" onClick={() => setPublishModalOpen(true)} className="w-full md:w-auto shrink-0 shadow-sm md:absolute md:right-4 md:top-1/2 md:-translate-y-1/2">
            <HiPlusCircle className="w-5 h-5 mr-2" /> Publish Paper
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row max-w-7xl mx-auto px-4 py-8 gap-8 md:gap-12 relative">
        {/* Left Sidebar (Filters) */}
        <div className="w-full md:w-44 shrink-0 space-y-6 text-[13px] text-[#4d5156] dark:text-[#9aa0a6]">
          {/* Time Filter */}
          <div className="space-y-2 border-b border-gray-200 dark:border-gray-700 pb-5">
            <button 
              onClick={() => setYearFilter("any")} 
              className={`block hover:underline text-left w-full ${yearFilter === "any" ? "font-bold text-[#d93025] dark:text-[#f28b82]" : ""}`}
            >
              Any time
            </button>
            <button 
              onClick={() => setYearFilter("2026")} 
              className={`block hover:underline text-left w-full ${yearFilter === "2026" ? "font-bold text-[#d93025] dark:text-[#f28b82]" : ""}`}
            >
              Since 2026
            </button>
            <button 
              onClick={() => setYearFilter("2025")} 
              className={`block hover:underline text-left w-full ${yearFilter === "2025" ? "font-bold text-[#d93025] dark:text-[#f28b82]" : ""}`}
            >
              Since 2025
            </button>
            <button 
              onClick={() => setYearFilter("2022")} 
              className={`block hover:underline text-left w-full ${yearFilter === "2022" ? "font-bold text-[#d93025] dark:text-[#f28b82]" : ""}`}
            >
              Since 2022
            </button>
            <button className="block hover:underline text-left w-full mt-1">Custom range...</button>
          </div>
          
          {/* Sort Filter */}
          <div className="space-y-2 border-b border-gray-200 dark:border-gray-700 pb-5">
            <button 
              onClick={() => setSortBy("relevance")} 
              className={`block hover:underline text-left w-full ${sortBy === "relevance" ? "font-bold text-[#d93025] dark:text-[#f28b82]" : ""}`}
            >
              Sort by relevance
            </button>
            <button 
              onClick={() => setSortBy("date")} 
              className={`block hover:underline text-left w-full ${sortBy === "date" ? "font-bold text-[#d93025] dark:text-[#f28b82]" : ""}`}
            >
              Sort by date
            </button>
          </div>

          {/* Department Filter */}
          <div className="space-y-2 border-b border-gray-200 dark:border-gray-700 pb-5">
            <button 
              onClick={() => setDepartment("all")} 
              className={`block hover:underline text-left w-full ${department === "all" ? "font-bold text-[#d93025] dark:text-[#f28b82]" : ""}`}
            >
              Any Department
            </button>
            <button 
              onClick={() => setDepartment("Computer Science")} 
              className={`block hover:underline text-left w-full ${department === "Computer Science" ? "font-bold text-[#d93025] dark:text-[#f28b82]" : ""}`}
            >
              Computer Science
            </button>
            <button 
              onClick={() => setDepartment("Information Technology")} 
              className={`block hover:underline text-left w-full ${department === "Information Technology" ? "font-bold text-[#d93025] dark:text-[#f28b82]" : ""}`}
            >
              Information Tech.
            </button>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
              <input type="checkbox" className="rounded text-[#1a73e8]" /> include patents
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
              <input type="checkbox" defaultChecked className="rounded text-[#1a73e8]" /> include citations
            </label>
          </div>
        </div>

        {/* Main Results List */}
        <div className="flex-1 max-w-3xl pb-16">
          {loading ? (
            <div className="py-12 text-center text-gray-500 text-lg">
              Loading repository...
            </div>
          ) : filteredPublications.length === 0 ? (
            <div className="py-12 text-[#4d5156] dark:text-[#9aa0a6] text-lg">
              <p>Your search - <strong>{search}</strong> - did not match any articles.</p>
              <ul className="list-disc ml-6 mt-4 space-y-2 text-base">
                <li>Make sure all words are spelled correctly.</li>
                <li>Try different keywords.</li>
                <li>Try more general keywords.</li>
                <li>Try reducing filters (e.g. "Any time").</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-9">
              {filteredPublications.map((pub) => (
                <div key={pub.id} className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <h3 
                      className="text-[17px] font-medium text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-tight mb-1"
                      onClick={() => setSelectedPub(pub)}
                    >
                      {pub.title}
                    </h3>
                    <div className="text-[13px] text-[#006621] dark:text-[#81c995] mb-1.5 flex items-center gap-1.5 truncate">
                      <span className="truncate max-w-[200px] sm:max-w-xs">{Array.isArray(pub.authors) ? pub.authors.join(", ") : pub.authors}</span>
                      <span>-</span>
                      <span className="truncate">{pub.department}</span>
                      <span>-</span>
                      <span>{pub.publicationYear}</span>
                    </div>
                    <div className="text-[13px] text-[#4d5156] dark:text-[#bdc1c6] line-clamp-2 leading-relaxed">
                      {pub.abstract}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-[12px] sm:text-[13px] text-[#70757a] dark:text-[#9aa0a6]">
                      <button className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                        <HiOutlineStar className="w-4 h-4" /> Save
                      </button>
                      <button 
                        className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                        onClick={() => setSelectedPub(pub)}
                      >
                        <HiOutlineDocumentText className="w-4 h-4" /> Cite
                      </button>
                      <span className="cursor-pointer hover:underline transition-colors">Cited by {pub.viewsCount || 0}</span>
                      <span className="cursor-pointer hover:underline transition-colors">Related articles</span>
                      <span className="cursor-pointer hover:underline transition-colors">All {pub.downloadsCount || 1} versions</span>
                      
                      {role === "admin" && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <button 
                            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                            onClick={() => openEditModal(pub)}
                          >
                            <HiPencilSquare className="w-4 h-4" /> Edit
                          </button>
                          <button 
                            className="flex items-center gap-1 hover:text-red-600 transition-colors"
                            onClick={() => handleDelete(pub)}
                          >
                            <HiTrash className="w-4 h-4" /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Right side PDF Link */}
                  {pub.pdfUrl && (
                    <div className="w-full md:w-36 flex flex-col md:items-end shrink-0 mt-2 md:mt-0 pt-1">
                      <button
                        onClick={() => {
                          const viewerUrl = `/pdf-viewer?url=${encodeURIComponent(pub.pdfUrl)}&title=${encodeURIComponent(pub.title)}`;
                          window.open(viewerUrl, '_blank');
                        }}
                        className="group flex flex-col md:items-end text-left"
                      >
                        <span className="text-[13px] text-[#1a0dab] dark:text-[#8ab4f8] group-hover:underline inline-flex items-center gap-1">
                          [PDF] coreresearch.edu
                        </span>
                        <span className="inline-flex items-center gap-1 mt-0.5 text-[#70757a] dark:text-[#9aa0a6] text-[12px]">
                          <HiOutlineSparkles className="w-3.5 h-3.5 text-[#1a0dab] dark:text-[#8ab4f8]" /> Quick read
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Publication Detail Modal */}
      <PublicationDetailModal
        isOpen={Boolean(selectedPub)}
        onClose={() => setSelectedPub(null)}
        publication={selectedPub}
      />

      {/* Admin Publish Modal (Larger max-w-4xl) */}
      <Modal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title="Publish Paper to Repository"
        icon={HiBookOpen}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handlePublishSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <Input
                label="Research Paper Title"
                type="text"
                placeholder="e.g. Autonomous Drone Navigation Using Computer Vision"
                value={pubTitle}
                onChange={(e) => setPubTitle(e.target.value)}
                required
              />

              <Input
                label="Authors (comma separated)"
                type="text"
                placeholder="e.g. David Tan, Samantha Cruz"
                value={pubAuthors}
                onChange={(e) => setPubAuthors(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Adviser Name"
                  type="text"
                  value={pubAdviser}
                  onChange={(e) => setPubAdviser(e.target.value)}
                />
                <Input
                  label="Publication Year"
                  type="number"
                  value={pubYear}
                  onChange={(e) => setPubYear(e.target.value)}
                />
              </div>

              <Textarea
                label="Abstract"
                rows={4}
                placeholder="Paste final manuscript abstract..."
                value={pubAbstract}
                onChange={(e) => setPubAbstract(e.target.value)}
                required
              />

              <Input
                label="Keywords (comma separated)"
                type="text"
                placeholder="e.g. Drones, Edge AI, Vision"
                value={pubKeywords}
                onChange={(e) => setPubKeywords(e.target.value)}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  Manuscript Document (PDF)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary/10 file:text-primary
                    hover:file:bg-primary/20
                    dark:file:bg-primary/20 dark:file:text-blue-400"
                />
              </div>
            </div>

            {/* Preview Section */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                PDF Preview
              </label>
              <div className="relative border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden h-full min-h-[400px] bg-gray-50 dark:bg-[#1a1b26] flex items-center justify-center shadow-inner">
                {previewLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 dark:bg-[#1a1b26]/80 backdrop-blur-sm z-10 transition-opacity">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    <span className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">Loading Preview...</span>
                  </div>
                )}
                
                {previewUrl ? (
                  <iframe 
                    src={previewUrl} 
                    className="w-full h-full relative z-20 bg-white" 
                    title="PDF Preview" 
                    onLoad={() => setPreviewLoading(false)}
                  />
                ) : (
                  <div className="text-gray-400 flex flex-col items-center">
                    <HiBookOpen className="w-12 h-12 mb-2 opacity-50" />
                    <span>No PDF selected</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setPublishModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={publishing}>
              {role === "student" ? "Upload to Repository" : "Publish Paper"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Admin Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Publication Department"
        icon={HiPencilSquare}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Department
            </label>
            <select
              value={editDepartment}
              onChange={(e) => setEditDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1a1b26] focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
            >
              <option value="Computer Science">Computer Science</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Business Administration">Business Administration</option>
              <option value="Engineering">Engineering</option>
            </select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updating}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Admin Delete Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Deletion"
        icon={HiTrash}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong className="text-gray-900 dark:text-white">"{pubToDelete?.title}"</strong> from the repository? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" isLoading={deleting} onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
