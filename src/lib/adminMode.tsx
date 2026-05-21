import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ADMIN_MODE_KEY = 'philhealth-pdr-admin-mode';

interface AdminModeContextValue {
  isAdminMode: boolean;
  enableAdminMode: () => void;
  disableAdminMode: () => void;
}

const AdminModeContext = createContext<AdminModeContextValue | undefined>(undefined);

export function AdminModeProvider({ children }: { children: React.ReactNode }) {
  const [isAdminMode, setIsAdminMode] = useState(() => localStorage.getItem(ADMIN_MODE_KEY) === 'true');

  useEffect(() => {
    if (isAdminMode) {
      localStorage.setItem(ADMIN_MODE_KEY, 'true');
    } else {
      localStorage.removeItem(ADMIN_MODE_KEY);
    }
  }, [isAdminMode]);

  const value = useMemo(
    () => ({
      isAdminMode,
      enableAdminMode: () => setIsAdminMode(true),
      disableAdminMode: () => setIsAdminMode(false),
    }),
    [isAdminMode]
  );

  return <AdminModeContext.Provider value={value}>{children}</AdminModeContext.Provider>;
}

export function useAdminMode() {
  const context = useContext(AdminModeContext);
  if (!context) throw new Error('useAdminMode must be used within AdminModeProvider.');
  return context;
}
