import React from 'react';
import { AnalysisReport, User } from '../types';
import Dashboard from './Dashboard';

interface IssueTrackerProps {
  issues: AnalysisReport[];
  onSelectIssue: (issue: AnalysisReport) => void;
  sortBy: 'createdAt' | 'priority';
  setSortBy: (sortBy: 'createdAt' | 'priority') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (sortOrder: 'asc' | 'desc') => void;
  currentUser?: User;
  onNavigateToReport?: () => void;
}

const IssueTracker: React.FC<IssueTrackerProps> = ({ 
  issues, 
  onSelectIssue, 
  sortBy, 
  setSortBy, 
  sortOrder, 
  setSortOrder,
  currentUser,
  onNavigateToReport
}) => {
  const activeUser = currentUser || { username: 'user', role: 'User' as any };

  return (
    <Dashboard
      currentUser={activeUser}
      issues={issues}
      inspectors={[]}
      onSelectIssue={onSelectIssue}
      onNavigateToReport={onNavigateToReport}
      sortBy={sortBy}
      setSortBy={setSortBy}
      sortOrder={sortOrder}
      setSortOrder={setSortOrder}
    />
  );
};

export default IssueTracker;
