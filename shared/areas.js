// Delivery areas. The shop owner can edit both lists in Admin > Settings; these are the starting lists.
export const HANDOFF_DEF = ['Salamina (Σαλαμίνα)', 'Athens (Αθήνα)'];
export const COURIER_DEF = [
  'Salamina (Σαλαμίνα)', 'Athens (Αθήνα)', 'Piraeus (Πειραιάς)', 'Glyfada (Γλυφάδα)', 'Marousi (Μαρούσι)',
  'Elefsina (Ελευσίνα)', 'Aspropyrgos (Ασπρόπυργος)', 'Megara (Μέγαρα)', 'Nea Peramos (Νέα Πέραμος)',
  'Agioi Theodoroi (Άγιοι Θεόδωροι)', 'Loutraki (Λουτράκι)', 'Corinth (Κόρινθος)', 'Aegina (Αίγινα)',
  'Lavrio (Λαύριο)', 'Thiva (Θήβα)', 'Aliartos (Αλίαρτος)',
];
export const parseAreas = (v, def) => {
  const a = String(v || '').split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
  return a.length ? a : def;
};
