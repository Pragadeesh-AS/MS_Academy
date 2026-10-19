import React from 'react';
import { X, Check } from 'lucide-react';

// Access control for a test / note / recording: the department default, free, or any number of
// specific bundles. value / onChange use { mode: 'default' | 'free' | 'bundles', ids } (see utils/bundleAccess).
export function BundleAccessPicker({ bundles = [], value, onChange, allowFree = false, defaultLabel = 'Requires Department Bundle (Default)' }) {
  const access = value || { mode: 'default', ids: [] };
  const modes = [
    { key: 'default', label: defaultLabel },
    ...(allowFree ? [{ key: 'free', label: 'Free for Everyone' }] : []),
    { key: 'bundles', label: 'Specific Bundles' },
  ];
  const toggle = (id) => onChange({
    mode: 'bundles',
    ids: access.ids.includes(id) ? access.ids.filter(x => x !== id) : [...access.ids, id],
  });

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-2">
        {modes.map(m => (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange({ mode: m.key, ids: m.key === 'bundles' ? access.ids : [] })}
            className={`px-3 py-2 rounded-xl border text-[12.5px] font-bold transition-all text-left ${access.mode === m.key ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {access.mode === 'bundles' && (
        bundles.length === 0 ? (
          <p className="text-[12.5px] font-semibold text-slate-500">No bundles have been created yet.</p>
        ) : (
          <div className="space-y-1.5">
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
              {bundles.map(b => {
                const checked = access.ids.includes(b.id);
                return (
                  <label key={b.id} className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(b.id)} className="w-4 h-4 accent-indigo-600 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="block text-[13px] font-bold text-slate-800 truncate">{b.name}</span>
                        {b.isHidden && (
                          <span className="shrink-0 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Offline Only
                          </span>
                        )}
                      </div>
                      {b.department && <span className="block text-[11px] font-semibold text-slate-400 truncate">{b.department}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className={`text-[12px] font-semibold ${access.ids.length ? 'text-slate-500' : 'text-amber-600'}`}>
              {access.ids.length
                ? `Students who bought any of these ${access.ids.length} bundle${access.ids.length === 1 ? '' : 's'} get access.`
                : 'Tick at least one bundle - with none ticked the default access is used.'}
            </p>
          </div>
        )
      )}
    </div>
  );
}

// Small dialog around the picker, for changing access on something already saved
export function BundleAccessModal({ title = 'Edit Access Control', subtitle, bundles, value, onChange, onSave, onClose, saving = false, allowFree, defaultLabel }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-[900] text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 font-semibold mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <BundleAccessPicker bundles={bundles} value={value} onChange={onChange} allowFree={allowFree} defaultLabel={defaultLabel} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm">Cancel</button>
            <button type="button" onClick={onSave} disabled={saving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-md text-sm flex items-center gap-2">
              <Check size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
