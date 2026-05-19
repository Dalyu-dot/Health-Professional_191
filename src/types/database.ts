export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = 'admin' | 'provider';
export type RecordStatus = 'draft' | 'submitted' | 'archived';

export interface ProviderRecordData {
  classification: {
    generalPractitioner: boolean;
    gpWithTraining: boolean;
    gpTrainingDetails: string;
    medicalSpecialist: boolean;
    medicalSpecialty: string;
    primaryCarePhysician: boolean;
    generalDentist: boolean;
    dentalSpecialist: boolean;
    dentalSpecialty: string;
    midwife: boolean;
    nurse: boolean;
    others: boolean;
    othersText: string;
  };
  applicationType: 'initial' | 'renewal' | 'reaccreditation' | '';
  profileUpdate: {
    civilStatus: boolean;
    name: boolean;
    affiliations: boolean;
    familyPlanningTraining: boolean;
    others: boolean;
    othersText: string;
  };
  personal: {
    lastName: string;
    firstName: string;
    middleName: string;
    nameExtension: string;
    noMiddleName: boolean;
    mothersMaidenName: string;
    spouseName: string;
    sex: '' | 'male' | 'female';
    civilStatus: string;
    birthdate: string;
    email: string;
    landline: string;
    mobile: string;
    mailingAddress: string;
    cityMunicipality: string;
    province: string;
    zipCode: string;
    contactNumber: string;
    philsysNumber: string;
    tin: string;
    philhealthId: string;
    accreditationNumber: string;
  };
  education: {
    collegeUniversity: string;
    yearGraduated: string;
    prcNumber: string;
    dateIssued: string;
    validUpTo: string;
  };
  declaration: {
    signedDate: string;
  };
}

export interface ResidencyTraining {
  id?: string;
  health_facility_name: string;
  address: string;
  year_started: string;
  year_ended: string;
}

export interface HospitalAffiliation {
  id?: string;
  hospital_clinic_name: string;
  address: string;
}

export interface ProfileUpdateDetail {
  id?: string;
  checked?: boolean;
  update_type: string;
  from_value: string;
  to_value: string;
}

export interface ProviderRecord {
  id: string;
  user_id: string;
  status: RecordStatus;
  form_data: ProviderRecordData;
  passport_photo_url: string | null;
  signature_url: string | null;
  pdf_url: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface RecordBundle {
  record: ProviderRecord;
  trainings: ResidencyTraining[];
  affiliations: HospitalAffiliation[];
  profileUpdates: ProfileUpdateDetail[];
}

export interface AppUserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}
