import { PDFDocument, PDFImage, StandardFonts, rgb } from 'pdf-lib';
import type { RecordBundle } from '../types/database';

const TEMPLATE_PATH = '/philhealth-pdr-template.pdf';

export async function generateProviderPdf(bundle: RecordBundle) {
  const templateBytes = await fetch(TEMPLATE_PATH).then((response) => {
    if (!response.ok) throw new Error('Official PhilHealth PDF template was not found.');
    return response.arrayBuffer();
  });

  const pdf = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const form = pdf.getForm();

  // Debug: log all form fields with their types and positions
  try {
    form.getFields().forEach((field) => {
      const widgets = field.acroField.getWidgets();
      widgets.forEach((w) => {
        const r = w.getRectangle();
        console.log(`[pdf field] type=${field.constructor.name} name="${field.getName()}" x=${r.x.toFixed(1)} y=${r.y.toFixed(1)} w=${r.width.toFixed(1)} h=${r.height.toFixed(1)}`);
      });
    });
  } catch (e) {
    console.warn('[pdf] field dump failed', e);
  }
  const { record, trainings, affiliations, profileUpdates } = bundle;
  const data = record.form_data;
  const p = data.personal;

  const text = (name: string, value: string | null | undefined, size = 8) => {
    try {
      const field = form.getTextField(name);
      field.setText(toUpper(value));
      field.setFontSize(size);
    } catch {
      // Missing template fields should not block the rest of the export.
    }
  };

  const page = pdf.getPage(0);

  // Build position map using pdf-lib's own widget API (same method that works for text fields)
  const checkboxPositions = new Map<string, { pageIndex: number; x: number; y: number; w: number; h: number }>();
  try {
    form.getFields().forEach((field) => {
      field.acroField.getWidgets().forEach((widget) => {
        const r = widget.getRectangle();
        // Find which page this widget is on
        let pageIndex = 0;
        pdf.getPages().forEach((pg, idx) => {
          try {
            const annots = pg.node.Annots();
            if (!annots) return;
            for (let i = 0; i < annots.size(); i++) {
              if (annots.lookup(i) === widget.dict) { pageIndex = idx; }
            }
          } catch { /* skip */ }
        });
        checkboxPositions.set(field.getName(), { pageIndex, x: r.x, y: r.y, w: r.width, h: r.height });
      });
    });
  } catch (e) {
    console.warn('[pdf] position map failed', e);
  }

  const check = (name: string, value: boolean) => {
    try {
      const field = form.getCheckBox(name);
      if (value) field.check();
      else field.uncheck();
    } catch { /* skip */ }

    if (!value) return;

    const pos = checkboxPositions.get(name);
    if (pos) {
      const targetPage = pdf.getPage(pos.pageIndex);
      const size = Math.min(pos.w, pos.h) * 0.75;
      targetPage.drawText('X', {
        x: pos.x + (pos.w - size * 0.55) / 2,
        y: pos.y + (pos.h - size) / 2,
        size,
        font,
        color: rgb(0, 0, 0),
      });
    } else {
      console.warn(`[pdf] no position for: ${name}`);
    }
  };

  const split = (names: string[], value: string | null | undefined) => {
    cleanCode(value)
      .slice(0, names.length)
      .split('')
      .forEach((char, index) => text(names[index], char, 9));
  };

  split(
    ['text_2njwj', 'text_3ejti', 'text_4wkga', 'text_5eikx', 'text_6upva', 'text_7yrxs', 'text_8smtx', 'text_9mowk', 'text_10seqr', 'text_11czmz', 'text_12ieys', 'text_13wzlb'],
    p.accreditationNumber
  );
  split(
    ['text_14oggb', 'text_15vyop', 'text_16ezjk', 'text_17wjqx', 'text_18vicf', 'text_19uckw', 'text_20onau', 'text_21iwhj', 'text_22hggh', 'text_23nfli', 'text_24lkfb', 'text_25cmyc', 'text_26khtc', 'text_27zoyq', 'text_28loxx', 'text_29jntc'],
    p.philsysNumber
  );
  text('text_30pbna', p.tin, 8);
  split(
    ['text_31lonh', 'text_32xls', 'text_33iwun', 'text_34wybv', 'text_35hvbd', 'text_36lgxp', 'text_37apyi', 'text_38ffhu', 'text_39iihx', 'text_40toyg', 'text_41ibvp', 'text_42qjmb'],
    p.philhealthId
  );

  check('checkbox_43zv', data.classification.generalPractitioner);
  check('checkbox_44bauv', data.classification.gpWithTraining);
  check('checkbox_45knxa', data.classification.medicalSpecialist);
  check('checkbox_46fqnl', data.classification.primaryCarePhysician);
  check('checkbox_47gbp', data.classification.generalDentist);
  check('checkbox_48nrot', data.classification.dentalSpecialist);
  check('checkbox_49vogs', data.classification.midwife);
  check('checkbox_50tyrb', data.classification.nurse);
  check('checkbox_51mdpy', data.classification.others);
  text('text_74mbsi', data.classification.gpWithTraining ? data.classification.gpTrainingDetails : '', 7);
  text('text_75tzkd', data.classification.medicalSpecialist ? data.classification.medicalSpecialty : '', 7);
  text('text_76oyib', data.classification.dentalSpecialist ? data.classification.dentalSpecialty : '', 7);
  text('text_77blvj', data.classification.others ? data.classification.othersText : '', 7);

  check('checkbox_52tvp', data.applicationType === 'initial');
  check('checkbox_53xvie', data.applicationType === 'renewal');
  check('checkbox_54yokg', data.applicationType === 'reaccreditation');

  check('checkbox_55zgak', data.profileUpdate.civilStatus);
  check('checkbox_56weno', data.profileUpdate.name);
  check('checkbox_57kede', data.profileUpdate.affiliations);
  check('checkbox_58eliq', data.profileUpdate.familyPlanningTraining);
  check('checkbox_59aq', data.profileUpdate.others);
  text('text_80dkab', data.profileUpdate.othersText, 7);

  text('text_81rmkl', p.lastName);
  text('text_84pppj', p.firstName);
  text('text_87yfbc', p.nameExtension, 6);
  text('text_90half', p.middleName);
  check('checkbox_93fnoe', p.noMiddleName);
  text('text_82ueee', p.mothersMaidenName);
  check('checkbox_94qczx', false);
  text('text_83ysij', p.spouseName);
  check('checkbox_95zrhd', false);

  check('checkbox_60newa', p.sex === 'male');
  check('checkbox_61odiv', p.sex === 'female');
  const civil = p.civilStatus.toLowerCase();
  check('checkbox_62knie', civil.includes('single'));
  check('checkbox_63zdgh', civil.includes('married'));
  check('checkbox_64dmrx', civil.includes('widow'));
  check('checkbox_65iog', civil.includes('annul'));
  check('checkbox_66jcio', civil.includes('separated'));

  split(['text_96knot', 'text_97pggs', 'text_98zmtx', 'text_99aufm', 'text_100sbrl', 'text_101oras', 'text_102zwnb', 'text_103kfes'], dateDigits(p.birthdate));
  text('text_104ocge', p.email, 7);
  text('text_105ynu', p.landline, 7);
  text('text_106engf', p.mobile, 7);
  text('text_107csli', p.mailingAddress, 7);
  text('text_110bgoj', p.cityMunicipality, 7);
  text('text_108qqpy', p.province, 7);
  text('text_111vvfv', p.zipCode, 7);
  text('text_112ltct', p.contactNumber, 7);

  text('text_113yvin', data.education.collegeUniversity, 8);
  text('text_114uwos', data.education.yearGraduated, 8);
  text('text_115mfce', data.education.prcNumber, 8);
  text('text_116sxuy', dateSlashes(data.education.dateIssued), 8);
  text('text_117uunn', dateSlashes(data.education.validUpTo), 8);

  const training = trainings[0];
  text('text_118untp', training?.health_facility_name, 7);
  text('textarea_119vjbi', training?.address, 7);
  text('text_120fxgr', training?.year_started, 7);
  text('text_121mcgv', training?.year_ended, 7);

  const affiliationNames = ['text_123dhqm', 'text_124tnkt', 'text_125mben', 'text_126dfuh', 'text_127rage'];
  const affiliationAddresses = ['text_129lfmi', 'text_130vefh', 'text_131dgui', 'text_132wvc', 'text_133yxdd'];
  affiliations.slice(0, 5).forEach((row, index) => {
    text(affiliationNames[index], row.hospital_clinic_name, 7);
    text(affiliationAddresses[index], row.address, 7);
  });

  const updateRows = [
    { check: 'checkbox_67uvip', from: 'text_136zukt', to: 'text_143immj', match: /name/i },
    { check: 'checkbox_68kdxb', from: 'text_137xgir', to: 'text_144fuy', match: /upgrading|downgrading/i },
    { check: 'checkbox_69xmvx', from: 'text_138cgof', to: 'text_145mqza', match: /dob|birth/i },
    { check: 'checkbox_70ywov', from: 'text_139ggeg', to: 'text_146gflk', match: /sex/i },
    { check: 'checkbox_71mlev', from: 'text_140kywg', to: 'text_147wfmp', match: /civil/i },
    { check: 'checkbox_72ndzm', from: 'text_141lqvp', to: 'text_148mrov', match: /contact|address|phone|mobile|email/i },
    { check: 'checkbox_73zhqg', from: 'text_142nqa', to: 'text_149tkkq', match: /other/i }
  ];
  updateRows.forEach((target) => {
    const row = profileUpdates.find((item) => item.checked && target.match.test(item.update_type));
    check(target.check, Boolean(row));
    text(target.from, row?.from_value ?? '', 7);
    text(target.to, row?.to_value ?? '', 7);
  });
  const otherUpdate = profileUpdates.find((item) => item.checked && /other/i.test(item.update_type));
  text('text_150rgwm', otherUpdate?.update_type.replace(/^others?:?\s*/i, '') ?? '', 7);

  text('text_151gbqs', fullName(p), 8);
  text('text_152nela', dateSlashes(data.declaration.signedDate), 8);

  form.updateFieldAppearances(font);
  form.flatten();

  await drawImageFromUrl(pdf, 0, record.passport_photo_url, { x: 489, y: 627, width: 99, height: 128, mode: 'cover' });
  await drawImageFromUrl(pdf, 1, record.signature_url, { x: 92, y: 235, width: 287, height: 35, mode: 'contain' });

  return pdf.save();
}

