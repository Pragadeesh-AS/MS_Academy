import { canonicalDepartment, isCommonDeptName } from './subjects';

// Fixed colour of every department on the admin folder cards (Question Bank, Tests Manager).
// Keyed by the department's code, so every spelling of a department ("MECHANICAL ENGINEERING",
// "Mechanical (ME)", "ME") gets the same colour. Class names are written out in full so Tailwind
// keeps them in the build.
export const DEPARTMENT_PALETTES = {
  CSE: { badge: 'from-blue-500 to-indigo-600', glow: 'group-hover:shadow-blue-500/15', ring: 'group-hover:border-blue-300', text: 'text-blue-600', soft: 'bg-blue-50 text-blue-700 border-blue-100', mark: 'text-blue-500/[0.08]' }, // Computer Science
  ECE: { badge: 'from-emerald-500 to-teal-600', glow: 'group-hover:shadow-emerald-500/15', ring: 'group-hover:border-emerald-300', text: 'text-emerald-600', soft: 'bg-emerald-50 text-emerald-700 border-emerald-100', mark: 'text-emerald-500/[0.08]' }, // Electronics
  ME: { badge: 'from-orange-500 to-red-600', glow: 'group-hover:shadow-orange-500/15', ring: 'group-hover:border-orange-300', text: 'text-orange-600', soft: 'bg-orange-50 text-orange-700 border-orange-100', mark: 'text-orange-500/[0.08]' }, // Mechanical
  CE: { badge: 'from-yellow-500 to-amber-600', glow: 'group-hover:shadow-yellow-500/15', ring: 'group-hover:border-yellow-300', text: 'text-yellow-600', soft: 'bg-yellow-50 text-yellow-700 border-yellow-100', mark: 'text-yellow-500/[0.08]' }, // Civil
  EE: { badge: 'from-violet-500 to-purple-600', glow: 'group-hover:shadow-violet-500/15', ring: 'group-hover:border-violet-300', text: 'text-violet-600', soft: 'bg-violet-50 text-violet-700 border-violet-100', mark: 'text-violet-500/[0.08]' }, // Electrical
  DS: { badge: 'from-fuchsia-500 to-pink-600', glow: 'group-hover:shadow-fuchsia-500/15', ring: 'group-hover:border-fuchsia-300', text: 'text-fuchsia-600', soft: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100', mark: 'text-fuchsia-500/[0.08]' }, // Data Science & AI
  PI: { badge: 'from-rose-500 to-red-600', glow: 'group-hover:shadow-rose-500/15', ring: 'group-hover:border-rose-300', text: 'text-rose-600', soft: 'bg-rose-50 text-rose-700 border-rose-100', mark: 'text-rose-500/[0.08]' }, // Production & Industrial
  IN: { badge: 'from-teal-500 to-cyan-600', glow: 'group-hover:shadow-teal-500/15', ring: 'group-hover:border-teal-300', text: 'text-teal-600', soft: 'bg-teal-50 text-teal-700 border-teal-100', mark: 'text-teal-500/[0.08]' }, // Instrumentation
  BT: { badge: 'from-lime-500 to-green-600', glow: 'group-hover:shadow-lime-500/15', ring: 'group-hover:border-lime-300', text: 'text-lime-600', soft: 'bg-lime-50 text-lime-700 border-lime-100', mark: 'text-lime-500/[0.08]' }, // Biotechnology
  CH: { badge: 'from-cyan-500 to-sky-600', glow: 'group-hover:shadow-cyan-500/15', ring: 'group-hover:border-cyan-300', text: 'text-cyan-600', soft: 'bg-cyan-50 text-cyan-700 border-cyan-100', mark: 'text-cyan-500/[0.08]' }, // Chemical
  BM: { badge: 'from-pink-500 to-rose-600', glow: 'group-hover:shadow-pink-500/15', ring: 'group-hover:border-pink-300', text: 'text-pink-600', soft: 'bg-pink-50 text-pink-700 border-pink-100', mark: 'text-pink-500/[0.08]' }, // Biomedical
  PH: { badge: 'from-indigo-500 to-violet-600', glow: 'group-hover:shadow-indigo-500/15', ring: 'group-hover:border-indigo-300', text: 'text-indigo-600', soft: 'bg-indigo-50 text-indigo-700 border-indigo-100', mark: 'text-indigo-500/[0.08]' }, // Physics
  AR: { badge: 'from-red-500 to-rose-600', glow: 'group-hover:shadow-red-500/15', ring: 'group-hover:border-red-300', text: 'text-red-600', soft: 'bg-red-50 text-red-700 border-red-100', mark: 'text-red-500/[0.08]' }, // Architecture & Planning
  AG: { badge: 'from-green-500 to-emerald-600', glow: 'group-hover:shadow-green-500/15', ring: 'group-hover:border-green-300', text: 'text-green-600', soft: 'bg-green-50 text-green-700 border-green-100', mark: 'text-green-500/[0.08]' }, // Agricultural
  MT: { badge: 'from-stone-500 to-zinc-600', glow: 'group-hover:shadow-stone-500/15', ring: 'group-hover:border-stone-300', text: 'text-stone-600', soft: 'bg-stone-50 text-stone-700 border-stone-100', mark: 'text-stone-500/[0.08]' }, // Metallurgical
  ES: { badge: 'from-sky-500 to-cyan-600', glow: 'group-hover:shadow-sky-500/15', ring: 'group-hover:border-sky-300', text: 'text-sky-600', soft: 'bg-sky-50 text-sky-700 border-sky-100', mark: 'text-sky-500/[0.08]' }, // Environmental Science
  XL: { badge: 'from-purple-500 to-fuchsia-600', glow: 'group-hover:shadow-purple-500/15', ring: 'group-hover:border-purple-300', text: 'text-purple-600', soft: 'bg-purple-50 text-purple-700 border-purple-100', mark: 'text-purple-500/[0.08]' }, // Life Sciences
  AE: { badge: 'from-slate-500 to-blue-600', glow: 'group-hover:shadow-slate-500/15', ring: 'group-hover:border-slate-300', text: 'text-slate-600', soft: 'bg-slate-50 text-slate-700 border-slate-100', mark: 'text-slate-500/[0.08]' }, // Aerospace
  MATHS: { badge: 'from-sky-500 to-indigo-600', glow: 'group-hover:shadow-sky-500/15', ring: 'group-hover:border-sky-300', text: 'text-sky-600', soft: 'bg-sky-50 text-sky-700 border-sky-100', mark: 'text-sky-500/[0.08]' }, // Engineering Mathematics
  APTITUDE: { badge: 'from-amber-500 to-orange-600', glow: 'group-hover:shadow-amber-500/15', ring: 'group-hover:border-amber-300', text: 'text-amber-600', soft: 'bg-amber-50 text-amber-700 border-amber-100', mark: 'text-amber-500/[0.08]' }, // Aptitude
};

// Code of a department name: "(ME)" after canonicalDepartment, or MATHS / APTITUDE for the shared banks
export const departmentCode = (name) => {
  const n = (name || '').trim();
  if (isCommonDeptName(n)) return /ap+titude/i.test(n) ? 'APTITUDE' : 'MATHS';
  const canonical = canonicalDepartment(n);
  return ((canonical.match(/\(([^)]+)\)/) || [])[1] || canonical).trim().toUpperCase();
};

