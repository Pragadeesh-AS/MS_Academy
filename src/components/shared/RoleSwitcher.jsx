import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Check, ChevronUp } from 'lucide-react';
import { ROLE_META, getStoredRoles, getActiveRoleKey, switchToRole } from '../../utils/roles';

// Lets a user who has been assigned more than one role (e.g. teacher + typist,
// or typist + reviewer) jump straight to their other dashboard(s) without
// signing out and back in. Shown as one compact button naming the dashboard
// that is open right now; it opens a small menu listing every dashboard, with
// the current one marked, so the sidebar doesn't grow with each extra role.
// Renders nothing when the signed-in email only holds a single role.
export default function RoleSwitcher({ collapsed = false, dark = false, onNavigate }) {
  const navigate = useNavigate();
  // Typist and Reviewer share one route, so switching between them doesn't remount this
  // component - re-read the active role whenever switchToRole() announces a change.
  const [activeKey, setActiveKey] = useState(getActiveRoleKey);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const sync = () => setActiveKey(getActiveRoleKey());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  // Close the menu on an outside click or Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const roles = getStoredRoles();
  if (roles.length < 2 || !roles.some(r => r.role !== activeKey)) return null;

  const handleSwitch = (descriptor) => {
    setOpen(false);
    switchToRole(descriptor, navigate);
    setActiveKey(descriptor.role);
    if (onNavigate) onNavigate();
  };

  const currentLabel = ROLE_META[activeKey]?.label || activeKey;

  const triggerClass = dark
    ? `border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800/60 ${open ? 'bg-slate-800/60 text-white' : ''}`
    : `border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 ${open ? 'bg-slate-50 text-slate-800' : ''}`;
  const menuClass = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const idleClass = dark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900';
  const currentClass = dark ? 'bg-emerald-500/15 text-emerald-300 cursor-default' : 'bg-emerald-50 text-emerald-700 cursor-default';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`You are in the ${currentLabel} dashboard - switch dashboard`}
        className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-2.5 rounded-xl border font-bold text-[13px] transition-all ${triggerClass}`}
      >
        <ArrowLeftRight size={16} className="shrink-0" />
        {!collapsed && (
          <>
            <span className="min-w-0 truncate">
              <span className={`font-semibold ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Dashboard: </span>{currentLabel}
            </span>
            <ChevronUp size={15} className={`ml-auto shrink-0 transition-transform ${open ? '' : 'rotate-180'}`} />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-50 rounded-2xl border shadow-xl p-1.5 ${menuClass} ${collapsed ? 'left-full bottom-0 ml-3 w-52' : 'left-0 right-0 bottom-full mb-2'}`}
        >
          <p className={`px-3 pt-1.5 pb-1 text-[10.5px] font-bold uppercase tracking-wide ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Your dashboards</p>
          {roles.map((descriptor) => {
            const label = ROLE_META[descriptor.role]?.label || descriptor.role;
            const isCurrent = descriptor.role === activeKey;
            return (
              <button
                key={`${descriptor.role}-${descriptor.pairId || ''}`}
                type="button"
                role="menuitem"
                onClick={isCurrent ? undefined : () => handleSwitch(descriptor)}
                disabled={isCurrent}
                aria-current={isCurrent ? 'page' : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold text-[13px] transition-colors ${isCurrent ? currentClass : idleClass}`}
              >
                {isCurrent ? <Check size={15} strokeWidth={3} /> : <ArrowLeftRight size={15} />}
                <span>{label}</span>
                {isCurrent && (
                  <span className={`ml-auto text-[10px] font-[800] uppercase tracking-wide px-2 py-0.5 rounded-full ${dark ? 'bg-emerald-400/20 text-emerald-200' : 'bg-emerald-100 text-emerald-700'}`}>
                    Current
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
