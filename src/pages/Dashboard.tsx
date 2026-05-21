import { Edit, Eye, FilePlus2, Printer, Search, Trash2, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminMode } from '../lib/adminMode';
import { defaultRecordData } from '../lib/formDefaults';
import { generateProviderPdf } from '../lib/pdf';
import { createRecord, deleteRecord, getRecordBundle, listRecords, updateRecordStatus } from '../lib/records';
import type { ProviderRecord, RecordStatus } from '../types/database';

const APPROVAL_DATA_KEY = 'philhealth-pdr-approval-data-v1';

interface ApprovalFormData {
  dateEvaluated: string;
  evaluatedLhio: string;
  evaluatedPro: string;
  evaluatedByLhio: string;
  evaluatedByPro: string;
  dateReceived: string;
  receivedLhio: string;
  receivedPro: string;
  receivedByLhio: string;
  receivedByPro: string;
  dateEncoded: string;
  receivingModule: string;
  dataEntry: string;
  encodedLhio: string;
  encodedPro: string;
  ipasControlNo: string;
}

const blankApprovalForm: ApprovalFormData = {
  dateEvaluated: '',
  evaluatedLhio: '',
  evaluatedPro: '',
  evaluatedByLhio: '',
  evaluatedByPro: '',
  dateReceived: '',
  receivedLhio: '',
  receivedPro: '',
  receivedByLhio: '',
  receivedByPro: '',
  dateEncoded: '',
  receivingModule: '',
  dataEntry: '',
  encodedLhio: '',
  encodedPro: '',
  ipasControlNo: '',
};

