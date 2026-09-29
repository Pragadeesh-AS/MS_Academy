import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Check } from 'lucide-react';
import { ROLE_META, getStoredRoles, getActiveRoleKey, switchToRole } from '../../utils/roles';

// Lets a user who has been assigned more than one role (e.g. teacher + typist,
// or typist + reviewer) jump straight to their other dashboard(s) without
// signing out and back in. Every role is listed, with the one the user is in
// right now shown as selected, so it is always clear which dashboard is open.
// Renders nothing when the signed-in email only holds a single role.
export default function RoleSwitcher({ collapsed = false, dark = false, onNavigate }) {
  const navigate = useNavigate();
  // Typist and Reviewer share one route, so switching between them doesn't remount this
  // component - re-read the active role whenever switchToRole() announces a change.
  const [activeKey, setActiveKey] = useState(getActiveRoleKey);
  useEffect(() => {
    const sync = () => setActiveKey(getActiveRoleKey());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const roles = getStoredRoles();
  if (roles.length < 2 || !roles.some(r => r.role !== activeKey)) return null;

  const handleSwitch = (descriptor) => {
    switchToRole(descriptor, navigate);
    setActiveKey(descriptor.role);
    if (onNavigate) onNavigate();
  };

  const idleClass = dark
    ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700';
  const currentClass = dark
    ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/40 cursor-default'
    : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 cursor-default';

  return (
    <div className={`space-y-1.5 ${collapsed ? '' : 'pt-1'}`}>
      {!collapsed && (
        <p className={`px-2 text-[10.5px] font-bold uppercase tracking-wide ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          Your dashboards
        </p>
      )}
      {roles.map((descriptor) => {
        const label = ROLE_META[descriptor.role]?.label || descriptor.role;
        const isCurrent = descriptor.role === activeKey;
        return (
          <button
            key={`${descriptor.role}-${descriptor.pairId || ''}`}
            type="button"
            onClick={isCurrent ? undefined : () => handleSwitch(descriptor)}
            disabled={isCurrent}
            aria-current={isCurrent ? 'page' : undefined}
            title={isCurrent ? `You are in the ${label} dashboard` : `Switch to ${label}`}
            className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-2.5 rounded-xl font-bold text-[13px] transition-all ${isCurrent ? currentClass : idleClass}`}
          >
            {isCurrent ? <Check size={16} strokeWidth={3} /> : <ArrowLeftRight size={16} />}
            {!collapsed && (
              <>
                <span>{label}</span>
                {isCurrent && (
                  <span className={`ml-auto text-[10px] font-[800] uppercase tracking-wide px-2 py-0.5 rounded-full ${dark ? 'bg-emerald-400/20 text-emerald-200' : 'bg-emerald-100 text-emerald-700'}`}>
                    Current
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
