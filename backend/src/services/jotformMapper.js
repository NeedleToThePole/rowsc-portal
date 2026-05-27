// ============================================================
// backend/src/services/jotformMapper.js
// Maps raw Jotform submission payload to PostgreSQL schema
// ============================================================

/**
 * Jotform sends fields as:
 *   q1_firstName, q2_lastName, q3_email, etc.
 * The exact field IDs depend on your form configuration.
 * Update the mapping keys below to match YOUR Jotform field names.
 * All unmapped fields are stored in raw_jotform_payload (JSONB).
 */

const mapJotformToStudent = (payload) => {
  // Helper: safely extract a value, return null if missing
  const get = (key) => {
    const val = payload[key];
    if (val === undefined || val === null || val === '') return null;
    return String(val).trim();
  };

  // Helper: parse boolean from "Yes"/"No" strings
  const bool = (key) => {
    const val = get(key);
    if (!val) return null;
    return val.toLowerCase() === 'yes' || val === '1' || val === 'true';
  };

  // Helper: parse date or return null
  const date = (key) => {
    const val = get(key);
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  };

  return {
    // ── Core Identity ───────────────────────────────────────
    first_name:                 get('q3_firstName')   || get('q1_name')       || get('firstName'),
    last_name:                  get('q3_lastName')    || get('q2_name')       || get('lastName'),
    middle_name:                get('q4_middleName')  || get('middleName'),
    email:                      get('q5_email')       || get('email'),
    cell_phone:                 get('q6_cellPhone')   || get('cellPhone')     || get('phone'),
    home_phone:                 get('q7_homePhone')   || get('homePhone'),
    date_of_birth:              date('q8_dob')        || date('dateOfBirth'),
    gender:                     get('q9_gender')      || get('gender'),
    ssn_last4:                  get('q10_ssnLast4')   || get('ssnLast4'),

    // ── Address ─────────────────────────────────────────────
    address_street:             get('q11_address')    || get('address[addr_line1]'),
    address_city:               get('q12_city')       || get('address[city]'),
    address_state:              get('q13_state')      || get('address[state]'),
    address_zip:                get('q14_zip')        || get('address[postal]'),

    // ── Program Enrollment ──────────────────────────────────
    program:                    get('q15_program')    || get('program')       || 'Undeclared',
    program_category:           get('q16_programCategory') || get('programCategory'),
    start_date:                 date('q17_startDate') || date('startDate'),
    expected_graduation_date:   date('q18_gradDate')  || date('expectedGraduationDate'),

    // ── Emergency Contact ───────────────────────────────────
    emergency_contact_name:     get('q19_emergencyName')    || get('emergencyContactName'),
    emergency_contact_phone:    get('q20_emergencyPhone')   || get('emergencyContactPhone'),
    emergency_contact_relation: get('q21_emergencyRelation')|| get('emergencyContactRelation'),

    // ── Education Background ────────────────────────────────
    highest_education:          get('q22_education')    || get('highestEducation'),
    high_school_name:           get('q23_hsName')       || get('highSchoolName'),
    high_school_grad_year:      parseInt(get('q24_hsYear') || get('highSchoolGradYear')) || null,
    ged_certificate:            bool('q25_ged')         || bool('gedCertificate'),

    // ── Employment ──────────────────────────────────────────
    currently_employed:         bool('q26_employed')    || bool('currentlyEmployed'),
    employer_name:              get('q27_employer')     || get('employerName'),
    employer_phone:             get('q28_employerPhone')|| get('employerPhone'),

    // ── Financial Aid ───────────────────────────────────────
    funding_source:             get('q29_funding')       || get('fundingSource'),
    financial_aid_status:       get('q30_finAid')        || get('financialAidStatus'),
    scholarship:                bool('q31_scholarship')  || bool('scholarship'),
    scholarship_name:           get('q32_scholarName')   || get('scholarshipName'),

    // ── WIOA Fields ─────────────────────────────────────────
    wioa_enrolled:              bool('q33_wioa')          || bool('wioaEnrolled'),
    wioa_participant_id:        get('q34_wioaId')         || get('wioaParticipantId'),
    wioa_case_manager:          get('q35_caseManager')    || get('wioaCaseManager'),
    veteran_status:             bool('q36_veteran')       || bool('veteranStatus'),
    disability_status:          bool('q37_disability')    || bool('disabilityStatus'),
    homeless_status:            bool('q38_homeless')      || bool('homelessStatus'),
    ex_offender_status:         bool('q39_exOffender')    || bool('exOffenderStatus'),
    snap_recipient:             bool('q40_snap')          || bool('snapRecipient'),
    tanf_recipient:             bool('q41_tanf')          || bool('tanfRecipient'),

    // ── Compliance ──────────────────────────────────────────
    hipaa_signed:               bool('q42_hipaa')          || bool('hipaaSigned'),
    enrollment_agreement_signed:bool('q43_enrollAgree')    || bool('enrollmentAgreementSigned'),

    // ── Jotform Meta ────────────────────────────────────────
    jotform_submission_id:      get('submissionID') || get('submission_id'),
    jotform_submission_date:    new Date().toISOString(),
    intake_source:              'jotform',

    // ── Notes ───────────────────────────────────────────────
    intake_notes:               get('q44_notes') || get('additionalNotes'),

    // ── Raw payload stored as JSONB ─────────────────────────
    raw_jotform_payload:        payload,
  };
};

module.exports = { mapJotformToStudent };
