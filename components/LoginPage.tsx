import React, { useState } from 'react';
import { User, Role } from '../types';
import { downloadReadme } from '../readmeData';
import ShareModal from './ShareModal';
import { 
  CloudIcon, 
  SparklesIcon, 
  ShieldCheckIcon, 
  ActivityIcon, 
  ArrowRightIcon, 
  UserCircleIcon 
} from './icons';

interface LoginPageProps {
  users: User[];
  onLogin: (username: string) => void;
  error: string | null;
}

const LoginPage: React.FC<LoginPageProps> = ({ users, onLogin, error }) => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      onLogin(selectedUser);
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case Role.Admin:
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case Role.IssueInspector:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F3] text-[#171717] flex flex-col justify-between relative overflow-hidden font-sans selection:bg-[#B7ACF5]/30">
      {/* Soft Ambient Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[480px] bg-gradient-to-b from-[#B7ACF5]/25 via-[#7B9EFF]/15 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-32 right-10 w-96 h-96 bg-[#B7ACF5]/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 -left-32 w-80 h-80 bg-[#7B9EFF]/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Subtle cloud backdrop geometry */}
      <svg className="absolute inset-0 w-full h-full stroke-[#EAE7DF]/60 pointer-events-none -z-10 opacity-70" xmlns="http://www.w3.org/2000/svg" fill="none">
        <defs>
          <pattern id="cloud-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="30" cy="30" r="1" fill="#DDD8CB" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cloud-grid)" />
      </svg>

      {/* Top Navigation Bar */}
      <header className="w-full border-b border-[#EAE7DF] bg-[#F8F7F3]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#EAE7DF] shadow-sm flex items-center justify-center text-[#171717] relative group">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#B7ACF5]/40 to-[#7B9EFF]/30 opacity-60 group-hover:opacity-100 transition-opacity" />
              <CloudIcon className="w-5 h-5 text-[#171717] relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base tracking-tight text-[#171717]">AI Issue Reporter</span>
                <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-white border border-[#EAE7DF] text-[#858585]">
                  Cloud Intelligence
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={downloadReadme}
              className="text-xs font-medium text-[#737373] hover:text-[#171717] transition-colors px-3 py-1.5 rounded-full hover:bg-black/[0.03]"
            >
              Documentation
            </button>
            <button
              onClick={() => setIsShareOpen(true)}
              className="text-xs font-medium text-[#171717] bg-white border border-[#EAE7DF] hover:border-[#B7ACF5] px-3.5 py-1.5 rounded-full shadow-sm hover:shadow-card transition-all flex items-center gap-1.5"
            >
              <SparklesIcon className="w-3.5 h-3.5 text-[#9A8CE8]" />
              Share Project
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Login Experience */}
      <main className="max-w-7xl mx-auto px-6 py-12 md:py-20 flex-grow flex flex-col items-center justify-center relative">
        
        {/* Floating Glassmorphism Info Card 1: AI Detection (Upper-Left Corner, Framing Hero) */}
        <div className="hidden lg:flex items-start gap-3 absolute lg:top-4 xl:top-6 2xl:top-8 lg:left-4 xl:left-8 2xl:left-12 lg:w-56 xl:w-64 2xl:w-72 p-3.5 xl:p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-[#EAE7DF] shadow-card hover:shadow-card-hover transition-all duration-300 transform -rotate-1 hover:rotate-0 z-20">
          <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-xl bg-[#F4F1FD] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED] flex-shrink-0">
            <SparklesIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs xl:text-sm font-semibold text-[#171717]">AI Detection</h4>
            <p className="text-[11px] xl:text-xs text-[#858585] mt-0.5 leading-relaxed">
              Identify and analyse reported issues intelligently.
            </p>
          </div>
        </div>

        {/* Floating Glassmorphism Info Card 2: Cloud Monitoring (Upper-Right Corner, Symmetrical) */}
        <div className="hidden lg:flex items-start gap-3 absolute lg:top-4 xl:top-6 2xl:top-8 lg:right-4 xl:right-8 2xl:right-12 lg:w-56 xl:w-64 2xl:w-72 p-3.5 xl:p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-[#EAE7DF] shadow-card hover:shadow-card-hover transition-all duration-300 transform rotate-1 hover:rotate-0 z-20">
          <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-xl bg-[#F0F4FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB] flex-shrink-0">
            <ActivityIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs xl:text-sm font-semibold text-[#171717]">Cloud Monitoring</h4>
            <p className="text-[11px] xl:text-xs text-[#858585] mt-0.5 leading-relaxed">
              Keep track of infrastructure issues.
            </p>
          </div>
        </div>

        {/* Floating Glassmorphism Info Card 3: Smart Classification (Lower-Right Corner, Framing Login Section) */}
        <div className="hidden lg:flex items-start gap-3 absolute lg:bottom-6 xl:bottom-10 2xl:bottom-14 lg:right-4 xl:right-8 2xl:right-12 lg:w-56 xl:w-64 2xl:w-72 p-3.5 xl:p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-[#EAE7DF] shadow-card hover:shadow-card-hover transition-all duration-300 transform -rotate-0.5 hover:rotate-0 z-20">
          <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <ShieldCheckIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs xl:text-sm font-semibold text-[#171717]">Smart Classification</h4>
            <p className="text-[11px] xl:text-xs text-[#858585] mt-0.5 leading-relaxed">
              Automatically organise issues by category and severity.
            </p>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#EAE7DF] text-xs text-[#737373] shadow-sm mb-2">
            <span className="w-2 h-2 rounded-full bg-[#B7ACF5] animate-pulse" />
            <span>Next-Gen Incident Management</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#171717] tracking-tight leading-[1.12]">
            Smarter issue reporting.<br />
            <span className="italic font-normal text-[#171717]">Clearer cloud operations.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#737373] leading-relaxed max-w-xl mx-auto font-normal">
            An AI-powered platform that simplifies issue reporting, intelligently analyses incidents and helps you manage cloud infrastructure more efficiently.
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md mt-10">
          <div className="bg-white/90 backdrop-blur-xl border border-[#EAE7DF] rounded-3xl p-8 sm:p-9 shadow-lavender-ambient relative">
            <div className="mb-6 text-left">
              <h3 className="text-xl font-serif text-[#171717] tracking-tight">Access Workspace</h3>
              <p className="text-xs text-[#858585] mt-1">Select an active user profile to begin incident management.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="user-select" className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-2">
                  Select User Profile
                </label>
                <div className="relative">
                  <select
                    id="user-select"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full appearance-none px-4 py-3.5 bg-[#F8F7F3] border border-[#EAE7DF] rounded-2xl text-sm font-medium text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#B7ACF5] focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="" disabled>-- Choose a workspace profile --</option>
                    {users.map((user) => (
                      <option key={user.username} value={user.username}>
                        {user.username} — ({user.role})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#858585]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {selectedUser && (
                <div className="p-3 bg-[#F8F7F3] rounded-xl border border-[#EAE7DF] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <UserCircleIcon className="w-4 h-4 text-[#858585]" />
                    <span className="font-semibold text-[#171717]">{selectedUser}</span>
                  </div>
                  {(() => {
                    const u = users.find(x => x.username === selectedUser);
                    return u ? (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getRoleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    ) : null;
                  })()}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedUser}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#171717] hover:bg-[#2b2b2b] text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-card disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                <span>Continue to Dashboard</span>
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#EAE7DF] flex items-center justify-between text-xs text-[#858585]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Gemini AI Engine Active
              </span>
              <span>Local Demo Session</span>
            </div>
          </div>
        </div>

        {/* Mobile View for the 3 Feature Cards */}
        <div className="lg:hidden w-full max-w-md grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10">
          <div className="p-3.5 rounded-2xl bg-white/80 border border-[#EAE7DF] text-left">
            <h5 className="text-xs font-semibold text-[#171717]">AI Detection</h5>
            <p className="text-[11px] text-[#858585] mt-0.5">Identify & analyse reported incidents.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/80 border border-[#EAE7DF] text-left">
            <h5 className="text-xs font-semibold text-[#171717]">Cloud Monitoring</h5>
            <p className="text-[11px] text-[#858585] mt-0.5">Keep track of infrastructure issues.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/80 border border-[#EAE7DF] text-left">
            <h5 className="text-xs font-semibold text-[#171717]">Smart Classification</h5>
            <p className="text-[11px] text-[#858585] mt-0.5">Organise by category and severity.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#EAE7DF] bg-[#F8F7F3] py-6 text-center text-xs text-[#858585]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 AI Issue Reporter. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <button
              onClick={() => setIsShareOpen(true)}
              className="hover:text-[#171717] transition-colors"
            >
              Share & Download Project
            </button>
            <span>•</span>
            <button
              onClick={downloadReadme}
              className="hover:text-[#171717] transition-colors"
            >
              Technical Documentation
            </button>
          </div>
        </div>
      </footer>

      {/* Share & Download Modal */}
      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
    </div>
  );
};

export default LoginPage;
