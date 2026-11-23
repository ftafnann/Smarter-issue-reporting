import React from 'react';
import { AnalysisReport, User } from '../types';
import Dashboard from './Dashboard';

interface AdminDashboardProps {
  issues: AnalysisReport[];
  inspectors: User[];
  onSelectIssue: (issue: AnalysisReport) => void;
  onAssignInspector: (reportId: string, reportedBy: string, inspectorUsername: string | undefined) => void;
  sortBy: 'createdAt' | 'priority';
  setSortBy: (sortBy: 'createdAt' | 'priority') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (sortOrder: 'asc' | 'desc') => void;
  hasInspectors: boolean;
  currentUser?: User;
  onNavigateToReport?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  issues, 
  inspectors, 
  onSelectIssue, 
  onAssignInspector, 
  sortBy, 
  setSortBy, 
  sortOrder, 
  setSortOrder,
  currentUser,
  onNavigateToReport
}) => {
  const activeUser = currentUser || { username: 'admin', role: 'Admin' as any };

  return (
    <Dashboard
      currentUser={activeUser}
      issues={issues}
      inspectors={inspectors}
      onSelectIssue={onSelectIssue}
      onAssignInspector={onAssignInspector}
      onNavigateToReport={onNavigateToReport}
      sortBy={sortBy}
      setSortBy={setSortBy}
      sortOrder={sortOrder}
      setSortOrder={setSortOrder}
    />
  );
};

export default AdminDashboard;
