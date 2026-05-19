import type { HospitalAffiliation, ProfileUpdateDetail, ProviderRecordData, ResidencyTraining } from '../types/database';

export const defaultRecordData: ProviderRecordData = {
  classification: {
    generalPractitioner: false,
    gpWithTraining: false,
    gpTrainingDetails: '',
    medicalSpecialist: false,
    medicalSpecialty: '',
    primaryCarePhysician: false,
    generalDentist: false,
    dentalSpecialist: false,
    dentalSpecialty: '',
    midwife: false,
    nurse: false,
    others: false,
    othersText: ''
  },
  applicationType: '',
  profileUpdate: {
    civilStatus: false,
    name: false,
    affiliations: false,
    familyPlanningTraining: false,
    others: false,
    othersText: ''
  },
  personal: {
    lastName: '',
    firstName: '',
    middleName: '',
    nameExtension: '',
    noMiddleName: false,
    mothersMaidenName: '',
    mothersFirstName: '',
    mothersMiddleName: '',
    noMotherMiddleName: false,
    spouseName: '',
    spouseFirstName: '',
    spouseMiddleName: '',
    noSpouseMiddleName: false,
    sex: '',
    civilStatus: '',
    birthdate: '',
    email: '',
    landline: '',
    mobile: '',
    mailingAddress: '',
    cityMunicipality: '',
    province: '',
    zipCode: '',
    contactNumber: '',
    philsysNumber: '',
    tin: '',
    philhealthId: '',
    accreditationNumber: ''
  },
  education: {
    collegeUniversity: '',
    yearGraduated: '',
    prcNumber: '',
    dateIssued: '',
    validUpTo: ''
  },
  declaration: {
    signedDate: ''
  }
};

export const blankResidencyTraining = (): ResidencyTraining => ({
  health_facility_name: '',
  address: '',
  year_started: '',
  year_ended: ''
});

export const blankAffiliation = (): HospitalAffiliation => ({
  hospital_clinic_name: '',
  address: ''
});

export const blankProfileUpdate = (update_type = ''): ProfileUpdateDetail => ({
  checked: false,
  update_type,
  from_value: '',
  to_value: ''
});

export const profileUpdateTypes = [
  'Name changes',
  'Upgrading/Downgrading',
  'Correction of DOB',
  'Correction of Sex',
  'Change of Civil Status',
  'Updating contact information',
  'Others'
];
