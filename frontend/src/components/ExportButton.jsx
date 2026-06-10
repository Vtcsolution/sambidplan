// frontend/src/components/ExportButton.jsx
// Drop-down export button: PDF | CSV (Excel)
import { useState, useRef, useEffect } from 'react';
import { Download, FileText, Table2, ChevronDown, Loader2 } from 'lucide-react';

export default function ExportButton({ onExportPDF, onExportCSV, disabled = false, label = 'Export' }) {
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(null); // 'pdf' | 'csv' | null
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const run = async (type, fn) => {
    setOpen(false);
    setLoading(type);
    try { await fn(); }
    catch (err) { console.error('Export error:', err); }
    finally { setLoading(null); }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={disabled || !!loading}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-40"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {loading ? (loading === 'pdf' ? 'Generating PDF…' : 'Generating CSV…') : label}
        {!loading && <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
          {onExportPDF && (
            <button
              onClick={() => run('pdf', onExportPDF)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <FileText className="w-4 h-4 text-red-500" />
              Export as PDF
            </button>
          )}
          {onExportCSV && (
            <button
              onClick={() => run('csv', onExportCSV)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors border-t border-gray-50"
            >
              <Table2 className="w-4 h-4 text-green-600" />
              Export as CSV (Excel)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
