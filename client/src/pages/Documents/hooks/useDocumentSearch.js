// src/pages/Documents/hooks/useDocumentSearch.js
import { useState, useMemo } from 'react';

export const useDocumentSearch = (documents = [], currentUserId = '') => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('last_opened');
  const [filterBy, setFilterBy] = useState('all');
  const [activeTab, setActiveTab] = useState('recent'); // 'recent' | 'favorites'

  const filteredAndSortedDocs = useMemo(() => {
    let result = [...documents];

    // 0. Active Tab Filtering (Recent vs. Favorites)
    if (activeTab === 'favorites') {
      result = result.filter((doc) => Boolean(doc.isFavorite));
    }

    // 1. Ownership Filtering
    if (filterBy === 'owned_by_me' && currentUserId) {
      result = result.filter(
        (doc) => doc.ownerId === currentUserId || doc.ownerName?.includes('You')
      );
    } else if (filterBy === 'not_owned_by_me' && currentUserId) {
      result = result.filter(
        (doc) => doc.ownerId && doc.ownerId !== currentUserId
      );
    } else if (filterBy === 'group') {
      result = result.filter((doc) => Boolean(doc.groupId || doc.groupName));
    }

    // 2. Search query filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((doc) => {
        const titleMatch = (doc.title || doc.fileName || '').toLowerCase().includes(q);
        const ownerMatch = (doc.ownerName || '').toLowerCase().includes(q);
        const groupMatch = (doc.groupName || '').toLowerCase().includes(q);
        const proposalMatch = (doc.proposalTitle || '').toLowerCase().includes(q);
        const textMatch = (doc.plainText || '').toLowerCase().includes(q);
        return titleMatch || ownerMatch || groupMatch || proposalMatch || textMatch;
      });
    }

    // 3. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'last_opened': {
          const tA = new Date(a.lastOpenedAt || a.updatedAt || a.createdAt).getTime();
          const tB = new Date(b.lastOpenedAt || b.updatedAt || b.createdAt).getTime();
          return tB - tA;
        }
        case 'last_modified': {
          const tA = new Date(a.updatedAt || a.createdAt).getTime();
          const tB = new Date(b.updatedAt || b.createdAt).getTime();
          return tB - tA;
        }
        case 'created_at': {
          const tA = new Date(a.createdAt || a.updatedAt).getTime();
          const tB = new Date(b.createdAt || b.updatedAt).getTime();
          return tB - tA;
        }
        case 'title_asc': {
          const nameA = (a.title || a.fileName || '').toLowerCase();
          const nameB = (b.title || b.fileName || '').toLowerCase();
          return nameA.localeCompare(nameB);
        }
        case 'title_desc': {
          const nameA = (a.title || a.fileName || '').toLowerCase();
          const nameB = (b.title || b.fileName || '').toLowerCase();
          return nameB.localeCompare(nameA);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [documents, searchQuery, sortBy, filterBy, activeTab, currentUserId]);

  const favoritesCount = useMemo(() => {
    return documents.filter((d) => Boolean(d.isFavorite)).length;
  }, [documents]);

  return {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filterBy,
    setFilterBy,
    activeTab,
    setActiveTab,
    favoritesCount,
    filteredDocuments: filteredAndSortedDocs,
    totalCount: documents.length,
    filteredCount: filteredAndSortedDocs.length,
  };
};