// The department's fixed palette, or null for a department that isn't in the list
export const departmentPalette = (name) => DEPARTMENT_PALETTES[departmentCode(name)] || null;

// Accent for a department missing from utils/departmentColors, picked from its name so it keeps
// its colour between visits.
// Class names are written out in full so Tailwind keeps them in the build.
const PALETTES = [
  { badge: 'from-blue-500 to-indigo-600', glow: 'group-hover:shadow-blue-500/15', ring: 'group-hover:border-blue-300', text: 'text-blue-600', soft: 'bg-blue-50 text-blue-700 border-blue-100', mark: 'text-blue-500/[0.07]' },
  { badge: 'from-emerald-500 to-teal-600', glow: 'group-hover:shadow-emerald-500/15', ring: 'group-hover:border-emerald-300', text: 'text-emerald-600', soft: 'bg-emerald-50 text-emerald-700 border-emerald-100', mark: 'text-emerald-500/[0.07]' },
  { badge: 'from-amber-500 to-orange-600', glow: 'group-hover:shadow-amber-500/15', ring: 'group-hover:border-amber-300', text: 'text-amber-600', soft: 'bg-amber-50 text-amber-700 border-amber-100', mark: 'text-amber-500/[0.08]' },
  { badge: 'from-rose-500 to-pink-600', glow: 'group-hover:shadow-rose-500/15', ring: 'group-hover:border-rose-300', text: 'text-rose-600', soft: 'bg-rose-50 text-rose-700 border-rose-100', mark: 'text-rose-500/[0.07]' },
  { badge: 'from-violet-500 to-purple-600', glow: 'group-hover:shadow-violet-500/15', ring: 'group-hover:border-violet-300', text: 'text-violet-600', soft: 'bg-violet-50 text-violet-700 border-violet-100', mark: 'text-violet-500/[0.07]' },
  { badge: 'from-cyan-500 to-sky-600', glow: 'group-hover:shadow-cyan-500/15', ring: 'group-hover:border-cyan-300', text: 'text-cyan-600', soft: 'bg-cyan-50 text-cyan-700 border-cyan-100', mark: 'text-cyan-500/[0.08]' },
  { badge: 'from-fuchsia-500 to-purple-600', glow: 'group-hover:shadow-fuchsia-500/15', ring: 'group-hover:border-fuchsia-300', text: 'text-fuchsia-600', soft: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100', mark: 'text-fuchsia-500/[0.07]' },
  { badge: 'from-lime-500 to-green-600', glow: 'group-hover:shadow-lime-500/15', ring: 'group-hover:border-lime-300', text: 'text-lime-700', soft: 'bg-lime-50 text-lime-800 border-lime-100', mark: 'text-lime-600/[0.08]' },
];
export const NEUTRAL = { badge: 'from-slate-400 to-slate-600', glow: 'group-hover:shadow-slate-500/15', ring: 'group-hover:border-slate-300', text: 'text-slate-600', soft: 'bg-slate-50 text-slate-700 border-slate-200', mark: 'text-slate-500/[0.07]' };

// Every known department has a fixed colour (utils/departmentColors); others get one from their name
export const paletteFor = (name) => {
  const fixed = departmentPalette(name);
  if (fixed) return fixed;
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTES[h % PALETTES.length];
};

// Short badge text: "(ME)" in the name, a short all-caps name as is, else the initials
export const monogramOf = (name) => {
  const paren = String(name).match(/\(([A-Za-z&]{1,4})\)/);
  if (paren) return paren[1].toUpperCase();
  const clean = String(name).trim();
  if (/^[A-Z&]{2,4}$/.test(clean)) return clean;
  const words = clean.split(/[\s/-]+/).filter(w => w && !/^(and|of|&|the)$/i.test(w));
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
};
