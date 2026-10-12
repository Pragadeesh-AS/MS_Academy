// Dates on folder cards: newest createdAt among items, shown as "12 Oct 2026"
export const latestOf = (items) => items.reduce((m, x) => Math.max(m, x.createdAt?.toMillis?.() || 0), 0);
export const formatDay = (ms) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
