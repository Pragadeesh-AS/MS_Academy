import { Target, BookOpen, Trophy, Layers } from 'lucide-react';

// Look of each template folder (Topic / Subject / Full Length / Other). Class names are written out
// in full so Tailwind keeps them in the build. Used by the admin Tests Manager and the student Tests page;
// each entry also works as a FolderCard palette (badge / glow / ring / text / soft).
export const TEMPLATE_META = {
  topic: { icon: Target, short: 'Topic', badge: 'from-blue-500 to-indigo-600', bar: 'bg-blue-500', soft: 'bg-blue-50 border-blue-100', num: 'text-blue-700', text: 'text-blue-600', glow: 'group-hover:shadow-blue-500/15', ring: 'group-hover:border-blue-300' },
  subject: { icon: BookOpen, short: 'Subject', badge: 'from-violet-500 to-purple-600', bar: 'bg-violet-500', soft: 'bg-violet-50 border-violet-100', num: 'text-violet-700', text: 'text-violet-600', glow: 'group-hover:shadow-violet-500/15', ring: 'group-hover:border-violet-300' },
  full: { icon: Trophy, short: 'Full', badge: 'from-amber-500 to-orange-600', bar: 'bg-amber-500', soft: 'bg-amber-50 border-amber-100', num: 'text-amber-700', text: 'text-amber-600', glow: 'group-hover:shadow-amber-500/15', ring: 'group-hover:border-amber-300' },
  other: { icon: Layers, short: 'Other', badge: 'from-slate-400 to-slate-600', bar: 'bg-slate-400', soft: 'bg-slate-50 border-slate-200', num: 'text-slate-700', text: 'text-slate-600', glow: 'group-hover:shadow-slate-500/15', ring: 'group-hover:border-slate-300' },
};
