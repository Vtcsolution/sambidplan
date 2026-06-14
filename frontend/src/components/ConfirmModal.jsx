import { AlertTriangle, Trash2, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const VARIANTS = {
  danger: {
    icon:        Trash2,
    iconBg:      'bg-red-100',
    iconColor:   'text-red-600',
    btnClass:    'bg-red-600 hover:bg-red-700 text-white',
    defaultLabel:'Delete',
  },
  warning: {
    icon:        AlertTriangle,
    iconBg:      'bg-amber-100',
    iconColor:   'text-amber-600',
    btnClass:    'bg-amber-600 hover:bg-amber-700 text-white',
    defaultLabel:'Confirm',
  },
  primary: {
    icon:        CheckCircle,
    iconBg:      'bg-indigo-100',
    iconColor:   'text-indigo-600',
    btnClass:    'bg-indigo-600 hover:bg-indigo-700 text-white',
    defaultLabel:'Confirm',
  },
  info: {
    icon:        AlertCircle,
    iconBg:      'bg-blue-100',
    iconColor:   'text-blue-600',
    btnClass:    'bg-blue-600 hover:bg-blue-700 text-white',
    defaultLabel:'Confirm',
  },
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  variant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!isOpen) return null;

  const v = VARIANTS[variant] || VARIANTS.danger;
  const Icon = v.icon;
  const label = confirmLabel || v.defaultLabel;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-[fadeIn_.15s_ease]">
        {/* Close */}
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 transition disabled:opacity-40"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <div className="px-6 pt-6 pb-5 text-center space-y-3">
          {/* Icon */}
          <div className={`w-14 h-14 ${v.iconBg} rounded-2xl flex items-center justify-center mx-auto`}>
            <Icon className={`w-7 h-7 ${v.iconColor}`} />
          </div>

          {/* Text */}
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {message && (
            <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition disabled:opacity-50 ${v.btnClass}`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {label}
          </button>
        </div>
      </div>
    </div>
  );
}
