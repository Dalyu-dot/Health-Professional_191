import { supabase } from './supabase';
import { blankAffiliation, blankProfileUpdate, blankResidencyTraining, defaultRecordData, profileUpdateTypes } from './formDefaults';
import type {
  HospitalAffiliation,
  ProfileUpdateDetail,
  ProviderRecord,
  ProviderRecordData,
  RecordBundle,
  RecordStatus,
  ResidencyTraining,
} from '../types/database';

// ── helpers ──────────────────────────────────────────────────────────────────

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated.');
  return data.user.id;
}

// ── photo / signature upload ──────────────────────────────────────────────────

/** Uploads a base64 data-URL to Supabase Storage and returns the public URL. */
async function uploadAsset(dataUrl: string, bucket: string, path: string): Promise<string> {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const ext = mime.split('/')[1] ?? 'jpg';
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const filePath = `${path}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, bytes, {
    contentType: mime,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

async function resolveAssetUrl(
  value: string | null,
  bucket: string,
  path: string
): Promise<string | null> {
  if (!value) return null;
  // Already a remote URL — no need to re-upload
  if (value.startsWith('http')) return value;
  // base64 data URL — upload it
  return uploadAsset(value, bucket, path);
}

// ── records ───────────────────────────────────────────────────────────────────

export async function listRecords(search = ''): Promise<ProviderRecord[]> {
  let query = supabase
    .from('provider_records')
    .select('*')
    .eq('user_id', await currentUserId())
    .order('updated_at', { ascending: false });

  if (search.trim()) {
    // Full-text search on the JSONB form_data column via ilike on cast
    query = query.ilike('form_data->>personal', `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProviderRecord[];
}

export async function createRecord(formData: ProviderRecordData = defaultRecordData): Promise<ProviderRecord> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('provider_records')
    .insert({
      user_id: userId,
      status: 'draft',
      form_data: formData,
      version: 1,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ProviderRecord;
}

export async function getRecordBundle(id: string): Promise<RecordBundle> {
  const [recordRes, trainingsRes, affiliationsRes, updatesRes] = await Promise.all([
    supabase.from('provider_records').select('*').eq('id', id).single(),
    supabase.from('residency_trainings').select('*').eq('record_id', id),
    supabase.from('hospital_affiliations').select('*').eq('record_id', id),
    supabase.from('profile_update_details').select('*').eq('record_id', id),
  ]);

  if (recordRes.error) throw recordRes.error;

  return {
    record: recordRes.data as ProviderRecord,
    trainings: (trainingsRes.data ?? [blankResidencyTraining()]) as ResidencyTraining[],
    affiliations: (affiliationsRes.data ?? [blankAffiliation()]) as HospitalAffiliation[],
    profileUpdates: (updatesRes.data?.length ? updatesRes.data : profileUpdateTypes.map(blankProfileUpdate)) as ProfileUpdateDetail[],
  };
}

export async function updateRecord(
  id: string,
  formData: ProviderRecordData,
  status: RecordStatus,
  assets: { passport_photo_url?: string | null; signature_url?: string | null } = {}
): Promise<ProviderRecord> {
  const photoUrl = await resolveAssetUrl(assets.passport_photo_url ?? null, 'photos', `${id}/photo`);
  const signatureUrl = await resolveAssetUrl(assets.signature_url ?? null, 'signatures', `${id}/signature`);

  const { data, error } = await supabase
    .from('provider_records')
    .update({
      form_data: formData,
      status,
      passport_photo_url: photoUrl,
      signature_url: signatureUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ProviderRecord;
}

export async function updateRecordStatus(id: string, status: RecordStatus): Promise<ProviderRecord> {
  const { data, error } = await supabase
    .from('provider_records')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ProviderRecord;
}

export async function replaceChildren(
  recordId: string,
  trainings: ResidencyTraining[],
  affiliations: HospitalAffiliation[],
  profileUpdates: ProfileUpdateDetail[]
): Promise<void> {
  const [t, a, p] = await Promise.all([
    supabase.from('residency_trainings').delete().eq('record_id', recordId),
    supabase.from('hospital_affiliations').delete().eq('record_id', recordId),
    supabase.from('profile_update_details').delete().eq('record_id', recordId),
  ]);
  if (t.error) { console.error('DELETE residency_trainings:', t.error); throw new Error(`residency_trainings delete: ${t.error.message}`); }
  if (a.error) { console.error('DELETE hospital_affiliations:', a.error); throw new Error(`hospital_affiliations delete: ${a.error.message}`); }
  if (p.error) { console.error('DELETE profile_update_details:', p.error); throw new Error(`profile_update_details delete: ${p.error.message}`); }

  const insertTrainings = trainings.map(({ id: _id, ...rest }) => ({ ...rest, record_id: recordId }));
  const insertAffiliations = affiliations.map(({ id: _id, ...rest }) => ({ ...rest, record_id: recordId }));
  const insertUpdates = profileUpdates.map(({ id: _id, ...rest }) => ({ ...rest, record_id: recordId }));

  const [ti, ai, pi] = await Promise.all([
    insertTrainings.length ? supabase.from('residency_trainings').insert(insertTrainings) : Promise.resolve({ error: null }),
    insertAffiliations.length ? supabase.from('hospital_affiliations').insert(insertAffiliations) : Promise.resolve({ error: null }),
    insertUpdates.length ? supabase.from('profile_update_details').insert(insertUpdates) : Promise.resolve({ error: null }),
  ]);
  if (ti.error) { console.error('INSERT residency_trainings:', ti.error); throw new Error(`residency_trainings insert: ${ti.error.message}`); }
  if (ai.error) { console.error('INSERT hospital_affiliations:', ai.error); throw new Error(`hospital_affiliations insert: ${ai.error.message}`); }
  if (pi.error) { console.error('INSERT profile_update_details:', pi.error); throw new Error(`profile_update_details insert: ${pi.error.message}`); }
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase.from('provider_records').delete().eq('id', id);
  if (error) throw error;
}
