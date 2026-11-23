import React, { useState, useMemo } from 'react';
import { AnalysisReport, Priority, Status, User, Role } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { 
  CloudIcon, 
  SparklesIcon, 
  AlertTriangleIcon, 
  CheckCircleIcon, 
  ShieldCheckIcon,
  ActivityIcon, 
  SearchIcon, 
  FilterIcon, 
  SortAscendingIcon, 
  SortDescendingIcon, 
  EyeIcon, 
  CalendarIcon, 
  TrashIcon,
  PlusIcon
} from './icons';

interface DashboardProps {
  currentUser: User;
  issues: AnalysisReport[];
  inspectors: User[];
  onSelectIssue: (issue: AnalysisReport) => void;
  onAssignInspector?: (reportId: string, reportedBy: string, inspectorUsername: string | undefined) => void;
  onDelete?: (reportId: string, reportedBy: string) => void;
  onStatusChange?: (reportId: string, reportedBy: string, newStatus: Status) => void;
  onNavigateToReport?: () => void;
  sortBy: 'createdAt' | 'priority';
  setSortBy: (sortBy: 'createdAt' | 'priority') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (sortOrder: 'asc' | 'desc') => void;
}

const severityBadges: { [key in Priority]: { bg: string; text: string; border: string; label: string } } = {
  [Priority.High]: { 
    bg: 'bg-red-50', 
    text: 'text-red-700', 
    border: 'border-red-200', 
    label: 'Critical / High' 
  },
  [Priority.Medium]: { 
    bg: 'bg-amber-50', 
    text: 'text-amber-700', 
    border: 'border-amber-200', 
    label: 'Medium' 
  },
  [Priority.Low]: { 
    bg: 'bg-emerald-50', 
    text: 'text-emerald-700', 
    border: 'border-emerald-200', 
    label: 'Low' 
  },
};