function toUpper(value: string | null | undefined) {
  return String(value ?? '').toUpperCase();
}

function cleanCode(value: string | null | undefined) {
  return toUpper(value).replace(/[^A-Z0-9]/g, '');
}

function dateDigits(value: string | null | undefined) {
  return dateSlashes(value).replace(/\D/g, '');
}

function dateSlashes(value: string | null | undefined) {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${match[2]}/${match[3]}/${match[1]}`;
}

function fullName(personal: RecordBundle['record']['form_data']['personal']) {
  return [personal.firstName, personal.middleName, personal.lastName, personal.nameExtension].filter(Boolean).join(' ');
}

async function drawImageFromUrl(
  pdf: PDFDocument,
  pageIndex: number,
  url: string | null,
  box: { x: number; y: number; width: number; height: number; mode: 'cover' | 'contain' }
) {
  if (!url) return;

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const bytes = await blob.arrayBuffer();
    const image = await embedImage(pdf, bytes, blob.type, url);
    const page = pdf.getPage(pageIndex);
    const dims = fitImage(image, box);
    page.drawImage(image, dims);
  } catch {
    // The official template still exports even if a signed image URL has expired.
  }
}

async function embedImage(pdf: PDFDocument, bytes: ArrayBuffer, contentType: string, url: string) {
  if (contentType.includes('png') || url.startsWith('data:image/png') || url.toLowerCase().includes('.png')) {
    return pdf.embedPng(bytes);
  }
  return pdf.embedJpg(bytes);
}

function fitImage(image: PDFImage, box: { x: number; y: number; width: number; height: number; mode: 'cover' | 'contain' }) {
  const imageRatio = image.width / image.height;
  const boxRatio = box.width / box.height;
  let width = box.width;
  let height = box.height;

  if (box.mode === 'contain') {
    if (imageRatio > boxRatio) height = width / imageRatio;
    else width = height * imageRatio;
  }

  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height
  };
}
