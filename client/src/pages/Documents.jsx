import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { FileText, Search, Plus, Clock, Users, MoreVertical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      // Fallback dummy data if backend is not fully implemented yet
      setDocuments([
        {
          id: 'research-manuscript-123',
          title: 'Research Manuscript - Final',
          updatedAt: new Date().toISOString(),
          ownerId: userProfile?.uid,
          ownerName: userProfile?.fullName,
          collaboratorCount: 3,
        },
        {
          id: 'chapter-1-draft',
          title: 'Chapter 1: Introduction (Draft)',
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
          ownerId: 'prof123',
          ownerName: 'Professor Cruz',
          collaboratorCount: 1,
        }
      ]);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = () => {
    const newDocId = `doc-${Date.now()}`;
    // Optionally create it in the backend first, but for now we just navigate
    navigate(`/documents/${newDocId}`);
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Documents" 
          description="Manage and collaborate on research manuscripts in real-time."
          icon={FileText}
        />
        <Button onClick={handleCreateDocument} variant="primary" className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          New Document
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center text-gray-500">Loading documents...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-500">
            <FileText className="w-12 h-12 mb-3 text-gray-300" />
            <p>No documents found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map(doc => (
              <Card 
                key={doc.id} 
                className="p-5 hover:border-blue-500/50 cursor-pointer transition-colors group flex flex-col h-full"
                onClick={() => navigate(`/documents/${doc.id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {doc.title}
                </h3>
                
                <div className="mt-auto pt-4 space-y-2">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    Edited {new Date(doc.updatedAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="truncate pr-2">Owner: {doc.ownerName}</span>
                    <Badge variant="gray" className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 text-[10px]">
                      <Users className="w-3 h-3" /> {doc.collaboratorCount}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
