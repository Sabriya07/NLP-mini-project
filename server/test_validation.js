function normalizeString(value = '') {
  return String(value || '').trim()
}

function normalizePersonalInfo(payload = {}) {
  return {
    full_name: normalizeString(payload.full_name),
    email: normalizeString(payload.email),
    phone: normalizeString(payload.phone),
    city: normalizeString(payload.city),
  }
}

function validateProfile({ personalInfo, employmentHistory, education, skills, career_objective }) {
  if (!personalInfo.full_name || !personalInfo.email || !personalInfo.phone || !personalInfo.city) {
    return 'All personal information fields are required.'
  }
  return null
}

const payload = {
  full_name: 'John',
  email: 'john@test.com',
  phone: '123',
  city: ' ' // space
}

const normalized = normalizePersonalInfo(payload);
console.log("normalized:", normalized);
console.log("validation:", validateProfile({ personalInfo: normalized }));
