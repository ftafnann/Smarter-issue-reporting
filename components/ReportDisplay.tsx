import React, { useState } from 'react';
import { AnalysisReport, Location, Priority, Role, Status, User } from '../types';
import { 
  MailIcon, 
  PhoneIcon, 
  CalendarIcon, 
  TrashIcon, 
  SparklesIcon, 
  CloudIcon, 
  ShieldCheckIcon, 
  AlertTriangleIcon, 
  LocationIcon, 
  CheckCircleIcon,
  ArrowRightIcon
} from './icons';
import ConfirmationModal from './ConfirmationModal';
import InspectorUpdateForm from './InspectorUpdateForm';

interface ReportDisplayProps {
  report: AnalysisReport;
  location: Location;
  currentUser: User;
  inspectors: User[];
  onStatusChange: (reportId: string, reportedBy: string, newStatus: Status) => void;
  onDelete: (reportId: string, reportedBy: string) => void;
  onInspectorUpdate: (reportId: string, reportedBy: string, review: string, photoFile?: File) => void;
  onAssignInspector: (reportId: string, reportedBy: string, inspectorUsername: string | undefined) => void;
  onBack?: () => void;
  isLoading: boolean;
}

const severityConfig: { [key in Priority]: { bg: string; text: string; border: string; label: string } } = {
  [Priority.Low]: { 
    bg: 'bg-emerald-50', 
    text: 'text-emerald-700', 
    border: 'border-emerald-200',
    label: 'Low Urgency' 
  },
  [Priority.Medium]: { 
    bg: 'bg-amber-50', 
    text: 'text-amber-700', 
    border: 'border-amber-200',
    label: 'Medium Urgency' 
  },
  [Priority.High]: { 
    bg: 'bg-red-50', 
    text: 'text-red-700', 
    border: 'border-red-200',
    label: 'Critical / High Urgency' 
  },
};

const statusConfig: { [key in Status]: { bg: string; text: string; border: string } } = {
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
    text: 'text-stone-700',
    border: 'border-stone-300'
  },
  [Status.Resolved]: {
    bg: 'bg-stone-100', 
    text: 'text-stone-700', 
    border: 'border-stone-300' 
  },
};

