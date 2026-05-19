import { Download, Edit, FilePlus2, Printer, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { defaultRecordData } from '../lib/formDefaults';
import { createLocalRecord, deleteLocalRecord, getLocalRecordBundle, listLocalRecords } from '../lib/localRecords';
import { generateProviderPdf } from '../lib/pdf';
import type { ProviderRecord } from '../types/database';

export function Dashboard() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<ProviderRecord[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submitted = useMemo(() => records.filter((record) => record.status === 'submitted').length, [records]);

  const load = async () => {
    setBusy(true);
    try {
      setRecords(listLocalRecords(search));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load records.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createNew = async () => {
    setBusy(true);
    try {
      const record = createLocalRecord(defaultRecordData);
      navigate(`/records/${record.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create record.');
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = async (record: ProviderRecord, print = false) => {
    try {
      const bundle = getLocalRecordBundle(record.id);
      const bytes = await generateProviderPdf(bundle);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      if (print) {
        const win = window.open(url, '_blank');
        win?.addEventListener('load', () => win.print());
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `philhealth-provider-data-record-${record.id}.pdf`;
        a.click();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'PDF export failed.');
    }
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total records" value={records.length} />
        <Stat label="Submitted" value={submitted} />
        <Stat label="Storage" value="Local" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Provider Records</h1>
            <p className="text-sm text-slate-500">Create, edit, export, print, and manage PhilHealth PDR submissions.</p>
          </div>
          <button onClick={createNew} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-phil-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
            <FilePlus2 size={18} /> New record
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID, accreditation number" className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 pr-3 dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <button onClick={load} className="rounded-md border border-slate-300 px-4 py-2.5 font-medium dark:border-slate-700">Search</button>
        </div>
        {message && <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const p = record.form_data.personal;
                return (
                  <tr key={record.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-3 font-medium">{[p.lastName, p.firstName].filter(Boolean).join(', ') || 'Untitled draft'}</td>
                    <td className="px-4 py-3 capitalize">{record.form_data.applicationType || 'Draft'}</td>
                    <td className="px-4 py-3 capitalize">{record.status}</td>
                    <td className="px-4 py-3">{new Date(record.updated_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link to={`/records/${record.id}`} className="grid h-9 w-9 place-items-center rounded-md border border-slate-300" title="Edit"><Edit size={16} /></Link>
                        <button onClick={() => exportPdf(record)} className="grid h-9 w-9 place-items-center rounded-md border border-slate-300" title="Export PDF"><Download size={16} /></button>
                        <button onClick={() => exportPdf(record, true)} className="grid h-9 w-9 place-items-center rounded-md border border-slate-300" title="Print"><Printer size={16} /></button>
                        <button onClick={() => { deleteLocalRecord(record.id); load(); }} className="grid h-9 w-9 place-items-center rounded-md border border-red-200 text-red-600" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!records.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">{busy ? 'Loading records...' : 'No records yet.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
