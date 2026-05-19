import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { ProviderFormPage } from './pages/ProviderFormPage';

function FrontendOnly({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<FrontendOnly><Dashboard /></FrontendOnly>} />
      <Route path="/records/new" element={<FrontendOnly><ProviderFormPage /></FrontendOnly>} />
      <Route path="/records/:id" element={<FrontendOnly><ProviderFormPage /></FrontendOnly>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
