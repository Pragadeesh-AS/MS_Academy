// When a test can be taken. Stored on the test document:
//   scheduledTime  datetime-local string ("2026-10-02T10:00", local time) - the test opens then
//   closesAt       optional datetime-local string - after this the test can no longer be started
// Students can't start a test before scheduledTime. Tests without a readable scheduledTime
// (very old ones) stay open, as they always were.

const parseLocal = (value) => {
  if (!value || typeof value !== 'string') return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

export const testStartMillis = (test) => parseLocal(test?.scheduledTime);
export const testCloseMillis = (test) => parseLocal(test?.closesAt);

export const AVAILABILITY = { UPCOMING: 'upcoming', OPEN: 'open', CLOSED: 'closed' };

export const testAvailability = (test, now = Date.now()) => {
  const start = testStartMillis(test);
  const close = testCloseMillis(test);
  if (start !== null && now < start) return AVAILABILITY.UPCOMING;
  if (close !== null && now >= close) return AVAILABILITY.CLOSED;
  return AVAILABILITY.OPEN;
};

// Minutes a student starting now gets: the full duration, cut short if the test closes sooner
export const minutesAvailable = (test, now = Date.now()) => {
  const duration = parseInt(test?.duration) || 0;
  const close = testCloseMillis(test);
  if (close === null) return duration;
  return Math.max(0, Math.min(duration, Math.floor((close - now) / 60000)));
};

export const formatTestTime = (ms) => new Date(ms).toLocaleString('en-IN', {
  weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
});

// "2d 4h", "3h 12m", "4m 09s"
export const formatCountdown = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
};

// ms -> "YYYY-MM-DDTHH:mm" in local time, the format <input type="datetime-local"> uses
export const toDateTimeLocal = (ms) => {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Local calendar-day key "YYYY-MM-DD"
export const dayKey = (ms) => toDateTimeLocal(ms).slice(0, 10);

// The time a test occupies on the calendar: start -> start + duration
export const testSlot = (test) => {
  const start = testStartMillis(test);
  if (start === null) return null;
  return { start, end: start + (parseInt(test.duration) || 0) * 60000 };
};

// Other tests for the same department whose slot overlaps this one
export const overlappingTests = (candidate, tests) => {
  const slot = testSlot(candidate);
  if (!slot) return [];
  const dept = (candidate.department || '').trim().toLowerCase();
  return tests.filter(t => {
    if (t.id && t.id === candidate.id) return false;
    if ((t.department || '').trim().toLowerCase() !== dept) return false;
    const other = testSlot(t);
    return other && other.start < slot.end && slot.start < other.end;
  });
};
