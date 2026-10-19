import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Universal in-app Toast Notification component.
 * Replaces disruptive native browser alert() popups with smooth, modern in-UI notifications.
 *
 * @param {boolean} show - Whether toast is visible
 * @param {string} message - Notification text
 * @param {'success'|'error'|'warning'|'info'} type - Toast type
 * @param {function} onClose - Callback invoked when toast closes
 * @param {number} duration - Auto-dismiss timeout in ms (default 4000ms)
 */
export const Toast = ({ show, message, type = 'success', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [show, duration, onClose]);

  if (!show || !message) return null;

  const config = {
    success: {
      wrap: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100 bg-white shadow-xl shadow-emerald-500/10',
      badge: 'bg-emerald-600 text-white',
      icon: <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />,
    },
    error: {
      wrap: 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100 bg-white shadow-xl shadow-rose-500/10',
      badge: 'bg-rose-600 text-white',
      icon: <AlertCircle size={18} className="text-rose-600 shrink-0" />,
    },
    warning: {
      wrap: 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100 bg-white shadow-xl shadow-amber-500/10',
      badge: 'bg-amber-500 text-white',
      icon: <AlertTriangle size={18} className="text-amber-600 shrink-0" />,
    },
    info: {
      wrap: 'bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-100 bg-white shadow-xl shadow-blue-500/10',
      badge: 'bg-blue-600 text-white',
      icon: <Info size={18} className="text-blue-600 shrink-0" />,
    },
  }[type] || {
    wrap: 'bg-slate-900 border-slate-800 text-white shadow-xl',
    badge: 'bg-blue-600 text-white',
    icon: <Info size={18} className="text-blue-400 shrink-0" />,
  };

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-[9999999] max-w-md mx-auto sm:mx-0 animate-in slide-in-from-bottom-5 fade-in duration-300"
    >
      <div className={`flex items-center gap-3.5 px-4.5 py-3.5 rounded-2xl border ${config.wrap} backdrop-blur-md`}>
        <div className="p-1 rounded-xl bg-slate-50 border border-slate-100 shrink-0 flex items-center justify-center">
          {config.icon}
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <p className="text-[13.5px] font-[700] text-slate-800 leading-snug break-words">
            {message}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            title="Dismiss notification"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Toast;
