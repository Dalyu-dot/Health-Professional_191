import { ArrowLeft, Download, Plus, Printer, Save, Send, Trash2 } from 'lucide-react';
import { Dispatch, FormEvent, SetStateAction, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckboxField, Section, SelectField, TextField } from '../components/form/Fields';
import { PhotoUpload } from '../components/form/PhotoUpload';
import { SignaturePad } from '../components/form/SignaturePad';
import { blankAffiliation, blankProfileUpdate, blankResidencyTraining, defaultRecordData, profileUpdateTypes } from '../lib/formDefaults';
import { createLocalRecord, getLocalRecordBundle, replaceLocalChildren, updateLocalRecord } from '../lib/localRecords';
import { generateProviderPdf } from '../lib/pdf';
import type { HospitalAffiliation, ProfileUpdateDetail, ProviderRecord, ProviderRecordData, ResidencyTraining } from '../types/database';

export function ProviderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [record, setRecord] = useState<ProviderRecord | null>(null);
  const [form, setForm] = useState<ProviderRecordData>(defaultRecordData);
  const [trainings, setTrainings] = useState<ResidencyTraining[]>([blankResidencyTraining()]);
  const [affiliations, setAffiliations] = useState<HospitalAffiliation[]>([blankAffiliation()]);
  const [updates, setUpdates] = useState<ProfileUpdateDetail[]>(profileUpdateTypes.map(blankProfileUpdate));
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!id || id === 'new') return;
    setBusy(true);
    try {
      const bundle = getLocalRecordBundle(id);
      setRecord(bundle.record);
      setForm(bundle.record.form_data);
      setTrainings(bundle.trainings.length ? bundle.trainings : [blankResidencyTraining()]);
      setAffiliations(bundle.affiliations.length ? bundle.affiliations : [blankAffiliation()]);
      setUpdates(bundle.profileUpdates.length ? bundle.profileUpdates : profileUpdateTypes.map(blankProfileUpdate));
      setPhoto(bundle.record.passport_photo_url);
      setSignature(bundle.record.signature_url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load record.');
    } finally {
      setBusy(false);
    }
  }, [id]);

  useEffect(() => {
    if (!record) return;
    const timer = window.setTimeout(() => save('draft', true), 1200);
    return () => window.clearTimeout(timer);
  }, [form, trainings, affiliations, updates]);

  const setNested = <K extends keyof Omit<ProviderRecordData, 'applicationType'>, F extends keyof ProviderRecordData[K]>(section: K, field: F, value: ProviderRecordData[K][F]) => {
    setForm((current) => ({ ...current, [section]: { ...(current[section] as object), [field]: value } }) as ProviderRecordData);
  };

  const setClassificationChecked = (field: keyof ProviderRecordData['classification'], checked: boolean) => {
    setForm((current) => {
      const next = { ...current.classification, [field]: checked };
      if (field === 'gpWithTraining' && !checked) next.gpTrainingDetails = '';
      if (field === 'medicalSpecialist' && !checked) next.medicalSpecialty = '';
      if (field === 'dentalSpecialist' && !checked) next.dentalSpecialty = '';
      if (field === 'others' && !checked) next.othersText = '';
      return { ...current, classification: next };
    });
  };

  const digitsOnly = (value: string, maxLength: number) => value.replace(/\D/g, '').slice(0, maxLength);
  const isInitialApplication = form.applicationType === 'initial';
  const accreditationRequired = !isInitialApplication;

  const validateForm = () => {
    const current = formRef.current;
    if (!current) return true;
    const valid = current.reportValidity();
    if (!valid) setMessage('Please complete all required fields before continuing.');
    return valid;
  };

  const save = async (status: 'draft' | 'submitted' = 'draft', silent = false) => {
    if (!silent && !validateForm()) return null;
    setBusy(true);
    try {
      let current = record;
      if (!current) current = createLocalRecord(form);
      const saved = updateLocalRecord(current.id, form, status, { passport_photo_url: photo, signature_url: signature });
      replaceLocalChildren(saved.id, trainings, affiliations, updates);
      setRecord(saved);
      if (!silent) setMessage(status === 'submitted' ? 'Record marked submitted locally.' : 'Draft saved locally.');
      if (!id || id === 'new') navigate(`/records/${saved.id}`, { replace: true });
      return saved;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save record.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await save('submitted');
  };

  const exportPdf = async (print = false) => {
    if (!validateForm()) return;
    const current = await save('draft', true);
    if (!current) return;
    const bundle = getLocalRecordBundle(current.id);
    const bytes = await generateProviderPdf({ ...bundle, record: { ...bundle.record, form_data: form, passport_photo_url: photo, signature_url: signature } });
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    if (print) {
      const win = window.open(url, '_blank');
      win?.addEventListener('load', () => win.print());
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = `philhealth-provider-data-record-${current.id}.pdf`;
      a.click();
    }
  };

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-phil-700 dark:text-emerald-300"><ArrowLeft size={16} /> Dashboard</Link>
          <h1 className="mt-2 text-xl font-semibold">PhilHealth Provider Data Record</h1>
          <p className="text-sm text-slate-500">{busy ? 'Saving changes...' : 'Autosaves drafts locally in this browser.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => save('draft')} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 py-2 font-medium dark:border-slate-700"><Save size={18} /> Save</button>
          <button type="button" onClick={() => exportPdf()} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 py-2 font-medium dark:border-slate-700"><Download size={18} /> PDF</button>
          <button type="button" onClick={() => exportPdf(true)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 py-2 font-medium dark:border-slate-700"><Printer size={18} /> Print</button>
          <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-phil-600 px-4 py-2 font-semibold text-white"><Send size={18} /> Submit</button>
        </div>
      </div>
      {message && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      <Section title="1. Classification">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CheckboxField label="General Practitioner (GP)" checked={form.classification.generalPractitioner} onChange={(v) => setNested('classification', 'generalPractitioner', v)} />
          <CheckboxField label="GP w/ Training" checked={form.classification.gpWithTraining} onChange={(v) => setClassificationChecked('gpWithTraining', v)} />
          <CheckboxField label="Medical Specialist" checked={form.classification.medicalSpecialist} onChange={(v) => setClassificationChecked('medicalSpecialist', v)} />
          <CheckboxField label="Primary Care Physician (Konsulta Provider)" checked={form.classification.primaryCarePhysician} onChange={(v) => setNested('classification', 'primaryCarePhysician', v)} />
          <CheckboxField label="General Dentist" checked={form.classification.generalDentist} onChange={(v) => setNested('classification', 'generalDentist', v)} />
          <CheckboxField label="Dental Specialist" checked={form.classification.dentalSpecialist} onChange={(v) => setClassificationChecked('dentalSpecialist', v)} />
          <CheckboxField label="Midwife" checked={form.classification.midwife} onChange={(v) => setNested('classification', 'midwife', v)} />
          <CheckboxField label="Nurse" checked={form.classification.nurse} onChange={(v) => setNested('classification', 'nurse', v)} />
          <CheckboxField label="Others" checked={form.classification.others} onChange={(v) => setClassificationChecked('others', v)} />
        </div>
        {(form.classification.gpWithTraining || form.classification.medicalSpecialist || form.classification.dentalSpecialist || form.classification.others) && (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {form.classification.gpWithTraining && <TextField label="Training:" required value={form.classification.gpTrainingDetails} onChange={(v) => setNested('classification', 'gpTrainingDetails', v)} />}
            {form.classification.medicalSpecialist && <TextField label="Medical specialty" required value={form.classification.medicalSpecialty} onChange={(v) => setNested('classification', 'medicalSpecialty', v)} />}
            {form.classification.dentalSpecialist && <TextField label="Dental specialty" required value={form.classification.dentalSpecialty} onChange={(v) => setNested('classification', 'dentalSpecialty', v)} />}
            {form.classification.others && <TextField label="Others, specify" required value={form.classification.othersText} onChange={(v) => setNested('classification', 'othersText', v)} />}
          </div>
        )}
      </Section>

      <Section title="2. Type of Application">
        <SelectField label="Application type" required value={form.applicationType} onChange={(v) => setForm((f) => ({ ...f, applicationType: v as ProviderRecordData['applicationType'], personal: { ...f.personal, accreditationNumber: v === 'initial' ? '' : f.personal.accreditationNumber } }))} options={[{ label: 'Initial', value: 'initial' }, { label: 'Renewal', value: 'renewal' }, { label: 'Re-accreditation', value: 'reaccreditation' }]} />
      </Section>

      <Section title="3. Profile Update">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CheckboxField label="Update of civil status" checked={form.profileUpdate.civilStatus} onChange={(v) => setNested('profileUpdate', 'civilStatus', v)} />
          <CheckboxField label="Update of name" checked={form.profileUpdate.name} onChange={(v) => setNested('profileUpdate', 'name', v)} />
          <CheckboxField label="Update of health facility affiliations" checked={form.profileUpdate.affiliations} onChange={(v) => setNested('profileUpdate', 'affiliations', v)} />
          <CheckboxField label="Update of Family Planning Training" checked={form.profileUpdate.familyPlanningTraining} onChange={(v) => setNested('profileUpdate', 'familyPlanningTraining', v)} />
          <CheckboxField label="Others" checked={form.profileUpdate.others} onChange={(v) => setNested('profileUpdate', 'others', v)} />
        </div>
        {form.profileUpdate.others && <TextField className="mt-4" label="Others, specify" required value={form.profileUpdate.othersText} onChange={(v) => setNested('profileUpdate', 'othersText', v)} />}
      </Section>

      <Section title="4. Personal Information">
        {/* Photo sits at top-right on large screens, stacks above fields on mobile */}
        <div className="flex flex-col gap-4 lg:flex-row-reverse lg:items-start">
          <div className="flex justify-center lg:justify-end lg:shrink-0">
            <PhotoUpload value={photo} onChange={setPhoto} />
          </div>
          <div className="min-w-0 flex-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Name row */}
            <TextField label="Last Name" required value={form.personal.lastName} onChange={(v) => setNested('personal', 'lastName', v)} />
            <TextField label="First Name" required value={form.personal.firstName} onChange={(v) => setNested('personal', 'firstName', v)} />
            <div className="grid gap-1">
              <TextField label="Middle Name" required={!form.personal.noMiddleName} value={form.personal.middleName} onChange={(v) => setNested('personal', 'middleName', v)} />
              <CheckboxField label="No Middle Name" checked={form.personal.noMiddleName} onChange={(v) => setNested('personal', 'noMiddleName', v)} />
            </div>
            <TextField label="Name Extension (Jr., Sr., etc.)" value={form.personal.nameExtension} onChange={(v) => setNested('personal', 'nameExtension', v)} />
            <TextField label="Mother's Maiden Name" required value={form.personal.mothersMaidenName} onChange={(v) => setNested('personal', 'mothersMaidenName', v)} />
            <TextField label="Spouse Name (if married)" value={form.personal.spouseName} onChange={(v) => setNested('personal', 'spouseName', v)} />
            {/* Demographics */}
            <SelectField label="Sex" required value={form.personal.sex} onChange={(v) => setNested('personal', 'sex', v as ProviderRecordData['personal']['sex'])} options={[{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }]} />
            <TextField label="Civil Status" required value={form.personal.civilStatus} onChange={(v) => setNested('personal', 'civilStatus', v)} />
            <TextField label="Birthdate" required type="date" value={form.personal.birthdate} onChange={(v) => setNested('personal', 'birthdate', v)} />
            {/* Contact */}
            <TextField label="Email Address" required type="email" value={form.personal.email} onChange={(v) => setNested('personal', 'email', v)} />
            <TextField label="Landline Number" value={form.personal.landline} onChange={(v) => setNested('personal', 'landline', v)} />
            <TextField label="Mobile Number" required value={form.personal.mobile} onChange={(v) => setNested('personal', 'mobile', v)} />
            <TextField label="Contact Number" value={form.personal.contactNumber} onChange={(v) => setNested('personal', 'contactNumber', v)} />
            {/* Address */}
            <TextField label="Mailing / Billing Address" required className="sm:col-span-2" value={form.personal.mailingAddress} onChange={(v) => setNested('personal', 'mailingAddress', v)} />
            <TextField label="City / Municipality" required value={form.personal.cityMunicipality} onChange={(v) => setNested('personal', 'cityMunicipality', v)} />
            <TextField label="Province" required value={form.personal.province} onChange={(v) => setNested('personal', 'province', v)} />
            <TextField label="Zip Code" required value={form.personal.zipCode} onChange={(v) => setNested('personal', 'zipCode', v)} />
            {/* IDs */}
            <TextField label="PhilSys Number" required value={form.personal.philsysNumber} onChange={(v) => setNested('personal', 'philsysNumber', digitsOnly(v, 16))} minLength={16} maxLength={16} pattern="\d{16}" inputMode="numeric" title="PhilSys Number must contain exactly 16 digits." />
            <TextField label="Tax Identification Number (TIN)" required value={form.personal.tin} onChange={(v) => setNested('personal', 'tin', v)} />
            <TextField label="PhilHealth Identification Number" required value={form.personal.philhealthId} onChange={(v) => setNested('personal', 'philhealthId', digitsOnly(v, 12))} minLength={12} maxLength={12} pattern="\d{12}" inputMode="numeric" title="PhilHealth Identification Number must contain exactly 12 digits." />
            {/* Accreditation */}
            <div className="sm:col-span-2 lg:col-span-3 rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-2 bg-slate-50 dark:bg-slate-800/40">
              <CheckboxField label="Initial application / accreditation number not applicable" checked={isInitialApplication} onChange={(checked) => setForm((f) => ({ ...f, applicationType: checked ? 'initial' : '', personal: { ...f.personal, accreditationNumber: checked ? '' : f.personal.accreditationNumber } }))} />
              <TextField label="PhilHealth Accreditation Number" required={accreditationRequired} value={form.personal.accreditationNumber} onChange={(v) => setNested('personal', 'accreditationNumber', v)} />
            </div>
          </div>
        </div>
      </Section>

      <Section title="5. Education & License">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <TextField label="College/University" required value={form.education.collegeUniversity} onChange={(v) => setNested('education', 'collegeUniversity', v)} />
          <TextField label="Year Graduated" required value={form.education.yearGraduated} onChange={(v) => setNested('education', 'yearGraduated', v)} />
          <TextField label="PRC Number" required value={form.education.prcNumber} onChange={(v) => setNested('education', 'prcNumber', v)} />
          <TextField label="Date Issued" required type="date" value={form.education.dateIssued} onChange={(v) => setNested('education', 'dateIssued', v)} />
          <TextField label="Valid Up To" required type="date" value={form.education.validUpTo} onChange={(v) => setNested('education', 'validUpTo', v)} />
        </div>
      </Section>

      <DynamicRows title="6. Residency Training" rows={trainings} setRows={setTrainings} blank={blankResidencyTraining} required fields={[['health_facility_name', 'Health Facility Name'], ['address', 'Address'], ['year_started', 'Year Started'], ['year_ended', 'Year Ended']]} />
      <DynamicRows title="7. Hospital/Clinic Affiliations" rows={affiliations} setRows={setAffiliations} blank={blankAffiliation} required fields={[['hospital_clinic_name', 'Hospital/Clinic/Retailer Name'], ['address', 'Address']]} />
      <ProfileUpdateDetails rows={updates} setRows={setUpdates} />

      <Section title="9. Declaration & Signature">
        <div className="grid gap-4 lg:grid-cols-2">
          <SignaturePad value={signature} onChange={setSignature} />
          <TextField label="Date" type="date" required value={form.declaration.signedDate} onChange={(v) => setNested('declaration', 'signedDate', v)} />
        </div>
      </Section>
    </form>
  );
}

function DynamicRows<T extends object>({
  title,
  rows,
  setRows,
  blank,
  fields,
  required = false
}: {
  title: string;
  rows: T[];
  setRows: Dispatch<SetStateAction<T[]>>;
  blank: () => T;
  fields: [keyof T, string][];
  required?: boolean;
}) {
  return (
    <Section title={title}>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800 md:grid-cols-[1fr_auto]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {fields.map(([field, label]) => (
                <TextField key={String(field)} label={label} required={required} value={String(row[field] ?? '')} onChange={(value) => setRows(rows.map((item, i) => (i === index ? { ...item, [field]: value } : item)))} />
              ))}
            </div>
            <button type="button" onClick={() => setRows(rows.filter((_row, i) => i !== index))} className="grid h-10 w-10 place-items-center rounded-md border border-red-200 text-red-600" title="Remove row">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setRows([...rows, blank()])} className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium dark:border-slate-700">
        <Plus size={16} /> Add row
      </button>
    </Section>
  );
}

function ProfileUpdateDetails({
  rows,
  setRows
}: {
  rows: ProfileUpdateDetail[];
  setRows: Dispatch<SetStateAction<ProfileUpdateDetail[]>>;
}) {
  const updateRow = (index: number, changes: Partial<ProfileUpdateDetail>) => {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...changes } : row)));
  };

  const toggleRow = (index: number, checked: boolean) => {
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        return checked
          ? { ...row, checked: true }
          : { ...row, checked: false, from_value: '', to_value: '', update_type: row.update_type.toLowerCase().includes('other') ? 'Others' : row.update_type };
      })
    );
  };

  return (
    <Section title="8. Profile Update Details">
      <div className="space-y-3">
        {rows.map((row, index) => {
          const checked = Boolean(row.checked);
          const isOther = row.update_type.toLowerCase().includes('other');

          return (
            <div key={`${row.update_type}-${index}`} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <CheckboxField label={row.update_type || 'Others'} checked={checked} onChange={(value) => toggleRow(index, value)} />
              {checked && (
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {isOther && <TextField label="Others, specify" required value={row.update_type === 'Others' ? '' : row.update_type} onChange={(value) => updateRow(index, { update_type: value || 'Others' })} />}
                  <TextField label="FROM" required value={row.from_value} onChange={(value) => updateRow(index, { from_value: value })} />
                  <TextField label="TO" required value={row.to_value} onChange={(value) => updateRow(index, { to_value: value })} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
