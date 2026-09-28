import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import { ROLE_META, getStoredRoles, getActiveRoleKey, switchToRole } from '../../utils/roles';

// Lets a user who has been assigned more than one role (e.g. teacher + typist,
// or typist + reviewer) jump straight to their other dashboard(s) without
// signing out and back in. Renders nothing when the signed-in email only
// holds a single role.
export default function RoleSwitcher({ collapsed = false, dark = false, onNavigate }) {
  const navigate = useNavigate();
  const roles = getStoredRoles();
  const activeKey = getActiveRoleKey();
  const others = roles.filter(r => r.role !== activeKey);

  if (others.length === 0) return null;

  const handleSwitch = (descriptor) => {
    switchToRole(descriptor, navigate);
    if (onNavigate) onNavigate();
  };

  const buttonClass = dark
    ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700';

  return (
    <div className={`space-y-1.5 ${collapsed ? '' : 'pt-1'}`}>
      {!collapsed && (
        <p className={`px-2 text-[10.5px] font-bold uppercase tracking-wide ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          Switch dashboard
        </p>
      )}
      {others.map((descriptor) => (
        <button
          key={`${descriptor.role}-${descriptor.pairId || ''}`}
          onClick={() => handleSwitch(descriptor)}
          title={`Switch to ${ROLE_META[descriptor.role].label}`}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-2.5 rounded-xl font-bold text-[13px] transition-all ${buttonClass}`}
        >
          <ArrowLeftRight size={16} />
          {!collapsed && <span>{ROLE_META[descriptor.role].label}</span>}
        </button>
      ))}
    </div>
  );
}
