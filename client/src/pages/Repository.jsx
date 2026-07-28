import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  BookOpen, 
  Search, 
  Download, 
  Eye, 
  Copy, 
  Check, 
  Tag, 
  User, 
  Calendar, 
  PlusCircle, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Repository = () => {
  const { role } = useAuth();
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  
  // Abstract & Citation Modal
  const [selectedPub, setSelectedPub] = useState(null);
  const [copied, setCopied] = useState(false);

  // Admin Publish Modal
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [pubTitle, setPubTitle] = useState('');
  const [pubAuthors, setPubAuthors] = useState('');
  const [pubAdviser, setPubAdviser] = useState('Dr. Eleanor Vance');
  const [pubDept, setPubDept] = useState('Computer Science');
  const [pubYear, setPubYear] = useState('2026');
  const [pubAbstract, setPubAbstract] = useState('');
  const [pubKeywords, setPubKeywords] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState('');

  const fetchPublications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/repository', {
        params: { search, department }
      });
      if (res.data && res.data.data) {
        setPublications(res.data.data);
      }
    } catch (err) {
      console.error('[Repository] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublications();
  }, [department]);

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
    if (!pubTitle || !pubAbstract) return alert('Title and Abstract are required.');

    setPublishing(true);
    try {
      await api.post('/repository/publish', {
        title: pubTitle,
        authors: pubAuthors.split(',').map(a => a.trim()),
        adviserName: pubAdviser,
        department: pubDept,
        publicationYear: pubYear,
        abstract: pubAbstract,
        keywords: pubKeywords,
        citation: `${pubAuthors} (${pubYear}). ${pubTitle}. CoreResearch University Repository.`
      });

      setToast('Research paper published to Institutional Repository successfully!');
      setTimeout(() => setToast(''), 3500);
      setPublishModalOpen(false);
      setPubTitle('');
      setPubAbstract('');
      await fetchPublications();
    } catch (err) {
      alert(`Publishing error: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-400" /> Institutional Research Repository
          </h1>
          <p className="text-xs text-slate-400 mt-1">Search, cite, and download approved university thesis and dissertation publications.</p>
        </div>

        {role === 'admin' && (
          <Button variant="primary" size="md" onClick={() => setPublishModalOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-2" /> Publish Research Paper
          </Button>
        )}
      </div>

      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <Input
            placeholder="Search repository by title, abstract, keyword, or author name..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="secondary" size="md">Search</Button>
        </form>

        <div className="flex items-center gap-2">
          {['all', 'Computer Science', 'Information Technology'].map(dept => (
            <button
              key={dept}
              onClick={() => setDepartment(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                department === dept
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {dept === 'all' ? 'All Colleges' : dept}
            </button>
          ))}
        </div>
      </Card>

      {/* Publication Cards Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">Searching research repository...</div>
      ) : publications.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Publications Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search keywords or college department filter.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {publications.map((pub) => (
            <Card key={pub.id} hover className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="blue">{pub.department}</Badge>
                  <span className="text-xs text-slate-500 font-mono">{pub.publicationYear}</span>
                </div>

                <h3 className="text-base font-bold text-white leading-snug line-clamp-2">{pub.title}</h3>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>Authors: <strong className="text-slate-200">{Array.isArray(pub.authors) ? pub.authors.join(', ') : pub.authors}</strong></span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {pub.abstract}
                </p>

                {pub.keywords && pub.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {pub.keywords.slice(0, 4).map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <Button size="sm" variant="outline" onClick={() => setSelectedPub(pub)}>
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> Read Abstract & Cite
                </Button>

                <a href={pub.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="secondary">
                    <Download className="w-3.5 h-3.5 mr-1.5" /> PDF Paper
                  </Button>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Abstract & Citation Modal */}
      {selectedPub && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <Badge variant="blue">{selectedPub.department} • {selectedPub.publicationYear}</Badge>
              <button onClick={() => setSelectedPub(null)} className="text-slate-400 hover:text-white text-sm font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-left">
              <h2 className="text-xl font-bold text-white">{selectedPub.title}</h2>
              <div className="text-xs text-slate-400">
                Authors: <strong className="text-slate-200">{Array.isArray(selectedPub.authors) ? selectedPub.authors.join(', ') : selectedPub.authors}</strong> | Adviser: <strong className="text-slate-200">{selectedPub.adviserName}</strong>
              </div>

              <div className="space-y-1 pt-2">
                <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Abstract</h4>
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-300 leading-relaxed">
                  {selectedPub.abstract}
                </div>
              </div>

              {/* Citation Box */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase font-bold text-blue-400 tracking-wider">APA Academic Citation</h4>
                  <button
                    onClick={() => handleCopyCitation(selectedPub.citation)}
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied to Clipboard!' : 'Copy Citation'}
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 font-mono text-xs text-slate-300">
                  {selectedPub.citation}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-3">
              <Button variant="outline" onClick={() => setSelectedPub(null)}>Close</Button>
              <a href={selectedPub.pdfUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="primary">
                  <Download className="w-4 h-4 mr-2" /> Download Full PDF
                </Button>
              </a>
            </div>
          </Card>
        </div>
      )}

      {/* Admin Publish Modal */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" /> Publish Paper to Institutional Repository
              </h3>
              <button onClick={() => setPublishModalOpen(false)} className="text-slate-400 hover:text-white text-sm font-bold">
                ✕
              </button>
            </div>

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

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Abstract</label>
                <textarea
                  rows={4}
                  className="w-full glass-input rounded-xl text-sm p-3"
                  placeholder="Paste final manuscript abstract..."
                  value={pubAbstract}
                  onChange={(e) => setPubAbstract(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Keywords (comma separated)"
                type="text"
                placeholder="e.g. Drones, Edge AI, Vision"
                value={pubKeywords}
                onChange={(e) => setPubKeywords(e.target.value)}
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setPublishModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={publishing}>Publish Paper</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
