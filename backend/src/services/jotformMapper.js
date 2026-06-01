// ============================================================
// backend/src/services/jotformMapper.js
// Maps raw Jotform submission payload and CSV rows to PostgreSQL schema
// ============================================================

const extractFieldsFromPayload = (payload) => {
  const normPayload = {};
  for (const [key, val] of Object.entries(payload)) {
    if (key && val !== undefined && val !== null && val !== '') {
      const cleanKey = key.toLowerCase().trim();
      normPayload[cleanKey] = typeof val === 'string' ? val.trim() : val;
    }
  }

  const findVal = (keywords) => {
    // Look for any key that contains one of the keywords
    for (const kw of keywords) {
      for (const [k, v] of Object.entries(normPayload)) {
        // Strict length limit to avoid matching long question/essay descriptions (e.g., matching "course" inside an essay topic)
        if (k.includes(kw) && k.length < 45) {
          return v;
        }
      }
    }
    return null;
  };

  const findExactVal = (keywords) => {
    for (const kw of keywords) {
      if (normPayload[kw] !== undefined) {
        return normPayload[kw];
      }
    }
    return null;
  };

  // 1. Names
  let firstName = findVal(['first name', 'firstname', 'first_name']);
  if (!firstName) firstName = findVal(['first']);
  
  let lastName = findVal(['last name', 'lastname', 'last_name']);
  if (!lastName) lastName = findVal(['last']);
  
  let middleName = findVal(['middle name', 'middlename', 'middle_name']);
  if (!middleName) middleName = findVal(['middle']);

  // 2. Email
  const email = findExactVal(['email', 'email address', 'email_address']) || findVal(['email']);

  // 3. Course / Program
  // Supports "New Students Course", "Returning Students Course", "Program", "Course", etc.
  const newStudentsCourse = findVal(['new student course', 'new students course', 'new_student_course']);
  const returningStudentsCourse = findVal(['returning student course', 'returning students course', 'returning_student_course']);
  const genericCourse = findVal(['course', 'program']);
  const program = newStudentsCourse || returningStudentsCourse || genericCourse || 'Undeclared';

  // 4. Phone
  let cellPhone = findVal(['cell phone', 'cellphone', 'cell_phone']);
  if (!cellPhone) cellPhone = findVal(['cell']);
  
  const homePhone = findVal(['home phone', 'homephone', 'home_phone']);

  // 5. DOB, Gender, SSN
  let dateOfBirth = findVal(['date of birth', 'date_of_birth', 'dob', 'birthdate', 'birth_date']);
  if (dateOfBirth) {
    const parsedDob = Date.parse(dateOfBirth);
    if (!isNaN(parsedDob)) {
      dateOfBirth = new Date(parsedDob).toISOString().split('T')[0];
    } else {
      dateOfBirth = null;
    }
  }
  const gender = findExactVal(['gender', 'sex']) || findVal(['gender', 'sex']);
  
  let ssnLast4 = null;
  const rawSsn = findVal(['social security', 'ssn', 'social_security']);
  if (rawSsn) {
    const digits = String(rawSsn).replace(/\D/g, '');
    if (digits.length >= 4) {
      ssnLast4 = digits.slice(-4);
    } else if (digits.length > 0) {
      ssnLast4 = digits.padStart(4, '0');
    }
  }

  // 6. Address
  const addressStreet = findVal(['street address', 'street_address', 'address_street']) || findVal(['mailing address', 'mailing_address', 'address_mailing']) || findVal(['address']);
  const addressCity = findVal(['city', 'address_city']);
  const addressState = findVal(['state', 'address_state']);
  const addressZip = findVal(['zip', 'zipcode', 'zip_code', 'address_zip']);

  // 7. Status & Enrollment Date
  const status = findVal(['status', 'student status', 'enrollment status', 'enrollment_status']) || 'Active';
  let enrollmentDate = findVal(['enrollment date', 'enrollment_date']) || findExactVal(['date']) || findVal(['submission date', 'submission_date']);
  if (enrollmentDate) {
    const parsedEnroll = Date.parse(enrollmentDate);
    if (!isNaN(parsedEnroll)) {
      enrollmentDate = new Date(parsedEnroll).toISOString().split('T')[0];
    } else {
      enrollmentDate = new Date().toISOString().split('T')[0];
    }
  } else {
    enrollmentDate = new Date().toISOString().split('T')[0];
  }

  // 8. Emergency Contact
  const emergencyContactName = findVal(['emergency contact name', 'emergency_contact_name', 'emergency name']);
  let emergencyContactPhone = findVal(['emergency contact phone', 'emergency_contact_phone', 'emergency phone']);
  if (!emergencyContactPhone) {
    emergencyContactPhone = findVal(['emergency_contact_phone', 'emergencycontact_phone']);
  }
  const emergencyContactRelation = findVal(['emergency contact relation', 'emergency_contact_relation', 'relationship']);

  // 9. Education
  const highestEducation = findVal(['highest education', 'highest_education', 'degree']);
  const highSchoolName = findVal(['school name', 'high school name', 'high_school_name', 'school/institute/university attended']);
  
  let highSchoolGradYear = null;
  const rawHsYear = findVal(['grad year', 'graduation year', 'year of graduation', 'high_school_grad_year']);
  if (rawHsYear) {
    highSchoolGradYear = parseInt(String(rawHsYear).replace(/\D/g, '')) || null;
  }
  
  const parseBool = (v) => {
    if (!v) return false;
    const l = String(v).toLowerCase();
    return l === 'true' || l === 'yes' || l === '1' || l === 'y';
  };
  const gedCertificate = parseBool(findVal(['ged', 'ged_certificate']));

  // 10. Employment
  const currentlyEmployed = parseBool(findVal(['employed', 'currently_employed']));
  const employerName = findVal(['employer name', 'employer_name']);
  const employerPhone = findVal(['employer phone', 'employer_phone']);

  // 11. Funding
  const fundingSource = findVal(['funding source', 'funding_source']);
  const financialAidStatus = findVal(['financial aid', 'financial_aid_status']);
  const scholarship = parseBool(findVal(['scholarship']));
  const scholarshipName = findVal(['scholarship name', 'scholarship_name']);

  // 12. Notes & Documents
  const adminNotes = findVal(['notes', 'admin notes', 'admin_notes', 'intake notes', 'intake_notes']);
  
  // Extract all drive and Jotform links
  const driveLinks = [];
  let photoUrl = null;
  for (const [k, v] of Object.entries(normPayload)) {
    if (v && typeof v === 'string') {
      const parts = v.split(',').map(p => p.trim());
      for (const p of parts) {
        if (p.includes('drive.google.com') || p.includes('bit.ly/') || p.includes('jotform.com/uploads/') || p.includes('jotform.com/signed/')) {
          const isPhoto = p.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/);
          const isSignature = p.toLowerCase().includes('signature');
          if (isPhoto && !isSignature && !photoUrl) {
            photoUrl = p;
          } else {
            driveLinks.push(p);
          }
        }
      }
    }
  }
  const driveLink = driveLinks.length > 0 ? driveLinks.join(', ') : null;

  return {
    first_name: firstName,
    last_name: lastName,
    middle_name: middleName,
    email,
    cell_phone: cellPhone,
    home_phone: homePhone,
    date_of_birth: dateOfBirth,
    gender,
    ssn_last4: ssnLast4,
    address_street: addressStreet,
    address_city: addressCity,
    address_state: addressState,
    address_zip: addressZip,
    program,
    status,
    enrollment_date: enrollmentDate,
    emergency_contact_name: emergencyContactName,
    emergency_contact_phone: emergencyContactPhone,
    emergency_contact_relation: emergencyContactRelation,
    highest_education: highestEducation,
    high_school_name: highSchoolName,
    high_school_grad_year: highSchoolGradYear,
    ged_certificate: gedCertificate,
    currently_employed: currentlyEmployed,
    employer_name: employerName,
    employer_phone: employerPhone,
    funding_source: fundingSource,
    financial_aid_status: financialAidStatus,
    scholarship,
    scholarship_name: scholarshipName,
    admin_notes: adminNotes,
    drive_link: driveLink,
    photo_url: photoUrl,
    raw_jotform_payload: payload
  };
};

const mapJotformToStudent = (payload) => {
  let parsedPayload = { ...payload };
  if (payload.rawRequest) {
    try {
      const parsedRaw = typeof payload.rawRequest === 'string'
        ? JSON.parse(payload.rawRequest)
        : payload.rawRequest;
      parsedPayload = { ...parsedPayload, ...parsedRaw };
    } catch (e) {
      console.warn('⚠️ Failed to parse rawRequest JSON in Jotform webhook:', e.message);
    }
  }
  
  const student = extractFieldsFromPayload(parsedPayload);
  
  // Make sure to add Jotform specific metadata
  student.jotform_submission_id = payload.submissionID || payload.submission_id || null;
  student.jotform_submission_date = new Date().toISOString();
  student.intake_source = 'jotform';
  
  return student;
};

module.exports = { mapJotformToStudent, extractFieldsFromPayload };
