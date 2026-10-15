import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export const Notification = ({ type = 'info', message, onClose }) => {
  if (!message) return null;

  const styles = {
    error: {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-200',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      title: 'Action Error'
    },
    success: {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      title: 'Success'
    },
    info: {
      bg: 'bg-sky-500/10 border-sky-500/30 text-sky-200',
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
      title: 'Notice'
    }
  };

  const current = styles[type] || styles.info;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md transition-all duration-300 animate-fadeIn ${current.bg}`}
    >
      {current.icon}
      <div className="flex-1 text-sm font-medium leading-relaxed">
        {message}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          aria-label="Dismiss alert"
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Notification;