function saveApprovalData(recordId: string, formData: ApprovalFormData) {
  const raw = localStorage.getItem(APPROVAL_DATA_KEY);
  const current = raw ? JSON.parse(raw) as Record<string, unknown> : {};
  localStorage.setItem(
    APPROVAL_DATA_KEY,
    JSON.stringify({
      ...current,
      [recordId]: {
        ...formData,
        approvedAt: new Date().toISOString(),
      },
    })
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { isAdminMode } = useAdminMode();
  const [records, setRecords] = useState<ProviderRecord[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [approvalRecord, setApprovalRecord] = useState<ProviderRecord | null>(null);
  const [approvalForm, setApprovalForm] = useState<ApprovalFormData>(blankApprovalForm);

  const approved = useMemo(() => records.filter((record) => record.status === 'approved').length, [records]);

  const load = async () => {
    setBusy(true);
    try {
      setRecords(await listRecords(search));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load records.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, [isAdminMode]);

  const createNew = async () => {
    setBusy(true);
    setMessage('');
    try {
      const record = await createRecord(defaultRecordData);
      navigate(`/records/${record.id}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setMessage(`Unable to create record: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const printRecord = async (record: ProviderRecord) => {
    setMessage('');
    try {
      const bundle = await getRecordBundle(record.id);
      const bytes = await generateProviderPdf(bundle);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      win?.addEventListener('load', () => win.print());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to print record.');
    }
  };

  const setApprovalStatus = async (record: ProviderRecord, status: Extract<RecordStatus, 'approved' | 'declined'>) => {
    if (!isAdminMode) return false;

    const previousRecords = records;
    const optimisticUpdatedAt = new Date().toISOString();
    setMessage('');
    setRecords((current) =>
      current.map((item) =>
        item.id === record.id ? { ...item, status, updated_at: optimisticUpdatedAt } : item
      )
    );

    try {
      const updated = await updateRecordStatus(record.id, status);
      setRecords((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      return true;
    } catch (error) {
      setRecords(previousRecords);
      setMessage(error instanceof Error ? error.message : 'Unable to update approval status.');
      return false;
    }
  };

  const openApprovalModal = (record: ProviderRecord) => {
    setApprovalRecord(record);
    setApprovalForm(blankApprovalForm);
    setMessage('');
  };

  const closeApprovalModal = () => {
    if (approvalBusy) return;
    setApprovalRecord(null);
    setApprovalForm(blankApprovalForm);
  };

  const updateApprovalField = (field: keyof ApprovalFormData, value: string) => {
    setApprovalForm((current) => ({ ...current, [field]: value }));
  };

  const finalizeApproval = async (event: FormEvent) => {
    event.preventDefault();
    if (!approvalRecord) return;

    setApprovalBusy(true);
    try {
      const approved = await setApprovalStatus(approvalRecord, 'approved');
      if (approved) {
        saveApprovalData(approvalRecord.id, approvalForm);
        setApprovalRecord(null);
        setApprovalForm(blankApprovalForm);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save approval details.');
    } finally {
      setApprovalBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2">
        <Stat label="Total records" value={records.length} />
        <Stat label="Approved" value={approved} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Provider Records</h1>
            <p className="text-sm text-slate-500">Create, edit, review, and manage PhilHealth PDR submissions.</p>
          </div>
          {!isAdminMode && (
            <button onClick={createNew} disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-phil-600 px-4 py-2 font-semibold text-white disabled:opacity-60 sm:w-auto">
              <FilePlus2 size={18} /> New record
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID, accreditation number" className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 pr-3 dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <button onClick={load} className="min-h-11 rounded-md border border-slate-300 px-4 py-2.5 font-medium dark:border-slate-700">Search</button>
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
                <th className="px-4 py-3">Approval</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const p = record.form_data.personal;
                const isLockedForUser = record.status === 'submitted' || record.status === 'approved' || record.status === 'declined';
                const rowClass = record.status === 'approved'
                  ? 'border-t border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-50'
                  : record.status === 'declined'
                    ? 'border-t border-red-200 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-50'
                    : 'border-t border-slate-200 dark:border-slate-800';
                return (
                  <tr key={record.id} className={rowClass}>
                    <td className="px-4 py-3 font-medium">{[p.lastName, p.firstName].filter(Boolean).join(', ') || 'Untitled draft'}</td>
                    <td className="px-4 py-3 capitalize">{record.form_data.applicationType || 'Draft'}</td>
                    <td className="px-4 py-3 capitalize">{record.status}</td>
                    <td className="px-4 py-3">{new Date(record.updated_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {isAdminMode || isLockedForUser ? (
                          <>
                            <Link to={`/records/${record.id}?mode=view`} className="grid h-9 w-9 place-items-center rounded-md border border-slate-300 bg-white/80 hover:border-phil-600 hover:text-phil-700 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-emerald-500 dark:hover:text-emerald-300" title="View"><Eye size={16} /></Link>
                            <button type="button" onClick={() => printRecord(record)} className="grid h-9 w-9 place-items-center rounded-md border border-slate-300 bg-white/80 hover:border-phil-600 hover:text-phil-700 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-emerald-500 dark:hover:text-emerald-300" title="Print"><Printer size={16} /></button>
                            {isAdminMode && (
                              <button type="button" onClick={() => { deleteRecord(record.id).then(load); }} className="grid h-9 w-9 place-items-center rounded-md border border-red-200 bg-white/80 text-red-600 hover:border-red-400 hover:bg-red-50 dark:border-red-900/70 dark:bg-slate-900/80 dark:text-red-400 dark:hover:bg-red-950/40" title="Delete"><Trash2 size={16} /></button>
                            )}
                          </>
                        ) : (
                          <>
                            <Link to={`/records/${record.id}`} className="grid h-9 w-9 place-items-center rounded-md border border-slate-300 bg-white/80 hover:border-phil-600 hover:text-phil-700 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-emerald-500 dark:hover:text-emerald-300" title="Edit"><Edit size={16} /></Link>
                            <button type="button" onClick={() => { deleteRecord(record.id).then(load); }} className="grid h-9 w-9 place-items-center rounded-md border border-red-200 bg-white/80 text-red-600 hover:border-red-400 hover:bg-red-50 dark:border-red-900/70 dark:bg-slate-900/80 dark:text-red-400 dark:hover:bg-red-950/40" title="Delete"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isAdminMode && record.status === 'submitted' ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openApprovalModal(record)}
                            className="min-h-9 rounded-md border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-slate-900/80 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setApprovalStatus(record, 'declined')}
                            className="min-h-9 rounded-md border border-red-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-red-700 hover:border-red-400 hover:bg-red-100 dark:border-red-900/70 dark:bg-slate-900/80 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            Decline
                          </button>
                        </div>
                      ) : !isAdminMode && record.status === 'submitted' ? (
                        <span className="inline-flex min-h-9 items-center rounded-md border border-amber-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-amber-700 dark:border-amber-900/70 dark:bg-slate-900/80 dark:text-amber-300">
                          Pending Review
                        </span>
                      ) : record.status === 'approved' ? (
                        <span className="inline-flex min-h-9 items-center rounded-md border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:border-emerald-900/70 dark:bg-slate-900/80 dark:text-emerald-300">
                          Approved
                        </span>
                      ) : record.status === 'declined' ? (
                        <span className="inline-flex min-h-9 items-center rounded-md border border-red-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-red-700 dark:border-red-900/70 dark:bg-slate-900/80 dark:text-red-300">
                          Declined
                        </span>
                      ) : (
                        <span className="inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                          For completion
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!records.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">{busy ? 'Loading records...' : 'No records yet.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {approvalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-phil-700 dark:text-emerald-300">For PhilHealth Use Only</p>
                <h2 className="mt-1 text-lg font-semibold text-ink dark:text-slate-100">Approval Review</h2>
                <p className="text-sm text-slate-500">Complete the review details before approving this record.</p>
              </div>
              <button
                type="button"
                onClick={closeApprovalModal}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-700 dark:hover:text-red-400"
                aria-label="Close approval form"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={finalizeApproval} className="min-h-0 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="space-y-5">
                <div className="rounded-lg border border-slate-300 p-4 dark:border-slate-700">
                  <div className="space-y-4">
                    <ApprovalPaperRow
                      title="Date Evaluated"
                      dateValue={approvalForm.dateEvaluated}
                      onDateChange={(value) => updateApprovalField('dateEvaluated', value)}
                      leftFields={[
                        { label: 'LHIO', value: approvalForm.evaluatedLhio, onChange: (value) => updateApprovalField('evaluatedLhio', value) },
                        { label: 'PRO', value: approvalForm.evaluatedPro, onChange: (value) => updateApprovalField('evaluatedPro', value) },
                      ]}
                      rightLabel="By:"
                      rightFields={[
                        { label: 'LHIO', value: approvalForm.evaluatedByLhio, onChange: (value) => updateApprovalField('evaluatedByLhio', value) },
                        { label: 'PRO', value: approvalForm.evaluatedByPro, onChange: (value) => updateApprovalField('evaluatedByPro', value) },
                      ]}
                    />

                    <ApprovalPaperRow
                      title="Date Received"
                      dateValue={approvalForm.dateReceived}
                      onDateChange={(value) => updateApprovalField('dateReceived', value)}
                      leftFields={[
                        { label: 'LHIO', value: approvalForm.receivedLhio, onChange: (value) => updateApprovalField('receivedLhio', value) },
                        { label: 'PRO', value: approvalForm.receivedPro, onChange: (value) => updateApprovalField('receivedPro', value) },
                      ]}
                      rightLabel="By:"
                      rightFields={[
                        { label: 'LHIO', value: approvalForm.receivedByLhio, onChange: (value) => updateApprovalField('receivedByLhio', value) },
                        { label: 'PRO', value: approvalForm.receivedByPro, onChange: (value) => updateApprovalField('receivedByPro', value) },
                      ]}
                    />

                    <ApprovalPaperRow
                      title="Date Encoded"
                      dateValue={approvalForm.dateEncoded}
                      onDateChange={(value) => updateApprovalField('dateEncoded', value)}
                      leftFields={[
                        { label: 'LHIO/PRO (Receiving Module)', value: approvalForm.receivingModule, onChange: (value) => updateApprovalField('receivingModule', value) },
                        { label: 'PRO (Data Entry)', value: approvalForm.dataEntry, onChange: (value) => updateApprovalField('dataEntry', value) },
                      ]}
                      rightLabel="By:"
                      rightFields={[
                        { label: 'LHIO', value: approvalForm.encodedLhio, onChange: (value) => updateApprovalField('encodedLhio', value) },
                        { label: 'PRO', value: approvalForm.encodedPro, onChange: (value) => updateApprovalField('encodedPro', value) },
                      ]}
                    />

                    <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                      <div className="max-w-md">
                        <ApprovalField label="iPAS Generated Control No." value={approvalForm.ipasControlNo} onChange={(value) => updateApprovalField('ipasControlNo', value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 -mx-4 mt-5 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:-mx-5 sm:flex-row sm:justify-end sm:px-5">
                <button
                  type="button"
                  onClick={closeApprovalModal}
                  disabled={approvalBusy}
                  className="min-h-11 rounded-md border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:border-slate-400 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approvalBusy}
                  className="min-h-11 rounded-md bg-phil-600 px-4 py-2.5 font-semibold text-white hover:bg-phil-700 disabled:opacity-60"
                >
                  {approvalBusy ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

interface ApprovalPaperField {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ApprovalPaperRow({
  title,
  dateValue,
  onDateChange,
  leftFields,
  rightFields,
  rightLabel,
}: {
  title: string;
  dateValue: string;
  onDateChange: (value: string) => void;
  leftFields: ApprovalPaperField[];
  rightFields: ApprovalPaperField[];
  rightLabel?: string;
}) {
  return (
    <fieldset className="grid gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800 md:grid-cols-[150px_1fr]">
      <legend className="px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</legend>
      <ApprovalField label={title} type="date" value={dateValue} onChange={onDateChange} />
      <div className="grid gap-3 sm:grid-cols-2">
        <ApprovalFieldGroup fields={leftFields} />
        <div className="space-y-2">
          {rightLabel && <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{rightLabel}</p>}
          <ApprovalFieldGroup fields={rightFields} />
        </div>
      </div>
    </fieldset>
  );
}

function ApprovalFieldGroup({ fields }: { fields: ApprovalPaperField[] }) {
  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      {fields.map((field) => (
        <ApprovalField key={field.label} label={field.label} value={field.value} onChange={field.onChange} />
      ))}
    </div>
  );
}

function ApprovalField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'date' | 'text';
}) {
  return (
    <label className="space-y-1">
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 bg-field px-3 py-2.5 text-sm outline-none transition focus:border-phil-600 focus:ring-2 focus:ring-phil-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>
  );
}
