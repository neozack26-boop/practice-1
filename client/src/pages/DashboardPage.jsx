import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import StatsBar from '../components/dashboard/StatsBar';
import LoopCard from '../components/dashboard/LoopCard';
import { Plus, Search, Filter, BookOpen, Loader2, RefreshCw } from 'lucide-react';

const DOMAINS = [
  { id: 'all', label: 'All Domains' },
  { id: 'computer_science', label: 'Computer Science' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'mathematics', label: 'Mathematics' },
  { id: 'natural_sciences', label: 'Natural Sciences' },
  { id: 'medicine_health', label: 'Medicine & Health' },
  { id: 'business_economics', label: 'Business & Econ' },
  { id: 'humanities_law', label: 'Humanities & Law' },
  { id: 'general', label: 'General' }
];

const STATUSES = [
  { id: 'all', label: 'All Statuses' },
  { id: 'mastered', label: 'Mastered' },
  { id: 'needs_review', label: 'Needs Review' },
  { id: 'in_progress', label: 'In Progress' }
];

export default function DashboardPage() {
  const { stats, refreshProfile } = useAuth();
  const [loops, setLoops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchLoops = async () => {
    try {
      setLoading(true);
      const res = await api.getLoops({
        domain: domainFilter,
        status: statusFilter,
        search
      });
      setLoops(res?.loops || []);
    } catch (err) {
      console.error('Failed to load study loops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoops();
  }, [domainFilter, statusFilter]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLoops();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this study loop?')) return;
    try {
      await api.deleteLoop(id);
      setLoops((prev) => prev.filter((l) => l.id !== id));
      refreshProfile();
    } catch (err) {
      alert(`Could not delete loop: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Study Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your Feynman teach-back mastery and review past learning loops
          </p>
        </div>

        <Link
          to="/loop/new"
          className="inline-flex items-center px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Study Loop
        </Link>
      </div>

      {/* Stats Bar */}
      <StatsBar stats={stats} />

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-8 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search loops by title or concept..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
        </div>

        {/* Domain Filter */}
        <div className="w-full md:w-52">
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          >
            {DOMAINS.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loops Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading your study loops...</p>
        </div>
      ) : loops.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loops.map((loop) => (
            <LoopCard key={loop.id} loop={loop} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            No Study Loops Found
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
            {search || domainFilter !== 'all' || statusFilter !== 'all'
              ? 'Try clearing your filters or search keywords to see your loops.'
              : 'Start your very first active learning session by dropping in a PDF, textbook photo, or concept prompt.'}
          </p>
          <Link
            to="/loop/new"
            className="inline-flex items-center px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Your First Study Loop
          </Link>
        </div>
      )}
    </div>
  );
}

