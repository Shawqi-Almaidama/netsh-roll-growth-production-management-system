import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Printer,
  FileDown,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  FileCheck2
} from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  documentHtml: string;
  onPrint: () => void;
  onExportPdf: () => Promise<void> | void;
  exportingPdf?: boolean;
  backLabel?: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle = 'معاينة رسمية مطابقة للطباعة وتصدير PDF بمقاس A4 القياسي',
  documentHtml,
  onPrint,
  onExportPdf,
  exportingPdf = false,
  backLabel = 'رجوع للقائمة'
}) => {
  const [zoom, setZoom] = useState<number>(100);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      dir="rtl"
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/75 backdrop-blur-xs no-print"
    >
      {/* Top Preview Toolbar */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold border border-slate-700 transition-colors shrink-0 min-h-[40px]"
            title={backLabel}
          >
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            <span>{backLabel}</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0 hidden sm:inline" />
              <h2 className="text-xs sm:text-sm font-bold text-white truncate">{title}</h2>
            </div>
            <p className="text-[11px] text-slate-400 truncate hidden sm:block">{subtitle}</p>
          </div>
        </div>

        {/* Zoom & Output Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="hidden md:flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(60, z - 10))}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="تصغير العرض"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono font-bold text-[11px] text-slate-200 min-w-[46px] text-center">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(130, z + 10))}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="تكبير العرض"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoom !== 100 && (
              <button
                type="button"
                onClick={() => setZoom(100)}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-emerald-400 transition-colors"
                title="إعادة الحجم الافتراضي (100%)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onExportPdf}
            disabled={exportingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-sm min-h-[40px]"
          >
            <FileDown className="w-4 h-4 shrink-0" />
            <span>{exportingPdf ? 'جاري التصدير...' : 'تنزيل PDF'}</span>
          </button>

          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-colors shadow-sm min-h-[40px]"
          >
            <Printer className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>طباعة A4</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق المعاينة"
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/70 text-slate-300 hover:text-white border border-slate-700 transition-colors min-h-[40px]"
            title="إغلاق المعاينة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main A4 Paper Canvas Area */}
      <div
        className="flex-1 overflow-auto p-3 sm:p-8 flex justify-center items-start"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="bg-white shadow-2xl border border-slate-300 rounded-sm transition-transform origin-top overflow-x-auto max-w-full"
          style={{
            width: '794px',
            minHeight: '1050px',
            transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
            marginBottom: zoom > 100 ? `${(zoom - 100) * 8}px` : '24px'
          }}
        >
          <div
            dir="rtl"
            className="w-[794px] max-w-none bg-white text-slate-900"
            dangerouslySetInnerHTML={{ __html: documentHtml }}
          />
        </div>
      </div>
    </div>
  );
};