const statusBadges: { [key in Status]: { bg: string; text: string; border: string } } = {
  [Status.Reported]: { 
    bg: 'bg-blue-50', 
    text: 'text-blue-700', 
    border: 'border-blue-200' 
  },
  [Status.InProgress]: { 
    bg: 'bg-purple-50', 
    text: 'text-purple-700', 
    border: 'border-purple-200' 
  },
  [Status.Completed]: {
    bg: 'bg-stone-100',
    text: 'text-stone-600',
    border: 'border-stone-200'
  },
  [Status.Resolved]: {
    bg: 'bg-stone-100', 
    text: 'text-stone-600', 
    border: 'border-stone-200' 
  },
};

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  issues,
  inspectors,
  onSelectIssue,
  onAssignInspector,
  onDelete,
  onStatusChange,
  onNavigateToReport,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignment, setFilterAssignment] = useState<string>('all');
  const [showN8nInfo, setShowN8nInfo] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{
    issue: AnalysisReport;
    inspectorUsername?: string;
  } | null>(null);
  const [pendingCompletion, setPendingCompletion] = useState<AnalysisReport | null>(null);

  const isAdmin = currentUser.role === Role.Admin;
  const isInspector = currentUser.role === Role.IssueInspector;

  // Real Dynamic Statistics
  const totalIssuesCount = issues.length;
  const openIssuesCount = useMemo(() => 
    issues.filter(i => i.status === Status.Reported || i.status === Status.InProgress).length, 
    [issues]
  );
  const resolvedIssuesCount = useMemo(() => 
    issues.filter(i => i.status === Status.Completed || i.status === Status.Resolved).length, 
    [issues]
  );
  const criticalIssuesCount = useMemo(() => 
    issues.filter(i => i.priority === Priority.High).length, 
    [issues]
  );
  const unassignedIssuesCount = useMemo(
    () => issues.filter(issue => !issue.assignedInspectorUsername).length,
    [issues]
  );
  const assignedIssuesCount = totalIssuesCount - unassignedIssuesCount;
  const inProgressIssuesCount = useMemo(
    () => issues.filter(issue => issue.status === Status.InProgress).length,
    [issues]
  );
  const stats = isAdmin
    ? [
        { label: 'Total Issues', value: totalIssuesCount, caption: 'All submitted reports', icon: <CloudIcon className="w-4 h-4 text-[#9A8CE8]" />, iconBg: 'bg-[#F8F7F3] border-[#EAE7DF]', bar: 'bg-[#B7ACF5]' },
        { label: 'Unassigned', value: unassignedIssuesCount, caption: 'Awaiting inspector assignment', icon: <AlertTriangleIcon className="w-4 h-4" />, iconBg: 'bg-amber-50 border-amber-200 text-amber-700', bar: 'bg-amber-500' },
        { label: 'Assigned', value: assignedIssuesCount, caption: 'Owned by an inspector', icon: <ShieldCheckIcon className="w-4 h-4" />, iconBg: 'bg-purple-50 border-purple-200 text-purple-700', bar: 'bg-purple-500' },
        { label: 'In Progress', value: inProgressIssuesCount, caption: 'Currently being investigated', icon: <ActivityIcon className="w-4 h-4" />, iconBg: 'bg-[#F0F4FF] border-[#BFDBFE] text-[#2563EB]', bar: 'bg-[#7B9EFF]' },
        { label: 'Completed', value: resolvedIssuesCount, caption: 'Remediated and verified', icon: <CheckCircleIcon className="w-4 h-4" />, iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-700', bar: 'bg-emerald-500' },
      ]
    : [
        { label: 'Total Issues', value: totalIssuesCount, caption: 'Issues in your workspace', icon: <CloudIcon className="w-4 h-4 text-[#9A8CE8]" />, iconBg: 'bg-[#F8F7F3] border-[#EAE7DF]', bar: 'bg-[#B7ACF5]' },
        { label: 'Open Issues', value: openIssuesCount, caption: 'Awaiting triage or verification', icon: <ActivityIcon className="w-4 h-4" />, iconBg: 'bg-[#F0F4FF] border-[#BFDBFE] text-[#2563EB]', bar: 'bg-[#7B9EFF]' },
        { label: 'Completed Issues', value: resolvedIssuesCount, caption: 'Remediated and verified', icon: <CheckCircleIcon className="w-4 h-4" />, iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-700', bar: 'bg-emerald-500' },
        { label: 'Critical Issues', value: criticalIssuesCount, caption: 'Requiring immediate attention', icon: <AlertTriangleIcon className="w-4 h-4" />, iconBg: 'bg-red-50 border-red-200 text-red-600', bar: 'bg-red-500' },
      ];

  const confirmAssignment = () => {
    if (!pendingAssignment || !onAssignInspector) return;
    onAssignInspector(
      pendingAssignment.issue.id,
      pendingAssignment.issue.reportedBy,
      pendingAssignment.inspectorUsername
    );
    setPendingAssignment(null);
  };

  const confirmCompletion = () => {
    if (!pendingCompletion || !onStatusChange) return;
    onStatusChange(pendingCompletion.id, pendingCompletion.reportedBy, Status.Completed);
    setPendingCompletion(null);
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const n8nPrompt = `You are an AI Maintenance Coordinator. Analyze the report for coordinates. Output JSON alert.`;

  const handleCopyN8n = () => {
    navigator.clipboard.writeText(n8nPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Filtered issues
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchesSearch = 
        issue.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.problemCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.id.includes(searchQuery) ||
        issue.reportedBy.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterStatus === 'all' || issue.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || issue.priority === filterPriority;
      const matchesAssignment = 
        filterAssignment === 'all' ||
        (filterAssignment === 'unassigned' && !issue.assignedInspectorUsername) ||
        issue.assignedInspectorUsername === filterAssignment;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignment;
    });
  }, [issues, searchQuery, filterStatus, filterPriority, filterAssignment, currentUser.username]);

  return (
    <div className="w-full space-y-8 font-sans pb-12">
      
      {/* WELCOME SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#EAE7DF] text-xs text-[#737373] shadow-sm mb-2">
            <span className="w-2 h-2 rounded-full bg-[#B7ACF5]" />
            <span>Infrastructure Dashboard</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#171717] tracking-tight">
            Good morning, {currentUser.username}.
          </h2>
          <p className="text-sm text-[#737373] mt-1">
            {isInspector 
              ? "Here's an overview of assigned incident reports across cloud systems."
              : isAdmin 
              ? "Here's an overview of all reported issues across cloud systems."
              : "Here's an overview of your reported issues across cloud systems."}
          </p>
        </div>

        {onNavigateToReport && (
          <button
            type="button"
            id="report-new-incident-btn"
            onClick={onNavigateToReport}
            className="self-start md:self-auto px-5 py-3 rounded-2xl bg-[#171717] hover:bg-[#2e2e2e] text-white text-xs font-medium shadow-sm hover:shadow-card transition-all flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4 text-[#B7ACF5]" />
            <span>Report New Incident</span>
          </button>
        )}
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
        {stats.map((stat) => (
          <div key={stat.label} className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#EAE7DF] shadow-card hover:shadow-card-hover transition-all space-y-3 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#858585]">{stat.label}</span>
              <div className={`w-9 h-9 rounded-2xl border flex items-center justify-center group-hover:scale-105 transition-transform ${stat.iconBg}`}>
                {stat.icon}
              </div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-serif text-[#171717] tracking-tight">{stat.value}</div>
              <p className="text-xs text-[#858585] mt-1">{stat.caption}</p>
            </div>
            <div className="w-full h-1 bg-[#F8F7F3] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${stat.bar}`} style={{ width: totalIssuesCount > 0 ? `${(stat.value / totalIssuesCount) * 100}%` : '0%' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Admin n8n Automation Banner (if Admin) */}
      {isAdmin && (
        <div className="p-5 rounded-3xl bg-white/90 border border-[#EAE7DF] shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F0F4FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
                <SparklesIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#171717] uppercase tracking-wider">
                  Automated Cloud Workflows (n8n Webhook)
                </h4>
                <p className="text-xs text-[#858585]">
                  Trigger real-time Slack/Discord alerts or automated AWS lambda dispatches
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowN8nInfo(!showN8nInfo)}
              className="text-xs font-semibold text-[#7C3AED] hover:underline"
            >
              {showN8nInfo ? 'Hide Webhook Config' : 'View Config'}
            </button>
          </div>

          {showN8nInfo && (
            <div className="pt-3 border-t border-[#EAE7DF] space-y-2">
              <p className="text-xs text-[#737373]">
                Configure an HTTP Webhook trigger in n8n and set this AI System Prompt in your Gemini Node:
              </p>
              <div className="p-3 bg-[#F8F7F3] rounded-2xl border border-[#EAE7DF] flex items-center justify-between text-xs font-mono text-[#171717]">
                <span className="truncate pr-4">{n8nPrompt}</span>
                <button
                  type="button"
                  onClick={handleCopyN8n}
                  className="px-3 py-1 bg-white border border-[#EAE7DF] rounded-xl text-xs font-sans font-medium text-[#171717] hover:border-[#B7ACF5] shadow-sm shrink-0"
                >
                  {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ISSUE MANAGEMENT SECTION */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-[#EAE7DF] shadow-card overflow-hidden">
        
        {/* Table Controls: Search, Filters, Sorting */}
        <div className="p-5 border-b border-[#EAE7DF] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#F8F7F3]/40">
          
          {/* Search Input */}
          <div className="relative flex-grow max-w-md">
            <SearchIcon className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, title, or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#EAE7DF] rounded-2xl text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#B7ACF5] placeholder:text-[#858585]"
            />
          </div>

          {/* Filters & Sorter */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#858585]">
              <span className="font-medium">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-[#EAE7DF] rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#B7ACF5]"
              >
                <option value="all">All Statuses</option>
                <option value={Status.Reported}>Reported</option>
                <option value={Status.InProgress}>In Progress</option>
                <option value={Status.Completed}>Completed</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#858585]">
              <span className="font-medium">Severity:</span>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-white border border-[#EAE7DF] rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#B7ACF5]"
              >
                <option value="all">All Severities</option>
                <option value={Priority.High}>Critical / High</option>
                <option value={Priority.Medium}>Medium</option>
                <option value={Priority.Low}>Low</option>
              </select>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1.5 text-xs text-[#858585]">
                <span className="font-medium">Assignment:</span>
                <select
                  id="filter-assignment"
                  value={filterAssignment}
                  onChange={(e) => setFilterAssignment(e.target.value)}
                  className="bg-white border border-[#EAE7DF] rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#B7ACF5]"
                >
                  <option value="all">All Assignments</option>
                  <option value="unassigned">Unassigned</option>
                  {inspectors.map(inspector => (
                    <option key={inspector.username} value={inspector.username}>{inspector.username}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Toggle */}
            <div className="flex items-center bg-white border border-[#EAE7DF] p-1 rounded-xl shadow-sm">
              <button
                type="button"
                onClick={() => setSortBy('createdAt')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  sortBy === 'createdAt' ? 'bg-[#171717] text-white' : 'text-[#737373] hover:text-[#171717]'
                }`}
              >
                Date
              </button>
              <button
                type="button"
                onClick={() => setSortBy('priority')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  sortBy === 'priority' ? 'bg-[#171717] text-white' : 'text-[#737373] hover:text-[#171717]'
                }`}
              >
                Priority
              </button>
              <button
                type="button"
                onClick={toggleSortOrder}
                className="p-1 text-[#737373] hover:text-[#171717] ml-1 transition-colors"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? <SortAscendingIcon className="w-4 h-4" /> : <SortDescendingIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* ISSUE MANAGEMENT TABLE */}
        {filteredIssues.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EAE7DF] bg-[#F8F7F3]/60 text-[11px] font-semibold uppercase tracking-wider text-[#858585]">
                  <th className="py-4 px-6">Issue ID</th>
                  <th className="py-4 px-6">Issue Title</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Location</th>
                  <th className="py-4 px-6">Severity</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Date Reported</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE7DF] text-xs">
                {filteredIssues.map((issue) => {
                  const sBadge = severityBadges[issue.priority] || severityBadges[Priority.Medium];
                  const stBadge = statusBadges[issue.status] || statusBadges[Status.Reported];

                  return (
                    <tr 
                      key={issue.id} 
                      className="hover:bg-[#F8F7F3]/50 transition-colors group cursor-pointer"
                      onClick={() => onSelectIssue(issue)}
                    >
                      {/* Issue ID */}
                      <td className="py-4 px-6 font-mono font-medium text-[#737373]">
                        #INC-{issue.id.slice(-6)}
                      </td>

                      {/* Issue Title + Thumbnail */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {issue.imageUrl ? (
                            <img 
                              src={issue.imageUrl} 
                              alt="" 
                              className="w-9 h-9 rounded-xl object-cover border border-[#EAE7DF] flex-shrink-0" 
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-[#F8F7F3] border border-[#EAE7DF] flex items-center justify-center text-[#858585] flex-shrink-0">
                              <CloudIcon className="w-4 h-4 text-[#858585]" />
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-sm text-[#171717] group-hover:text-[#9A8CE8] transition-colors block">
                              {issue.problem}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-[#858585] mt-0.5">
                              <span>Reported by: <strong className="text-[#333] font-medium">{issue.reportedBy}</strong></span>
                              <span>•</span>
                              {issue.assignedInspectorUsername ? (
                                <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 font-medium">
                                  Inspector: {issue.assignedInspectorUsername}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md font-medium">
                                  Unassigned
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#737373] mt-1 max-w-md truncate" title={issue.description || issue.report}>
                              {issue.description || issue.report}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-xl bg-white border border-[#EAE7DF] font-medium text-[#737373]">
                          {issue.problemCategory}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-4 px-6 whitespace-nowrap text-[#737373]">
                        {issue.location ? (
                          <a
                            href={`https://www.google.com/maps?q=${issue.location.latitude},${issue.location.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="hover:text-[#7C3AED] hover:underline"
                          >
                            {issue.location.latitude.toFixed(4)}, {issue.location.longitude.toFixed(4)}
                          </a>
                        ) : (
                          <span className="text-[#858585]">Not recorded</span>
                        )}
                      </td>

                      {/* Severity (Subtle indicators: soft red, orange, yellow, green) */}
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold ${sBadge.bg} ${sBadge.text} ${sBadge.border}`}>
                          {sBadge.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold ${stBadge.bg} ${stBadge.text} ${stBadge.border}`}>
                          {issue.status}
                        </span>
                        {isInspector && onStatusChange && issue.assignedInspectorUsername === currentUser.username && issue.status !== Status.Completed && issue.status !== Status.Resolved && (
                          <select
                            aria-label={`Update status for ${issue.problem}`}
                            value=""
                            onChange={(event) => {
                              const newStatus = event.target.value as Status;
                              if (newStatus === Status.Completed) {
                                setPendingCompletion(issue);
                              } else if (newStatus === Status.InProgress) {
                                onStatusChange(issue.id, issue.reportedBy, newStatus);
                              }
                            }}
                            onClick={(event) => event.stopPropagation()}
                            className="mt-2 block max-w-40 bg-white border border-[#EAE7DF] rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#B7ACF5]"
                          >
                            <option value="">Update status...</option>
                            <option value={Status.InProgress}>In Progress</option>
                            <option value={Status.Completed}>Completed</option>
                          </select>
                        )}
                      </td>

                      {/* Date Reported */}
                      <td className="py-4 px-6 text-[#737373] whitespace-nowrap">
                        {new Date(issue.createdAt).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && onAssignInspector && (
                            <select
                              aria-label={`${issue.assignedInspectorUsername ? 'Reassign' : 'Assign'} inspector for ${issue.problem}`}
                              value={issue.assignedInspectorUsername || ''}
                              onChange={(event) => {
                                const inspectorUsername = event.target.value || undefined;
                                if (inspectorUsername !== issue.assignedInspectorUsername) {
                                  setPendingAssignment({ issue, inspectorUsername });
                                }
                              }}
                              className="max-w-40 bg-white border border-[#EAE7DF] rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#B7ACF5]"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <option value="">{issue.assignedInspectorUsername ? 'Unassign inspector' : 'Assign Inspector'}</option>
                              {inspectors.map(inspector => (
                                <option key={inspector.username} value={inspector.username}>{inspector.username}</option>
                              ))}
                            </select>
                          )}
                          <button
                            type="button"
                            data-testid="view-analysis-btn"
                            onClick={() => onSelectIssue(issue)}
                            className="px-3.5 py-1.5 rounded-xl bg-white border border-[#EAE7DF] hover:border-[#B7ACF5] text-xs font-medium text-[#171717] hover:bg-[#F8F7F3] shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <EyeIcon className="w-3.5 h-3.5 text-[#737373]" />
                            <span>View Analysis</span>
                          </button>

                          {isAdmin && onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(issue.id, issue.reportedBy)}
                              className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                              title="Delete Incident"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="py-16 px-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-[#F8F7F3] border border-[#EAE7DF] mx-auto flex items-center justify-center text-[#9A8CE8]">
              <CloudIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-serif text-[#171717]">No incidents recorded</h3>
              <p className="text-xs text-[#858585] mt-1 max-w-sm mx-auto">
                {searchQuery || filterStatus !== 'all' || filterPriority !== 'all' || filterAssignment !== 'all'
                  ? 'No issues match the selected search criteria or filters.' 
                  : 'All cloud systems and infrastructure are operating within normal operational parameters.'}
              </p>
            </div>
            {onNavigateToReport && (
              <button
                type="button"
                onClick={onNavigateToReport}
                className="px-4 py-2 rounded-2xl bg-[#171717] text-white text-xs font-medium hover:bg-[#2b2b2b] shadow-sm transition-all"
              >
                Submit New Report
              </button>
            )}
          </div>
        )}
      </div>
      <ConfirmationModal
        isOpen={Boolean(pendingAssignment)}
        onClose={() => setPendingAssignment(null)}
        onConfirm={confirmAssignment}
        title={pendingAssignment?.inspectorUsername ? 'Confirm Inspector Assignment' : 'Confirm Inspector Removal'}
        message={pendingAssignment?.inspectorUsername
          ? `Assign "${pendingAssignment.issue.problem}" to ${pendingAssignment.inspectorUsername}?`
          : `Remove the current inspector from "${pendingAssignment?.issue.problem}"?`}
        confirmText={pendingAssignment?.inspectorUsername ? 'Confirm Assignment' : 'Confirm Removal'}
        variant="primary"
      />
      <ConfirmationModal
        isOpen={Boolean(pendingCompletion)}
        onClose={() => setPendingCompletion(null)}
        onConfirm={confirmCompletion}
        title="Confirm Issue Completion"
        message={`Mark "${pendingCompletion?.problem}" as completed?`}
        confirmText="Mark as Completed"
        variant="primary"
      />
    </div>
  );
};

export default Dashboard;
