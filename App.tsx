import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReportDisplay from './components/ReportDisplay';
import Dashboard from './components/Dashboard';
import ReportAnIssue from './components/ReportAnIssue';
import Loader from './components/Loader';
import LoginPage from './components/LoginPage';
import ShareModal from './components/ShareModal';
import { analyzeIssueWithContext, isGeminiConfigured } from './services/geminiService';
import { AnalysisReport, Location, Status, Priority, User, Role } from './types';
import { 
  CloudIcon, 
  SparklesIcon, 
  BellIcon, 
  UserCircleIcon, 
  ExclamationCircleIcon, 
  ActivityIcon,
  CheckCircleIcon
} from './components/icons';
import { downloadReadme } from './readmeData';

const MOCK_USERS: User[] = [
  { username: 'admin', role: Role.Admin },
  { username: 'field_agent_1', role: Role.User },
  { username: 'inspector_jane', role: Role.IssueInspector, phone: '555-111-2222' },
  { username: 'inspector_mike', role: Role.IssueInspector, phone: '555-222-3333' },
];

const STORAGE_KEY = 'ai_issue_reporter_data';
const SESSION_KEY = 'ai_issue_reporter_session';

const normalizeIssueStatus = (issue: AnalysisReport): AnalysisReport =>
  issue.status === Status.Resolved ? { ...issue, status: Status.Completed } : issue;

