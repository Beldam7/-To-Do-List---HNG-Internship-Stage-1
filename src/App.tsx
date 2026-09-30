import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthPage } from '@/pages/AuthPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { TodayPage } from '@/pages/TodayPage';
import { InboxPage } from '@/pages/InboxPage';
import { AllTasksPage } from '@/pages/AllTasksPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { NotesPage } from '@/pages/NotesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ToastContainer } from '@/components/ui/Toast';
import type { Page, AuthView } from '@/types';

function AppContent() {
  const { user, profile, loading, needsOnboarding } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [currentPage, setCurrentPage] = useState<Page>('today');

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('focus-theme') || 'system';
    const resolved = savedTheme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : savedTheme;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthPage
          initialView={authView}
          onAuthenticated={() => {}}
          onSwitchView={setAuthView}
        />
        <ToastContainer />
      </>
    );
  }

  if (needsOnboarding) {
    return (
      <>
        <OnboardingPage onComplete={() => {}} />
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
        {currentPage === 'today' && <TodayPage />}
        {currentPage === 'inbox' && <InboxPage />}
        {currentPage === 'all-tasks' && <AllTasksPage />}
        {currentPage === 'projects' && <ProjectsPage />}
        {currentPage === 'notes' && <NotesPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </AppLayout>
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
