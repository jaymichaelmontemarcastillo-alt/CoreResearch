// src/pages/Repository.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Toast } from "../components/ui/Toast";
import {
  HiBookOpen,
  HiMagnifyingGlass,
  HiArrowDownTray,
  HiEye,
  HiDocumentDuplicate,
  HiCheck,
  HiUser,
  HiPlusCircle,
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
  const [department, setDepartment] = useState("all");

  // Abstract & Citation Modal
  const [selectedPub, setSelectedPub] = useState(null);
  const [copied, setCopied] = useState(false);

  // Admin Publish Modal
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

  const fetchPublications = async (customSearch = search) => {
    setLoading(true);
    try {
      const res = await api.get("/repository", {
        params: { search: customSearch, department },
      });
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
    fetchPublications(search);
  }, [department]);

  useEffect(() => {
    const urlQuery = searchParams.get("search");
    if (urlQuery) {
      setSearch(urlQuery);
      fetchPublications(urlQuery);
    }
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPublications();
  };

  const handleCopyCitation = (citationText) => {
    navigator.clipboard.writeText(citationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
        citation: `${pubAuthors} (${pubYear}). ${pubTitle}. CoreResearch University Repository.`,
      });

      setToast("Research paper published to Institutional Repository successfully!");
      setPublishModalOpen(false);
      setPubTitle("");
      setPubAbstract("");
      await fetchPublications();
    } catch (err) {
      alert(`Publishing error: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={HiBookOpen}
        title="Institutional Research Repository"
        description="Search, cite, and download approved university thesis and dissertation publications."
        actions={
          role === "admin" && (
            <Button variant="primary" size="md" onClick={() => setPublishModalOpen(true)}>
              <HiPlusCircle className="w-4 h-4 mr-2" /> Publish Research Paper
            </Button>
          )
        }
      />

      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast("")} />
      )}

      {/* Search Bar */}
      <Card className="p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Input
            placeholder="Search repository..."
            icon={HiMagnifyingGlass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
          <Button type="submit" variant="secondary" size="md" className="sm:w-auto w-full justify-center">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          {["all", "Computer Science", "Information Technology"].map((dept) => (
            <button
              key={dept}
              onClick={() => setDepartment(dept)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition whitespace-nowrap ${
                department === dept
                  ? "bg-primary text-white shadow-sm"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {dept === "all" ? "All Colleges" : dept}
            </button>
          ))}
        </div>
      </Card>

      {/* Publication Cards Grid */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 dark:text-gray-500">
          Searching research repository...
        </div>
      ) : publications.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={HiBookOpen}
            title="No Publications Found"
            description="Try adjusting your search keywords or college department filter."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {publications.map((pub) => (
            <Card key={pub.id} hover className="flex flex-col justify-between space-y-3 sm:space-y-4 p-4 sm:p-5">
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="blue" className="text-[9px] sm:text-[10px] px-1.5 py-0 sm:px-2 sm:py-0.5">{pub.department}</Badge>
                  <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-mono">
                    {pub.publicationYear}
                  </span>
                </div>

                <h3 className="text-[13px] sm:text-base font-bold sm:font-medium text-gray-900 dark:text-white leading-snug line-clamp-2">
                  {pub.title}
                </h3>

                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                  <HiUser className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
                  <span className="truncate">
                    Authors:{" "}
                    <strong className="text-gray-700 dark:text-gray-300">
                      {Array.isArray(pub.authors) ? pub.authors.join(", ") : pub.authors}
                    </strong>
                  </span>
                </div>

                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                  {pub.abstract}
                </p>

                {pub.keywords && pub.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 sm:gap-1.5 pt-0.5 sm:pt-1">
                    {pub.keywords.slice(0, 3).map((kw, i) => (
                      <span
                        key={i}
                        className="px-1.5 sm:px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[10px] sm:text-[11px] text-gray-600 dark:text-gray-300 whitespace-nowrap"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2.5 sm:pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
                <Button size="sm" variant="outline" onClick={() => setSelectedPub(pub)} className="justify-center text-xs w-full sm:w-auto">
                  <HiEye className="w-3.5 h-3.5 mr-1.5" /> Read Abstract & Cite
                </Button>

                <a href={pub.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex">
                  <Button size="sm" variant="secondary" className="justify-center text-xs w-full sm:w-auto">
                    <HiArrowDownTray className="w-3.5 h-3.5 mr-1.5" /> PDF Paper
                  </Button>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Publication Detail Modal (Title, Authors, Abstract Highlights, and Full Content) */}
      <PublicationDetailModal
        isOpen={Boolean(selectedPub)}
        onClose={() => setSelectedPub(null)}
        publication={selectedPub}
      />

      {/* Admin Publish Modal */}
      <Modal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title="Publish Paper to Repository"
        icon={HiBookOpen}
      >
        <form onSubmit={handlePublishSubmit} className="space-y-4">
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

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setPublishModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={publishing}>
              Publish Paper
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