const loadUsersData = (data: unknown): Map<string, Map<string, AnalysisReport>> => {
  if (!Array.isArray(data)) throw new Error('Issue data must be an array.');
  return new Map(
    (data as [string, [string, AnalysisReport][]][]).map(([username, issueEntries]) => [
      username,
      new Map(issueEntries.map(([id, issue]) => [id, normalizeIssueStatus(issue)])),
    ])
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [allUsersData, setAllUsersData] = useState<Map<string, Map<string, AnalysisReport>>>(new Map());
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [currentReport, setCurrentReport] = useState<AnalysisReport | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'report'>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [usingFallbackLocation, setUsingFallbackLocation] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load persisted session and issues
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        setAllUsersData(loadUsersData(JSON.parse(storedData)));
      }
      const sessionUser = sessionStorage.getItem(SESSION_KEY);
      if (sessionUser) {
        const parsed = JSON.parse(sessionUser);
        const freshUser = MOCK_USERS.find(u => u.username === parsed.username) || parsed;
        setCurrentUser(freshUser);
      }
    } catch (e) {
      console.error("Failed to parse data from storage", e);
    } finally {
      setIsDataLoaded(true);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    if (!isDataLoaded) return;
    const dataToStore = Array.from(allUsersData.entries()).map(([username, issuesMap]) => [
      username,
      Array.from(issuesMap.entries())
    ]);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (storageError) {
      console.error("Failed to persist issue data", storageError);
      setError("Failed to save issue data in this browser. Check available storage space.");
    }
  }, [allUsersData, isDataLoaded]);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setAllUsersData(loadUsersData(JSON.parse(e.newValue)));
        } catch (err) {
          console.error("Error reading external storage update", err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Telemetry Location acquisition
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setUsingFallbackLocation(false);
      },
      (err) => {
        console.warn("Location acquisition fallback:", err.message);
        // Default to New York City telemetry
        setLocation({ latitude: 40.7128, longitude: -74.0060 });
        setUsingFallbackLocation(true);
      }
    );
  }, []);

  const handleLogin = (username: string) => {
    const user = MOCK_USERS.find(u => u.username === username);
    if (user) {
      setCurrentUser(user);
      setActiveTab('dashboard');
      setCurrentReport(null);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
      setLoginError(null);
      if (!allUsersData.has(username)) {
        setAllUsersData(prev => new Map(prev).set(username, new Map()));
      }
    } else {
      setLoginError("Invalid user selected.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(SESSION_KEY);
    setCurrentReport(null);
    setActiveTab('dashboard');
    setIsProfileOpen(false);
  };

  const handleSwitchUser = (username: string) => {
    handleLogin(username);
    setIsProfileOpen(false);
    setCurrentReport(null);
  };

  // Submit and Run AI Analysis
  const handleSubmitIssue = async (data: {
    title: string;
    description: string;
    category: string;
    severity: Priority;
    cloudService: string;
    imageFile: File | null;
    imagePreviewUrl: string | null;
  }) => {
    if (!currentUser || !location) return;
    if (currentUser.role !== Role.User) {
      setError("Only field agents can submit issue reports.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setCurrentReport(null);

    try {
      const base64Data = data.imagePreviewUrl ? data.imagePreviewUrl.split(',')[1] : undefined;
      const mimeType = data.imageFile ? data.imageFile.type : undefined;

      const result = await analyzeIssueWithContext(
        {
          title: data.title,
          description: data.description,
          category: data.category,
          severity: data.severity,
          cloudService: data.cloudService,
          base64ImageData: base64Data,
          mimeType,
        },
        location
      );

      const newReport: AnalysisReport = {
        ...result,
        id: Date.now().toString(),
        status: Status.Reported,
        createdAt: Date.now(),
        reportedBy: currentUser.username,
        description: data.description,
        imageUrl: data.imagePreviewUrl || undefined,
        assignedInspectorUsername: undefined,
        location,
        inspector: {
          name: 'Unassigned',
          phone: 'N/A'
        },
        cloudService: data.cloudService,
      };

      setAllUsersData(prev => {
        const newData = new Map(prev);
        const userIssuesMap = newData.get(currentUser.username);
        const userIssues = userIssuesMap instanceof Map ? new Map(userIssuesMap) : new Map<string, AnalysisReport>();
        userIssues.set(newReport.id, newReport);
        newData.set(currentUser.username, userIssues);
        return newData;
      });

      setCurrentReport(newReport);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown incident analysis error.";
      setError(`Analysis Failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (reportId: string, reportedBy: string, newStatus: Status) => {
    const report = allUsersData.get(reportedBy)?.get(reportId);
    if (!report) return;

    const isAdmin = currentUser?.role === Role.Admin;
    const isAssignedInspector =
      currentUser?.role === Role.IssueInspector &&
      report.assignedInspectorUsername === currentUser.username;
    const validInspectorTransition =
      (report.status === Status.Reported && newStatus === Status.InProgress) ||
      (report.status === Status.InProgress && newStatus === Status.Completed);

    if (report.status === newStatus) return;

    if (!isAdmin && (!isAssignedInspector || !validInspectorTransition)) {
      setError("You do not have permission to make this issue status change.");
      return;
    }

    setAllUsersData(prev => {
      const newData = new Map(prev);
      const userIssues = newData.get(reportedBy);
      if (userIssues instanceof Map) {
        const issueToUpdate = userIssues.get(reportId);
        if (issueToUpdate) {
          const updatedUserIssues = new Map(userIssues);
          const updatedIssue = { ...issueToUpdate, status: newStatus };
          updatedUserIssues.set(reportId, updatedIssue);
          newData.set(reportedBy, updatedUserIssues);
          if (currentReport?.id === reportId) setCurrentReport(updatedIssue);
        }
      }
      return newData;
    });
    setError(null);
    setStatusNotice(`Issue status updated to ${newStatus}.`);
  };

  const handleAssignInspector = (reportId: string, reportedBy: string, inspectorUsername: string | undefined) => {
    if (currentUser?.role !== Role.Admin) {
      setError("Only an admin can assign or reassign inspectors.");
      return;
    }
    if (inspectorUsername && !availableInspectors.some(inspector => inspector.username === inspectorUsername)) {
      setError("Select a valid inspector before assigning this issue.");
      return;
    }

    setAllUsersData(prev => {
      const newData = new Map(prev);
      const userIssues = newData.get(reportedBy);
      if (userIssues instanceof Map) {
        const issueToUpdate = userIssues.get(reportId);
        if (issueToUpdate) {
          const inspectorUser = MOCK_USERS.find(u => u.username === inspectorUsername);
          const updatedUserIssues = new Map(userIssues);
          const updatedIssue = { 
            ...issueToUpdate, 
            assignedInspectorUsername: inspectorUsername,
            inspector: {
              name: inspectorUser?.username || 'Unassigned',
              phone: inspectorUser?.phone || 'N/A'
            }
          };
          updatedUserIssues.set(reportId, updatedIssue);
          newData.set(reportedBy, updatedUserIssues);
          if (currentReport?.id === reportId) setCurrentReport(updatedIssue);
        }
      }
      return newData;
    });
  };

  const handleInspectorUpdate = (reportId: string, reportedBy: string, review: string, photoFile?: File) => {
    const report = allUsersData.get(reportedBy)?.get(reportId);
    if (
      currentUser?.role !== Role.IssueInspector ||
      !report ||
      report.assignedInspectorUsername !== currentUser.username ||
      report.status === Status.Completed ||
      report.status === Status.Resolved
    ) {
      setError("Only the assigned inspector can update this issue.");
      return;
    }

    const applyUpdate = (photoUrl?: string) => {
      setAllUsersData(prev => {
        const newData = new Map(prev);
        const userIssues = newData.get(reportedBy);
        if (userIssues instanceof Map) {
          const issueToUpdate = userIssues.get(reportId);
          if (issueToUpdate) {
            const updatedUserIssues = new Map(userIssues);
            const updatedIssue: AnalysisReport = { 
              ...issueToUpdate, 
              status: issueToUpdate.status === Status.Reported ? Status.InProgress : issueToUpdate.status,
              inspectorReview: review,
              inspectorPhotoUrl: photoUrl || issueToUpdate.inspectorPhotoUrl,
              inspectorUpdateAt: Date.now(),
            };
            updatedUserIssues.set(reportId, updatedIssue);
            newData.set(reportedBy, updatedUserIssues);
            if (currentReport?.id === reportId) setCurrentReport(updatedIssue);
          }
        }
        return newData;
      });
      setIsLoading(false);
    };

    if (photoFile) {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => applyUpdate(reader.result as string);
      reader.onerror = () => {
        setError("Failed to process inspector evidence photo.");
        setIsLoading(false);
      };
      reader.readAsDataURL(photoFile);
    } else {
      applyUpdate();
    }
  };

  const handleDelete = (reportId: string, reportedBy: string) => {
    if (currentUser?.role !== Role.Admin) {
      setError("Only an admin can delete issue reports.");
      return;
    }

    setAllUsersData(prev => {
      const newData = new Map(prev);
      const userIssues = newData.get(reportedBy);
      if (userIssues instanceof Map) {
        const updatedUserIssues = new Map(userIssues);
        updatedUserIssues.delete(reportId);
        newData.set(reportedBy, updatedUserIssues);
      }
      return newData;
    });
    if (currentReport?.id === reportId) {
      setCurrentReport(null);
    }
  };

  const handleSelectIssue = (issue: AnalysisReport) => {
    setCurrentReport(issue);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sortedIssues = useMemo(() => {
    const priorityOrder = { [Priority.High]: 3, [Priority.Medium]: 2, [Priority.Low]: 1 };
    
    let issuesArray: AnalysisReport[] = [];
    if (currentUser?.role === Role.Admin) {
      issuesArray = Array.from(allUsersData.values()).flatMap(userMap => 
        userMap instanceof Map ? Array.from(userMap.values()) : []
      );
    } else if (currentUser?.role === Role.IssueInspector) {
      issuesArray = Array.from(allUsersData.values()).flatMap(userMap =>
        userMap instanceof Map
          ? Array.from(userMap.values()).filter(issue => issue.assignedInspectorUsername === currentUser.username)
          : []
      );
    } else if (currentUser) {
      const userIssues = allUsersData.get(currentUser.username);
      issuesArray = userIssues instanceof Map ? Array.from(userIssues.values()) : [];
    }

    return issuesArray.sort((a, b) => {
      const comparison = (sortBy === 'priority')
        ? priorityOrder[b.priority] - priorityOrder[a.priority]
        : b.createdAt - a.createdAt;
      return sortOrder === 'asc' ? -comparison : comparison;
    });
  }, [allUsersData, sortBy, sortOrder, currentUser]);

  const availableInspectors = useMemo(() => MOCK_USERS.filter(u => u.role === Role.IssueInspector), []);
  const criticalCount = useMemo(() => sortedIssues.filter(i => i.priority === Priority.High && i.status !== Status.Completed && i.status !== Status.Resolved).length, [sortedIssues]);

  if (!currentUser) {
    return <LoginPage users={MOCK_USERS} onLogin={handleLogin} error={loginError} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F7F3] text-[#171717] flex flex-col justify-between font-sans selection:bg-[#B7ACF5]/30">
      
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-[#EAE7DF] bg-[#F8F7F3]/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          
          {/* Logo & Application Name */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setCurrentReport(null); setActiveTab('dashboard'); }}
              className="flex items-center gap-3 text-left group"
            >
              <div className="w-9 h-9 rounded-2xl bg-white border border-[#EAE7DF] shadow-sm flex items-center justify-center text-[#171717] group-hover:border-[#B7ACF5] transition-colors">
                <CloudIcon className="w-5 h-5 text-[#171717]" />
              </div>
              <div>
                <span className="font-semibold text-sm tracking-tight text-[#171717] block">AI Issue Reporter</span>
                <span className="text-[10px] text-[#858585] block -mt-0.5 font-mono">Cloud Operations</span>
              </div>
            </button>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-white/70 border border-[#EAE7DF] p-1 rounded-2xl shadow-sm">
            <button
              onClick={() => { setCurrentReport(null); setActiveTab('dashboard'); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                !currentReport && activeTab === 'dashboard' 
                  ? 'bg-[#171717] text-white shadow-sm' 
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              Overview
            </button>

            {currentUser.role === Role.User && (
              <button
                onClick={() => { setCurrentReport(null); setActiveTab('report'); }}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  !currentReport && activeTab === 'report' 
                    ? 'bg-[#171717] text-white shadow-sm' 
                    : 'text-[#737373] hover:text-[#171717]'
                }`}
              >
                <SparklesIcon className="w-3.5 h-3.5 text-[#B7ACF5]" />
                <span>Report an Issue</span>
              </button>
            )}

            {currentReport && (
              <span className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#F4F1FD] text-[#7C3AED] border border-[#DDD6FE]">
                Incident Analysis
              </span>
            )}
          </nav>

          {/* Right Header Menu: Share, Notifications, User Profile */}
          <div className="flex items-center gap-3">
            
            {/* Share / Download button */}
            <button
              onClick={() => setIsShareOpen(true)}
              className="hidden sm:flex text-xs font-medium text-[#171717] bg-white border border-[#EAE7DF] hover:border-[#B7ACF5] px-3.5 py-1.5 rounded-full shadow-sm hover:shadow-card transition-all items-center gap-1.5"
            >
              <SparklesIcon className="w-3.5 h-3.5 text-[#9A8CE8]" />
              <span>Share & Download</span>
            </button>

            {/* Notification Icon */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="w-9 h-9 rounded-full bg-white border border-[#EAE7DF] hover:border-[#B7ACF5] shadow-sm flex items-center justify-center text-[#737373] hover:text-[#171717] transition-all relative"
                aria-label="Notifications"
              >
                <BellIcon className="w-4 h-4" />
                {criticalCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>

              {/* Notification Popover */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-72 p-4 bg-white/95 backdrop-blur-xl border border-[#EAE7DF] rounded-2xl shadow-floating z-50 animate-fade-in text-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#EAE7DF]">
                    <span className="font-semibold text-[#171717]">Incident Alerts</span>
                    <span className="text-[10px] text-[#858585]">{criticalCount} critical</span>
                  </div>

                  {criticalCount > 0 ? (
                    <div className="space-y-2">
                      {sortedIssues.filter(i => i.priority === Priority.High && i.status !== Status.Completed && i.status !== Status.Resolved).slice(0, 3).map(iss => (
                        <div 
                          key={iss.id} 
                          onClick={() => { handleSelectIssue(iss); setIsNotificationOpen(false); }}
                          className="p-2.5 rounded-xl bg-red-50/70 hover:bg-red-50 border border-red-100 cursor-pointer transition-colors space-y-1"
                        >
                          <div className="font-semibold text-red-800 truncate">{iss.problem}</div>
                          <div className="text-[10px] text-red-600/80 flex items-center justify-between">
                            <span>{iss.problemCategory}</span>
                            <span>{new Date(iss.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-[#858585]">
                      <CheckCircleIcon className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      <span>No unaddressed critical alerts</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Current User Profile Pill & Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                id="profile-menu-button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-white border border-[#EAE7DF] hover:border-[#B7ACF5] shadow-sm transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-[#171717] text-white flex items-center justify-center text-xs font-semibold">
                  {currentUser.username[0].toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-xs font-semibold text-[#171717] block leading-tight">{currentUser.username}</span>
                  <span className="text-[10px] text-[#858585] block leading-tight">{currentUser.role}</span>
                </div>
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div id="profile-menu-dropdown" className="absolute right-0 mt-2 w-56 p-2 bg-white/95 backdrop-blur-xl border border-[#EAE7DF] rounded-2xl shadow-floating z-50 animate-fade-in text-xs space-y-1">
                  <div className="px-3 py-2 border-b border-[#EAE7DF]">
                    <span className="font-semibold text-[#171717] block">{currentUser.username}</span>
                    <span className="text-[11px] text-[#858585] block">{currentUser.role}</span>
                  </div>

                  <div className="py-1">
                    <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#858585] block">
                      Switch Profile
                    </span>
                    {MOCK_USERS.map(u => (
                      <button
                        key={u.username}
                        id={`switch-user-${u.username}`}
                        data-username={u.username}
                        onClick={() => handleSwitchUser(u.username)}
                        className={`w-full text-left px-3 py-1.5 rounded-xl transition-colors flex items-center justify-between ${
                          u.username === currentUser.username ? 'bg-[#F8F7F3] font-semibold text-[#171717]' : 'text-[#737373] hover:text-[#171717] hover:bg-[#F8F7F3]'
                        }`}
                      >
                        <span>{u.username}</span>
                        <span className="text-[10px] text-[#858585]">({u.role})</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-1 border-t border-[#EAE7DF]">
                    <button
                      id="logout-button"
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium"
                    >
                      Logout of Workspace
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar tabs */}
        <div className="md:hidden flex items-center justify-around border-t border-[#EAE7DF] bg-white px-4 py-2">
          <button
            onClick={() => { setCurrentReport(null); setActiveTab('dashboard'); }}
            className={`text-xs font-semibold py-1 px-3 rounded-xl transition-colors ${
              !currentReport && activeTab === 'dashboard' ? 'bg-[#171717] text-white' : 'text-[#737373]'
            }`}
          >
            Overview
          </button>
          {currentUser.role === Role.User && (
            <button
              onClick={() => { setCurrentReport(null); setActiveTab('report'); }}
              className={`text-xs font-semibold py-1 px-3 rounded-xl transition-colors flex items-center gap-1 ${
                !currentReport && activeTab === 'report' ? 'bg-[#171717] text-white' : 'text-[#737373]'
              }`}
            >
              <SparklesIcon className="w-3.5 h-3.5 text-[#B7ACF5]" />
              <span>Report Issue</span>
            </button>
          )}
          {currentReport && (
            <button
              onClick={() => {}}
              className="text-xs font-semibold py-1 px-3 rounded-xl bg-[#F4F1FD] text-[#7C3AED] border border-[#DDD6FE]"
            >
              Analysis
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-grow w-full">
        
        {/* Error notification banner */}
        {error && (
          <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 text-xs shadow-sm">
            <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}
        {statusNotice && (
          <div
            role="status"
            className="p-4 mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs shadow-sm"
          >
            <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{statusNotice}</span>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              className="ml-auto text-emerald-800 hover:text-emerald-950"
              aria-label="Dismiss status update notification"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Global Loader during Analysis */}
        {isLoading && !currentReport && (
          <Loader message="Gemini multimodal engine is synthesizing visual evidence and telemetry..." />
        )}

        {/* View 1: Active Report Display (Structured AI Analysis Experience) */}
        {currentReport && location ? (
          <ReportDisplay
            report={currentReport}
            location={location}
            currentUser={currentUser}
            inspectors={availableInspectors}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onInspectorUpdate={handleInspectorUpdate}
            onAssignInspector={handleAssignInspector}
            onBack={() => setCurrentReport(null)}
            isLoading={isLoading}
          />
        ) : activeTab === 'report' && currentUser.role === Role.User ? (
          /* View 2: Report an Issue Page */
          <ReportAnIssue
            onSubmitIssue={handleSubmitIssue}
            isLoading={isLoading}
            location={location}
            usingFallbackLocation={usingFallbackLocation}
            isGeminiConfigured={isGeminiConfigured}
            onCancel={() => setActiveTab('dashboard')}
          />
        ) : (
          /* View 3: Dashboard (Overview, 4 Stats Cards, Issue Management Table) */
          <Dashboard
            currentUser={currentUser}
            issues={sortedIssues}
            inspectors={availableInspectors}
            onSelectIssue={handleSelectIssue}
            onAssignInspector={handleAssignInspector}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onNavigateToReport={currentUser.role === Role.User ? () => setActiveTab('report') : undefined}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#EAE7DF] bg-[#F8F7F3] py-6 text-xs text-[#858585]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 AI Issue Reporter. Intelligent Cloud Incident Operations.</p>
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
              README Documentation
            </button>
          </div>
        </div>
      </footer>

      {/* Share & Download Modal */}
      <ShareModal 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
        allUsersData={allUsersData}
        canImportData={currentUser.role === Role.Admin}
        onImportData={(data) => {
          if (currentUser.role === Role.Admin) {
            const importedData = Array.from(data.entries()).map(([username, issues]) => [
              username,
              Array.from(issues.entries()).map(([id, issue]) => [id, normalizeIssueStatus(issue)]),
            ]);
            setAllUsersData(loadUsersData(importedData));
          }
        }}
      />
    </div>
  );
};

export default App;
