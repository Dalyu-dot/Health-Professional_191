import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { ProviderFormPage } from './pages/ProviderFormPage';
import { AdminModeProvider, useAdminMode } from './lib/adminMode';
import { supabase } from './lib/supabase';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!checked) return null;
  if (!authed) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

function NewRecordRoute() {
  const { isAdminMode } = useAdminMode();
  if (isAdminMode) return <Navigate to="/" replace />;
  return <ProviderFormPage />;
}

export default function App() {
  return (
    <AdminModeProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/records/new" element={<ProtectedRoute><NewRecordRoute /></ProtectedRoute>} />
        <Route path="/records/:id" element={<ProtectedRoute><ProviderFormPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AdminModeProvider>
  );
}
