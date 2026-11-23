import React, { useState } from 'react';
import { downloadReadme } from '../readmeData';
import { CloudIcon, SparklesIcon, CheckIcon, ShieldCheckIcon } from './icons';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsersData?: Map<string, Map<string, any>>;
  onImportData?: (importedData: Map<string, Map<string, any>>) => void;
  canImportData?: boolean;
}

const SHARED_APP_URL = 'https://ais-pre-7koqusiciekqgtgwuakatz-335287824673.asia-east1.run.app';

export const ShareModal: React.FC<ShareModalProps> = ({ 
  isOpen, 
  onClose,
  allUsersData,
  onImportData,
  canImportData = false,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'code' | 'data'>('link');

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' && window.location.href.startsWith('http') 
    ? window.location.href 
    : SHARED_APP_URL;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(SHARED_APP_URL || currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCommand = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const handleExportData = () => {
    try {
      const stored = localStorage.getItem('ai_issue_reporter_data') || '[]';
      const blob = new Blob([stored], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-issue-reporter-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canImportData) {
      alert('Only admins can restore issue data.');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          localStorage.setItem('ai_issue_reporter_data', text);
          if (onImportData) {
            const loaded = new Map<string, Map<string, any>>(
              parsed.map(([username, issues]: [string, any[]]) => [
                username,
                new Map(issues)
              ])
            );
            onImportData(loaded);
          }
          alert('Data imported successfully! The dashboard has been updated.');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Could not parse the backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white/95 backdrop-blur-xl border border-[#EAE7DF] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-floating overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#EAE7DF] bg-[#F8F7F3]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#EAE7DF] flex items-center justify-center text-[#9A8CE8] shadow-sm">
              <CloudIcon className="w-5 h-5 text-[#171717]" />
            </div>
            <div>
              <h2 className="text-lg font-serif text-[#171717] tracking-tight">Share & Export Project</h2>
              <p className="text-xs text-[#858585]">Collaborate with infrastructure engineers or backup data</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-[#858585] hover:text-[#171717] p-2 rounded-xl hover:bg-black/[0.04] transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Minimalist Tabs */}
        <div className="flex border-b border-[#EAE7DF] bg-white px-7 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'link' 
                ? 'border-[#171717] text-[#171717]' 
                : 'border-transparent text-[#858585] hover:text-[#171717]'
            }`}
          >
            1. Share Live App
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'code' 
                ? 'border-[#171717] text-[#171717]' 
                : 'border-transparent text-[#858585] hover:text-[#171717]'
            }`}
          >
            2. Run Local Source
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'data' 
                ? 'border-[#171717] text-[#171717]' 
                : 'border-transparent text-[#858585] hover:text-[#171717]'
            }`}
          >
            3. Data & Documentation
          </button>
        </div>

        {/* Content */}
        <div className="p-7 overflow-y-auto space-y-6">
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="bg-[#F8F7F3] border border-[#EAE7DF] rounded-2xl p-5 space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                  Live Platform URL
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    readOnly
                    value={SHARED_APP_URL || currentUrl}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7DF] rounded-xl text-xs font-mono text-[#171717] select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-5 py-2.5 rounded-xl bg-[#171717] hover:bg-[#2b2b2b] text-white text-xs font-medium shrink-0 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    {copiedLink ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <SparklesIcon className="w-3.5 h-3.5 text-[#B7ACF5]" />}
                    {copiedLink ? 'Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F4F1FD] border border-[#DDD6FE] text-xs text-[#7C3AED] leading-relaxed">
                <strong>Local demo storage:</strong> Profiles share issue data only in this browser. Other browsers and devices do not sync, and profiles are not authenticated.
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#171717] block">Quick Launch Commands</span>
                <p className="text-xs text-[#858585]">Run the development environment locally using Vite and Node.js:</p>
              </div>

              <div className="bg-[#F8F7F3] border border-[#EAE7DF] rounded-2xl p-4 font-mono text-xs text-[#171717] relative group">
                <code className="block select-all">npm install<br />npm run dev</code>
                <button
                  type="button"
                  onClick={() => handleCopyCommand('npm install && npm run dev')}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-white border border-[#EAE7DF] text-[11px] font-sans font-medium text-[#737373] hover:text-[#171717] shadow-sm transition-all"
                >
                  {copiedCommand ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-5 rounded-2xl bg-[#F8F7F3] border border-[#EAE7DF] space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[#171717]">Export Backup</h4>
                    <p className="text-xs text-[#858585] mt-0.5">Download entire incident database as JSON</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#EAE7DF] hover:border-[#B7ACF5] text-xs font-medium text-[#171717] shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>Download JSON Backup</span>
                  </button>
                </div>

                {canImportData && (
                  <div className="p-5 rounded-2xl bg-[#F8F7F3] border border-[#EAE7DF] space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[#171717]">Restore Backup</h4>
                      <p className="text-xs text-[#858585] mt-0.5">Import previously exported incident JSON (Admin only)</p>
                    </div>
                    <label className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#EAE7DF] hover:border-[#B7ACF5] text-xs font-medium text-[#171717] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer">
                      <span>Import JSON File</span>
                      <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={downloadReadme}
                  className="w-full py-3 px-4 rounded-2xl bg-[#171717] text-white text-xs font-medium shadow-sm hover:shadow-card transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheckIcon className="w-4 h-4 text-[#B7ACF5]" />
                  <span>Download Complete Technical Documentation (README.md)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
