// Mirrors frontend/src/constants/departments.js. Kept as a separate copy (not a shared
// package) since frontend and backend are independently deployed here -- same reasoning
// the rest of this repo already applies (see render.yaml's two independent services).
const DEPARTMENTS = [
  'Anatomy',
  'Anesthesiology',
  'Biochemistry',
  'Community Medicine',
  'Dermatology, Venereology & Leprosy',
  'Emergency Medicine',
  'ENT',
  'Forensic Medicine',
  'General Medicine',
  'General Surgery',
  'Microbiology',
  'OBG',
  'Ophthalmology (Eye)',
  'Orthopaedics',
  'Otorhinolaryngology (ENT)',
  'Paediatrics',
  'Pathology',
  'Pharmacology',
  'Physiology',
  'Psychiatry',
  'Radiation Oncology',
  'Radio-diagnosis (Radiology)',
  'Respiratory Medicine',
];

module.exports = { DEPARTMENTS };
