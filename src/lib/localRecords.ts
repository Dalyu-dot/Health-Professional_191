import { blankAffiliation, blankProfileUpdate, blankResidencyTraining, defaultRecordData, profileUpdateTypes } from './formDefaults';
import type {
  HospitalAffiliation,
  ProfileUpdateDetail,
  ProviderRecord,
  ProviderRecordData,
  RecordStatus,
  ResidencyTraining
} from '../types/database';
import type { RecordBundle } from '../types/database';

const STORAGE_KEY = 'philhealth-pdr-local-records-v1';
const LOCAL_USER_ID = 'local-user';

interface LocalRecordBundle {
  record: ProviderRecord;
  trainings: ResidencyTraining[];
  affiliations: HospitalAffiliation[];
  profileUpdates: ProfileUpdateDetail[];
}

function readStore(): LocalRecordBundle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalRecordBundle[]) : [];
  } catch {
    return [];
  }
}

function writeStore(records: LocalRecordBundle[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function makeRecord(formData: ProviderRecordData): ProviderRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    status: 'draft',
    form_data: formData,
    passport_photo_url: null,
    signature_url: null,
    pdf_url: null,
    version: 1,
    created_at: now,
    updated_at: now
  };
}

export function listLocalRecords(search = '') {
  const term = search.trim().toLowerCase();
  return readStore()
    .map((bundle) => bundle.record)
    .filter((record) => {
      if (!term) return true;
      const p = record.form_data.personal;
      return [p.lastName, p.firstName, p.philhealthId, p.accreditationNumber].join(' ').toLowerCase().includes(term);
    })
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function createLocalRecord(formData: ProviderRecordData = defaultRecordData) {
  const record = makeRecord(structuredClone(formData));
  const bundle: LocalRecordBundle = {
    record,
    trainings: [blankResidencyTraining()],
    affiliations: [blankAffiliation()],
    profileUpdates: profileUpdateTypes.map(blankProfileUpdate)
  };
  writeStore([bundle, ...readStore()]);
  return record;
}

export function getLocalRecordBundle(id: string): RecordBundle {
  const bundle = readStore().find((item) => item.record.id === id);
  if (!bundle) throw new Error('Local record was not found.');
  return bundle;
}

export function updateLocalRecord(
  id: string,
  formData: ProviderRecordData,
  status: RecordStatus,
  assets: Partial<Pick<ProviderRecord, 'passport_photo_url' | 'signature_url' | 'pdf_url'>> = {}
) {
  const records = readStore();
  const index = records.findIndex((item) => item.record.id === id);
  if (index === -1) throw new Error('Local record was not found.');
  const current = records[index].record;
  const next: ProviderRecord = {
    ...current,
    form_data: structuredClone(formData),
    status,
    ...assets,
    version: current.version + 1,
    updated_at: new Date().toISOString()
  };
  records[index] = { ...records[index], record: next };
  writeStore(records);
  return next;
}

export function replaceLocalChildren(
  recordId: string,
  trainings: ResidencyTraining[],
  affiliations: HospitalAffiliation[],
  profileUpdates: ProfileUpdateDetail[]
) {
  const records = readStore();
  const index = records.findIndex((item) => item.record.id === recordId);
  if (index === -1) throw new Error('Local record was not found.');
  records[index] = {
    ...records[index],
    trainings: structuredClone(trainings),
    affiliations: structuredClone(affiliations),
    profileUpdates: structuredClone(profileUpdates)
  };
  writeStore(records);
}

export function deleteLocalRecord(id: string) {
  writeStore(readStore().filter((item) => item.record.id !== id));
}