const ReportDisplay: React.FC<ReportDisplayProps> = ({ 
  report, 
  location, 
  currentUser, 
  inspectors, 
  onStatusChange, 
  onDelete, 
  onInspectorUpdate, 
  onAssignInspector, 
  onBack,
  isLoading 
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{ inspectorUsername?: string } | null>(null);
  const [isCompletionConfirmOpen, setIsCompletionConfirmOpen] = useState(false);

  const sConf = severityConfig[report.priority] || severityConfig[Priority.Medium];
  const statConf = statusConfig[report.status] || statusConfig[Status.Reported];
  const issueLocation = report.location || location;
  const isCompleted = report.status === Status.Completed || report.status === Status.Resolved;

  const confirmAssignment = () => {
    if (!pendingAssignment) return;
    onAssignInspector(report.id, report.reportedBy, pendingAssignment.inspectorUsername);
    setPendingAssignment(null);
  };

  const confirmCompletion = () => {
    onStatusChange(report.id, report.reportedBy, Status.Completed);
    setIsCompletionConfirmOpen(false);
  };

  const handleSendEmail = () => {
    const subject = `[${report.priority} Priority Incident] AI Analysis: ${report.problem}`;
    const body = `
Dear ${report.recipient.name},

An infrastructure issue has been analyzed by AI Issue Reporter and requires engineering attention.

Incident: ${report.problem}
Category: ${report.problemCategory}
Cloud Service: ${report.cloudService || 'Cloud Infrastructure'}
Current Status: ${report.status}
Severity Level: ${report.priority}
Coordinates: https://www.google.com/maps?q=${issueLocation.latitude},${issueLocation.longitude}
Assigned Inspector: ${report.inspector.name} (${report.inspector.phone})

AI-GENERATED REPORT & ROOT CAUSE:
------------------------------------------
${report.report}

RECOMMENDED ACTIONABLE REMEDIATION:
------------------------------------------
${report.remediationSteps}

Submitted by: ${report.reportedBy} on ${new Date(report.createdAt).toLocaleString()}.

Regards,
AI Issue Reporter System
    `;
    window.location.href = `mailto:${report.recipient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleConfirmDelete = () => {
    onDelete(report.id, report.reportedBy);
    setIsDeleteModalOpen(false);
  };

  const isAdmin = currentUser.role === Role.Admin;
  const isInspector = currentUser.role === Role.IssueInspector;
  const isAssignedInspector = isInspector && report.assignedInspectorUsername === currentUser.username;
  const canInspectorUpdate = isAssignedInspector && !isCompleted;
  const canChangeStatus = isAdmin;
  const hasInspectorReview = Boolean(report.inspectorReview) && !isCompleted;

  return (
    <div className="w-full space-y-6 animate-fade-in pb-12 font-sans">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white/90 backdrop-blur-md rounded-3xl border border-[#EAE7DF] shadow-card">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-[#737373] hover:text-[#171717] hover:bg-[#F8F7F3] transition-colors"
              title="Return to Dashboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#858585]">#INC-{report.id.slice(-6)}</span>
              <span className="text-[#DDD8CB]">•</span>
              <div className="flex items-center gap-1.5 text-xs text-[#858585]">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{new Date(report.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif text-[#171717] tracking-tight mt-0.5">
              {report.problem}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status selector or badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#858585]">Status:</span>
            {canChangeStatus ? (
              <select
                id="status-selector"
                value={report.status}
                onChange={(e) => onStatusChange(report.id, report.reportedBy, e.target.value as Status)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#B7ACF5] cursor-pointer transition-colors ${statConf.bg} ${statConf.text} ${statConf.border}`}
              >
                {Object.values(Status).filter(status => status !== Status.Resolved).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : isAssignedInspector && !isCompleted ? (
              <select
                id="inspector-status-selector"
                aria-label="Update issue status"
                value=""
                onChange={(event) => {
                  const newStatus = event.target.value as Status;
                  if (newStatus === Status.Completed) {
                    setIsCompletionConfirmOpen(true);
                  } else if (newStatus === Status.InProgress) {
                    onStatusChange(report.id, report.reportedBy, newStatus);
                  }
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#B7ACF5] cursor-pointer transition-colors ${statConf.bg} ${statConf.text} ${statConf.border}`}
              >
                <option value="">Update status...</option>
                <option value={Status.InProgress}>In Progress</option>
                <option value={Status.Completed}>Completed</option>
              </select>
            ) : (
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-xl border ${statConf.bg} ${statConf.text} ${statConf.border}`}>
                {report.status}
              </span>
            )}
          </div>

          {/* Priority pill */}
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-xl border ${sConf.bg} ${sConf.text} ${sConf.border}`}>
            {report.priority} Priority
          </span>
        </div>
      </div>

      {/* Main Grid: Structured AI Analysis Experience */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): AI Synthesis, Root Cause, Remediation */}
        <div className="lg:col-span-2 space-y-6">

          {report.description && (
            <div className="bg-white/95 backdrop-blur-md border border-[#EAE7DF] rounded-3xl p-6 shadow-card space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">Reported Description</h3>
              <p className="text-sm text-[#242424] leading-relaxed whitespace-pre-wrap">{report.description}</p>
            </div>
          )}

          {/* AI Executive Summary Card */}
          <div className="bg-white/95 backdrop-blur-md border border-[#EAE7DF] rounded-3xl p-7 shadow-card relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE7DF] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F4F1FD] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED]">
                  <SparklesIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#171717]">AI Incident Synthesis</h3>
                  <p className="text-[11px] text-[#858585]">Automated diagnosis powered by Gemini Vision & Telemetry</p>
                </div>
              </div>
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified Analysis
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#737373] block mb-1.5">
                  Detailed Operational Report
                </span>
                <p className="text-sm text-[#242424] leading-relaxed whitespace-pre-wrap bg-[#F8F7F3] p-5 rounded-2xl border border-[#EAE7DF]">
                  {report.report}
                </p>
              </div>
            </div>
          </div>

          {/* AI Root Cause & Classification Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Card */}
            <div className="bg-white/95 backdrop-blur-md border border-[#EAE7DF] rounded-3xl p-6 shadow-card space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#858585] uppercase tracking-wider">
                <CloudIcon className="w-4 h-4 text-[#7B9EFF]" />
                <span>Classified Domain</span>
              </div>
              <div className="pt-1">
                <span className="inline-block px-3 py-1 text-sm font-semibold text-[#171717] bg-[#F0F4FF] border border-[#BFDBFE] rounded-xl">
                  {report.problemCategory}
                </span>
                {report.cloudService && (
                  <span className="inline-block ml-2 px-2.5 py-1 text-xs font-medium text-[#737373] bg-[#F8F7F3] border border-[#EAE7DF] rounded-xl">
                    {report.cloudService}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#858585] pt-1">
                Automatically categorized from visual anomalies and sensor telemetry.
              </p>
            </div>

            {/* Severity Assessment Card */}
            <div className="bg-white/95 backdrop-blur-md border border-[#EAE7DF] rounded-3xl p-6 shadow-card space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#858585] uppercase tracking-wider">
                <AlertTriangleIcon className="w-4 h-4 text-[#EA580C]" />
                <span>Severity Assessment</span>
              </div>
              <div className="pt-1">
                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-xl border ${sConf.bg} ${sConf.text} ${sConf.border}`}>
                  {sConf.label}
                </span>
              </div>
              <p className="text-xs text-[#858585] pt-1">
                Risk evaluation based on infrastructure impact and service level disruption.
              </p>
            </div>
          </div>

          {/* Actionable Remediation Roadmap */}
          <div className="bg-white/95 backdrop-blur-md border border-[#EAE7DF] rounded-3xl p-7 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-serif text-[#171717] tracking-tight">Suggested Remediation Roadmap</h3>
              </div>
              <span className="text-xs text-[#858585]">Actionable Protocols</span>
            </div>

            <div className="p-5 bg-[#F8F7F3] rounded-2xl border border-[#EAE7DF] text-sm text-[#242424] leading-relaxed whitespace-pre-wrap">
              {report.remediationSteps}
            </div>
          </div>

          {/* Inspector Review Findings (if available) */}
          {report.inspectorReview && (
            <div className="bg-white/95 backdrop-blur-md border border-[#EAE7DF] rounded-3xl p-7 shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                    <CheckCircleIcon className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-serif text-[#171717] tracking-tight">On-Site Inspector Verification</h3>
                </div>
              </div>

              {report.inspectorPhotoUrl && (
                <div className="p-2 bg-[#F8F7F3] rounded-2xl border border-[#EAE7DF]">
                  <img 
                    src={report.inspectorPhotoUrl} 
                    alt="Inspector on-site evidence" 
                    className="max-h-72 w-auto mx-auto rounded-xl object-contain shadow-sm border border-[#EAE7DF]" 
                  />
                </div>
              )}

              <div className="p-4 bg-[#F8F7F3] rounded-2xl border border-[#EAE7DF] space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#737373]">Inspection Notes:</span>
                <p className="text-sm text-[#242424] leading-relaxed whitespace-pre-wrap">{report.inspectorReview}</p>
              </div>

              {report.inspectorUpdateAt && (
                <p className="text-[11px] text-[#858585] text-right">
                  Submitted on {new Date(report.inspectorUpdateAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Assigned Inspector Update Form (if active inspector) */}
          {canInspectorUpdate && (
            <InspectorUpdateForm
              onSubmit={(review, photoFile) => onInspectorUpdate(report.id, report.reportedBy, review, photoFile)}
              isSubmitting={isLoading}
            />
          )}
        </div>

        {/* Right Column (1 Col): Evidence Photo, Telemetry, Personnel, Actions */}
        <div className="space-y-6">

          {/* Visual Evidence Card */}
          <div className="bg-white/95 backdrop-blur-md border border-[#EAE7DF] rounded-3xl p-6 shadow-card space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Reported Visual Evidence
            </h4>
            {report.imageUrl ? (
              <div className="rounded-2xl overflow-hidden bg-[#F8F7F3] border border-[#EAE7DF] p-1.5">
                <img 
                  src={report.imageUrl} 
                  alt={report.problem} 
                  className="w-full max-h-64 object-contain rounded-xl mx-auto shadow-sm" 
                />
              </div>
            ) : (
              <div className="h-44 rounded-2xl bg-[#F8F7F3] border border-dashed border-[#EAE7DF] flex items-center justify-center text-xs text-[#858585]">
                No image attachment provided
              </div>
            )}
            <p className="text-[11px] text-[#858585] text-center">
              Target telemetry analyzed during submission
            </p>
          </div>

          {/* Geolocation & Region Card */}
          <div className="bg-white/95 backdrop-blur-md border border-[#EAE7DF] rounded-3xl p-6 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#737373] flex items-center gap-1.5">
                <LocationIcon className="w-3.5 h-3.5 text-emerald-600" />
                Physical Facility Location
              </h4>
            </div>

            <div className="p-3.5 bg-[#F8F7F3] rounded-2xl border border-[#EAE7DF] flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-semibold text-[#171717] block">
                  {issueLocation.latitude.toFixed(4)}°, {issueLocation.longitude.toFixed(4)}°
                </span>
                <span className="text-[11px] text-[#858585] block mt-0.5">GPS Fixed Telemetry</span>
              </div>
              <a
                href={`https://www.google.com/maps?q=${issueLocation.latitude},${issueLocation.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-xs font-medium text-[#171717] bg-white border border-[#EAE7DF] rounded-xl hover:border-[#B7ACF5] shadow-sm transition-all"
              >
                Maps Link
              </a>
            </div>
          </div>

          {/* Stakeholders & Management Card */}
          <div className="bg-white/95 backdrop-blur-md border border-[#EAE7DF] rounded-3xl p-6 shadow-card space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Incident Stakeholders
            </h4>

            {/* Recipient */}
            <div className="p-4 bg-[#F8F7F3] rounded-2xl border border-[#EAE7DF] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#858585]">Site Administrator</span>
                <button
                  onClick={handleSendEmail}
                  className="text-[11px] font-semibold text-[#7C3AED] hover:underline flex items-center gap-1"
                >
                  <MailIcon className="w-3 h-3" />
                  Email
                </button>
              </div>
              <p className="text-sm font-semibold text-[#171717]">{report.recipient.name}</p>
              <p className="text-xs font-mono text-[#737373]">{report.recipient.email}</p>
            </div>

            {/* Assigned Inspector */}
            <div className="p-4 bg-[#F8F7F3] rounded-2xl border border-[#EAE7DF] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#858585]">Field Inspector</span>
                {report.inspector.phone !== 'N/A' && (
                  <button
                    onClick={() => handleCall(report.inspector.phone)}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <PhoneIcon className="w-3 h-3" />
                    Call
                  </button>
                )}
              </div>

              {isAdmin ? (
                <div className="space-y-1">
                  <select 
                    id="assign-inspector-select"
                    value={report.assignedInspectorUsername || ''}
                    onChange={(e) => {
                      const inspectorUsername = e.target.value || undefined;
                      if (inspectorUsername !== report.assignedInspectorUsername) {
                        setPendingAssignment({ inspectorUsername });
                      }
                    }}
                    className="w-full bg-white border border-[#EAE7DF] rounded-xl p-2 text-xs font-medium text-[#171717] focus:ring-2 focus:ring-[#B7ACF5] focus:outline-none"
                  >
                    <option value="">{report.assignedInspectorUsername ? '-- Unassign inspector --' : '-- Assign Inspector --'}</option>
                    {inspectors.map(inspector => (
                      <option key={inspector.username} value={inspector.username}>
                        {inspector.username} ({inspector.phone || 'No phone'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-sm font-semibold text-[#171717]">{report.inspector.name}</p>
              )}

              <p className="text-xs text-[#858585] flex items-center gap-1.5">
                <PhoneIcon className="w-3 h-3 text-[#858585]" />
                {report.inspector.phone}
              </p>
            </div>
          </div>

          {/* Action Dispatch Buttons */}
          <div className="bg-white/95 backdrop-blur-md border border-[#EAE7DF] rounded-3xl p-6 shadow-card space-y-3">
            <button
              onClick={handleSendEmail}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#171717] hover:bg-[#2b2b2b] text-white text-xs font-medium shadow-sm hover:shadow-card transition-all flex items-center justify-center gap-2"
            >
              <MailIcon className="w-4 h-4 text-[#B7ACF5]" />
              <span>Send Report via Email</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-2xl bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                <span>Delete Report</span>
              </button>
            )}

            {onBack && (
              <button
                onClick={onBack}
                className="w-full py-2.5 px-4 rounded-2xl bg-white border border-[#EAE7DF] text-[#737373] hover:text-[#171717] hover:bg-[#F8F7F3] text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span>Back to Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm Report Deletion"
        message="Are you sure you want to permanently delete this incident report? This will remove all diagnostic records and inspector evidence."
      />
      <ConfirmationModal
        isOpen={Boolean(pendingAssignment)}
        onClose={() => setPendingAssignment(null)}
        onConfirm={confirmAssignment}
        title={pendingAssignment?.inspectorUsername ? 'Confirm Inspector Assignment' : 'Confirm Inspector Removal'}
        message={pendingAssignment?.inspectorUsername
          ? `Assign "${report.problem}" to ${pendingAssignment.inspectorUsername}?`
          : `Remove the current inspector from "${report.problem}"?`}
        confirmText={pendingAssignment?.inspectorUsername ? 'Confirm Assignment' : 'Confirm Removal'}
        variant="primary"
      />
      <ConfirmationModal
        isOpen={isCompletionConfirmOpen}
        onClose={() => setIsCompletionConfirmOpen(false)}
        onConfirm={confirmCompletion}
        title="Confirm Issue Completion"
        message={`Mark "${report.problem}" as completed?`}
        confirmText="Mark as Completed"
        variant="primary"
      />
    </div>
  );
};

export default ReportDisplay;
