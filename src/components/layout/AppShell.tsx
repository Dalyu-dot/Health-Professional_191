import { LogOut, Moon, RotateCcw, Smartphone, Sun, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminMode } from '../../lib/adminMode';
import { supabase } from '../../lib/supabase';

const devices = [
  { label: 'iPhone 15', width: 393, height: 852 },
  { label: 'Pixel 8', width: 412, height: 915 },
  { label: 'Small phone', width: 360, height: 740 }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const [landscape, setLandscape] = useState(false);
  const { isAdminMode, disableAdminMode } = useAdminMode();
  const navigate = useNavigate();
  const location = useLocation();

  const isPreviewFrame = new URLSearchParams(location.search).has('mobilePreviewFrame');
  const selectedDevice = devices[deviceIndex];
  const previewWidth = landscape ? selectedDevice.height : selectedDevice.width;
  const previewHeight = landscape ? selectedDevice.width : selectedDevice.height;
  const previewSearch = new URLSearchParams(location.search);
  previewSearch.set('mobilePreviewFrame', '1');
  const previewSrc = `${location.pathname}?${previewSearch.toString()}${location.hash}`;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const handleLogout = async () => {
    disableAdminMode();
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-ink transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 no-print">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="min-w-0">
            <p className="truncate text-sm font-semibold text-phil-700 dark:text-emerald-300">PhilHealth Provider Data Record</p>
          </Link>
          <div className="flex items-center gap-2">
            {isAdminMode && (
              <span className="hidden rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 sm:inline-flex">
                Admin Mode
              </span>
            )}
            <button
              type="button"
              onClick={() => setDark((value) => !value)}
              className="grid h-11 w-11 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {!isPreviewFrame && (
              <button
                type="button"
                onClick={() => setMobilePreview((value) => !value)}
                className="grid h-11 w-11 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 hover:border-phil-600 hover:text-phil-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
                aria-label={mobilePreview ? 'Close mobile preview' : 'Open mobile preview'}
                title={mobilePreview ? 'Close mobile preview' : 'Mobile preview'}
                aria-pressed={mobilePreview}
              >
                <Smartphone size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="grid h-11 w-11 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-red-700 dark:hover:text-red-400"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
      {mobilePreview && !isPreviewFrame && (
        <div className="fixed inset-0 z-40 flex flex-col bg-slate-950/85 p-3 backdrop-blur-sm no-print sm:p-5">
          <div className="mx-auto mb-3 flex w-full max-w-5xl flex-col gap-3 rounded-lg border border-white/10 bg-slate-950/95 p-3 text-white shadow-2xl sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Mobile preview</p>
              <p className="text-xs text-slate-300">{selectedDevice.label} - {previewWidth} x {previewHeight}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={deviceIndex}
                onChange={(event) => setDeviceIndex(Number(event.target.value))}
                className="h-10 rounded-md border border-white/15 bg-slate-900 px-3 text-sm text-white"
                aria-label="Select preview device"
              >
                {devices.map((device, index) => (
                  <option key={device.label} value={index}>{device.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setLandscape((value) => !value)}
                className="grid h-10 w-10 place-items-center rounded-md border border-white/15 bg-slate-900 text-white hover:border-emerald-400"
                aria-label="Rotate preview"
                title="Rotate preview"
              >
                <RotateCcw size={17} />
              </button>
              <button
                type="button"
                onClick={() => setMobilePreview(false)}
                className="grid h-10 w-10 place-items-center rounded-md border border-white/15 bg-slate-900 text-white hover:border-red-400"
                aria-label="Close mobile preview"
                title="Close mobile preview"
              >
                <X size={17} />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <div
              className="mx-auto overflow-hidden rounded-[2rem] border-[10px] border-slate-900 bg-white shadow-2xl ring-1 ring-white/20 dark:bg-slate-950"
              style={{
                width: previewWidth,
                height: previewHeight,
                maxWidth: 'calc(100vw - 2rem)',
                maxHeight: 'calc(100vh - 8.5rem)'
              }}
            >
              <iframe
                title="Mobile preview"
                src={previewSrc}
                className="h-full w-full border-0 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
