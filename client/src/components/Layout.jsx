import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Badge } from './ui/Badge';
import { 
  GraduationCap, 
  LayoutDashboard, 
  FileText, 
  FolderGit2, 
  MessageSquare, 
  Calendar, 
  Award, 
  BookOpen, 
  Users, 
  LogOut, 
  ShieldCheck,
  UserCheck,
  Menu,
  X,
  User
} from 'lucide-react';

export const Layout = () => {
  const { userProfile, role, logout, selectDevRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['student', 'adviser', 'panelist', 'admin'] },
    { label: 'Title Proposals', path: '/proposals', icon: FileText, roles: ['student', 'adviser', 'admin'] },
    { label: 'Manuscripts', path: '/manuscripts', icon: FolderGit2, roles: ['student', 'adviser', 'panelist', 'admin'] },
    { label: 'Reviews & Feedback', path: '/reviews', icon: MessageSquare, roles: ['student', 'adviser', 'panelist', 'admin'] },
    { label: 'Defense Schedules', path: '/schedules', icon: Calendar, roles: ['student', 'adviser', 'panelist', 'admin'] },
    { label: 'Grading & Rubrics', path: '/grading', icon: Award, roles: ['adviser', 'panelist', 'admin'] },
    { label: 'Research Repository', path: '/repository', icon: BookOpen, roles: ['student', 'adviser', 'panelist', 'admin'] },
    { label: 'User Directory', path: '/admin/users', icon: Users, roles: ['admin'] },
  ];

  const roleBadgeVariants = {
    student: 'blue',
    adviser: 'emerald',
    panelist: 'purple',
    admin: 'amber',
  };

  const filteredNavItems = navItems.filter(item => item.roles.includes(role || 'student'));

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between">
        
        {/* Left: Brand & Mobile Menu Button */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/25 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-blue-300 bg-clip-text text-transparent">
                CoreResearch
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-widest font-bold text-blue-400 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                MVP
              </span>
            </div>
          </Link>
        </div>

        {/* Right: Quick Demo Switcher & User Profile Menu */}
        <div className="flex items-center gap-3">
          
          {/* Quick Demo Role Switcher Bar */}
          <div className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-2">Switch Role:</span>
            {[
              { id: 'student', label: 'Student' },
              { id: 'adviser', label: 'Adviser' },
              { id: 'panelist', label: 'Panelist' },
              { id: 'admin', label: 'Admin' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => selectDevRole(r.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  role === r.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-slate-200">{userProfile?.fullName || 'User'}</div>
              <Badge variant={roleBadgeVariants[role] || 'blue'} className="mt-0.5 text-[10px]">
                {(role || 'Student').toUpperCase()}
              </Badge>
            </div>
            
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Page Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 glass-panel border-r border-slate-800/80 p-4 space-y-6 shrink-0">
          <div className="px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Workspace</p>
            <p className="text-xs font-semibold text-slate-300 mt-0.5 truncate">{userProfile?.department || 'Computer Studies'}</p>
          </div>

          <nav className="space-y-1 flex-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-500 text-center">
            CoreResearch System © 2026
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-blue-400" />
                <span className="font-extrabold text-lg text-white">CoreResearch Menu</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-slate-900 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-2 flex-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Dynamic Page Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
