import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

function escapeHtml(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatNumber(val: any): string {
  const num = Number(val);
  if (!Number.isFinite(num)) return String(val ?? '0');
  return num.toLocaleString('en-US');
}

/**
 * Clean A4 Document Printer using a hidden iframe so printing works identically
 * from table rows, modals, or preview screens without printing app chrome or scrollbars.
 */
export function printDocumentHtml(htmlContent: string, docTitle = 'مستند رسمي - شركة نتش رول جروث'): void {
  const existingFrame = document.getElementById('nrg-print-iframe') as HTMLIFrameElement | null;
  if (existingFrame && existingFrame.parentNode) {
    existingFrame.parentNode.removeChild(existingFrame);
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'nrg-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    window.print();
    return;
  }

  iframeDoc.open();
  iframeDoc.write(`<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(docTitle)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      *, *::before, *::after {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      @page {
        size: A4 portrait;
        margin: 10mm 10mm 12mm 10mm;
      }
      html, body {
        margin: 0;
        padding: 0;
        background-color: #ffffff !important;
        color: #0f172a !important;
        font-family: 'Cairo', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;
        direction: rtl;
        font-size: 11px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        page-break-inside: auto;
      }
      thead {
        display: table-header-group;
      }
      tfoot {
        display: table-footer-group;
      }
      tr, .pdf-keep-together {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    </style>
  </head>
  <body>
    <div dir="rtl" style="width: 100%; background: #ffffff; color: #0f172a;">
      ${htmlContent}
    </div>
  </body>
</html>`);
  iframeDoc.close();

  const triggerPrint = async () => {
    try {
      if ((iframeDoc as any).fonts && (iframeDoc as any).fonts.ready) {
        await (iframeDoc as any).fonts.ready;
      }
    } catch {
      // ignore font wait errors
    }
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      }
    }, 220);
  };

  triggerPrint();
}

/**
 * Core HTML-to-PDF renderer that preserves Arabic RTL ligatures, Cairo typography,
 * tables, and smart row-aware multi-page A4 slicing with page numbers.
 * Uses an isolated clean iframe and onclone style sanitization to avoid Tailwind v4 oklch() parsing errors in html2canvas.
 */
export async function renderHtmlToPdf(htmlContent: string, filename: string): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '0';
  iframe.style.width = '794px'; // A4 width at 96 DPI
  iframe.style.height = '1123px';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';

  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('تعذر تهيئة نافذة تصدير PDF');
    }

    iframeDoc.open();
    iframeDoc.write(`<!doctype html>
<html lang="ar" dir="rtl" style="background-color: #ffffff; color: #0f172a;">
  <head>
    <meta charset="UTF-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      *, *::before, *::after {
        box-sizing: border-box;
        border-color: #cbd5e1;
        outline-color: transparent;
        text-decoration-color: #0f172a;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: 794px;
        background-color: #ffffff !important;
        color: #0f172a !important;
        font-family: 'Cairo', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;
        direction: rtl;
        -webkit-font-smoothing: antialiased;
      }
    </style>
  </head>
  <body style="background-color: #ffffff; color: #0f172a; margin: 0; padding: 0;">
    <div id="pdf-export-container" dir="rtl" style="width: 794px; background-color: #ffffff; color: #0f172a; font-family: 'Cairo', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif;">
      ${htmlContent}
    </div>
  </body>
</html>`);
    iframeDoc.close();

    // Allow web fonts and layout to settle inside the isolated document
    if ((document as any).fonts && (document as any).fonts.ready) {
      await (document as any).fonts.ready;
    }
    if ((iframeDoc as any).fonts && (iframeDoc as any).fonts.ready) {
      await (iframeDoc as any).fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 180));

    const container = iframeDoc.getElementById('pdf-export-container') || iframeDoc.body;
    const scale = 2;

    // Collect row and block boundaries so page breaks never slice through a table row or signature block
    const containerRect = container.getBoundingClientRect();
    const protectedRanges: Array<{ topPx: number; bottomPx: number }> = [];
    const elementsToProtect = container.querySelectorAll('tr, .pdf-keep-together');
    elementsToProtect.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const topPx = Math.max(0, Math.floor((rect.top - containerRect.top) * scale));
      const bottomPx = Math.max(topPx, Math.ceil((rect.bottom - containerRect.top) * scale));
      if (bottomPx > topPx) {
        protectedRanges.push({ topPx, bottomPx });
      }
    });

    const canvas = await html2canvas(container, {
      scale,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
      onclone: (clonedDoc) => {
        const styleTags = clonedDoc.querySelectorAll('style');
        styleTags.forEach((styleEl) => {
          if (styleEl.textContent && /oklch|oklab|color-mix/i.test(styleEl.textContent)) {
            styleEl.textContent = styleEl.textContent
              .replace(/oklch\([^)]+\)/gi, '#0f172a')
              .replace(/oklab\([^)]+\)/gi, '#0f172a');
          }
        });
        if (clonedDoc.documentElement) {
          clonedDoc.documentElement.className = '';
          clonedDoc.documentElement.style.backgroundColor = '#ffffff';
          clonedDoc.documentElement.style.color = '#0f172a';
          clonedDoc.documentElement.style.borderColor = '#cbd5e1';
        }
        if (clonedDoc.body) {
          clonedDoc.body.className = '';
          clonedDoc.body.style.backgroundColor = '#ffffff';
          clonedDoc.body.style.color = '#0f172a';
          clonedDoc.body.style.borderColor = '#cbd5e1';
        }
      }
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const marginMm = 8;
    const usableWidthMm = pageWidthMm - marginMm * 2;
    const usableHeightMm = pageHeightMm - marginMm * 2 - 6; // leave 6mm for page number footer

    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;
    const pxPerMm = imgWidthPx / usableWidthMm;
    const maxSliceHeightPx = Math.floor(usableHeightMm * pxPerMm);

    // Compute smart page slices that respect row boundaries
    const slices: Array<{ startY: number; endY: number }> = [];
    let currentY = 0;
    while (currentY < imgHeightPx - 2) {
      if (imgHeightPx - currentY <= maxSliceHeightPx) {
        slices.push({ startY: currentY, endY: imgHeightPx });
        break;
      }

      let targetEndY = currentY + maxSliceHeightPx;
      const straddling = protectedRanges.filter(
        (r) =>
          r.topPx > currentY + Math.floor(maxSliceHeightPx * 0.2) &&
          r.topPx < targetEndY &&
          r.bottomPx > targetEndY
      );

      if (straddling.length > 0) {
        const earliestTop = Math.min(...straddling.map((r) => r.topPx));
        if (earliestTop > currentY + 80) {
          targetEndY = earliestTop;
        }
      }

      slices.push({ startY: currentY, endY: targetEndY });
      currentY = targetEndY;
    }

    if (slices.length === 0) {
      slices.push({ startY: 0, endY: imgHeightPx });
    }

    const totalPages = slices.length;

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      if (pageIndex > 0) {
        pdf.addPage();
      }

      const { startY, endY } = slices[pageIndex];
      const currentSliceHeightPx = Math.max(1, endY - startY);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = imgWidthPx;
      pageCanvas.height = currentSliceHeightPx;

      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          startY,
          imgWidthPx,
          currentSliceHeightPx,
          0,
          0,
          imgWidthPx,
          currentSliceHeightPx
        );
      }

      const sliceDataUrl = pageCanvas.toDataURL('image/jpeg', 0.96);
      const sliceHeightMm = currentSliceHeightPx / pxPerMm;

      pdf.addImage(
        sliceDataUrl,
        'JPEG',
        marginMm,
        marginMm,
        usableWidthMm,
        sliceHeightMm
      );

      // Page number footer (ASCII safe for standard PDF font)
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `Natural Growth ERP  |  Page ${pageIndex + 1} of ${totalPages}`,
        pageWidthMm / 2,
        pageHeightMm - 4,
        { align: 'center' }
      );
    }

    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

export function buildOfficialHeader(
  docTitle: string,
  docSubtitle: string,
  refNo?: string,
  dateStr?: string,
  printedBy?: string,
  badgeText?: string
): string {
  const nowStr = new Date().toLocaleString('ar-YE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <div class="pdf-keep-together" style="border-bottom: 3px solid #065f46; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="width: 48px; height: 48px; border-radius: 12px; background: #064e3b; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; flex-shrink: 0; border: 2px solid #047857;">
          NRG
        </div>
        <div>
          <div style="font-size: 19px; font-weight: 800; color: #064e3b; margin-bottom: 3px;">
            شركة نتش رول جروث للإنتاج الزراعي والحيواني
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #047857;">
            نظام إدارة قسم الإنتاج والمبيعات والمستودعات (Natural Growth ERP)
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 3px;">
            الإدارة العامة — قسم الإنتاج والتشغيل | الجمهورية اليمنية | العملة الرسمية: الريال اليمني (ر.ي)
          </div>
        </div>
      </div>
      <div style="text-align: right; background: #f8fafc; border: 1px solid #cbd5e1; border-right: 4px solid #065f46; border-radius: 8px; padding: 10px 14px; min-width: 235px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
          <span style="font-size: 15px; font-weight: 800; color: #0f172a;">${escapeHtml(docTitle)}</span>
          ${
            badgeText
              ? `<span style="font-size: 9px; font-weight: 800; background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; border: 1px solid #a7f3d0;">${escapeHtml(badgeText)}</span>`
              : ''
          }
        </div>
        <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">${escapeHtml(docSubtitle)}</div>
        ${refNo ? `<div style="font-size: 12px; font-weight: 700; color: #065f46;">رقم المرجع: <span dir="ltr" style="font-family: monospace;">${escapeHtml(refNo)}</span></div>` : ''}
        ${dateStr ? `<div style="font-size: 11px; color: #334155;">التاريخ: <span dir="ltr" style="font-family: monospace;">${escapeHtml(dateStr)}</span></div>` : ''}
        <div style="font-size: 10px; color: #64748b; margin-top: 4px; padding-top: 3px; border-top: 1px dashed #cbd5e1;">
          تاريخ الإصدار/الطباعة: ${escapeHtml(nowStr)}${printedBy ? ` | بواسطة: ${escapeHtml(printedBy)}` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * 1. Build & Export Sales Invoice HTML / PDF (FR-09 / UC-09)
 */
export function buildSalesInvoiceDocumentHtml(invoice: any, printedBy?: string): string {
  const statusLabels: Record<string, string> = {
    PAID: 'مدفوعة ومسددة بالكامل (PAID)',
    PENDING: 'آجلة — قيد التحصيل (PENDING)',
    PARTIAL: 'مدفوعة جزئياً (PARTIAL)'
  };
  const statusColor: Record<string, string> = {
    PAID: '#065f46',
    PENDING: '#b45309',
    PARTIAL: '#1d4ed8'
  };

  const pStatus = invoice.payment_status || invoice.status || 'PAID';
  const lines = Array.isArray(invoice.lines)
    ? invoice.lines
    : Array.isArray(invoice.items)
    ? invoice.items
    : [];
  const totalQuantity = lines.reduce((sum: number, l: any) => sum + (Number(l.quantity) || 0), 0);

  const rowsHtml = lines
    .map(
      (line: any, idx: number) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: 700;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-family: monospace; font-size: 11px;">${escapeHtml(line.product_code || '-')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 700;">${escapeHtml(line.product_name || '-')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${escapeHtml(line.unit || '-')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: 700; font-family: monospace;">${formatNumber(line.quantity)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-family: monospace;">${formatNumber(line.unit_price ?? line.unitPrice)} ر.ي</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: 800; color: #065f46; font-family: monospace;">${formatNumber(line.line_total ?? line.lineTotal)} ر.ي</td>
      </tr>
    `
    )
    .join('');

  return `
    <div style="padding: 24px; background: #ffffff; color: #0f172a; direction: rtl;">
      ${buildOfficialHeader(
        'فاتورة مبيعات ضريبية',
        'مستند مبيعات رسمي معتمد (FR-09 / UC-09)',
        invoice.invoice_no,
        invoice.invoice_date,
        printedBy,
        'معتمد'
      )}

      <div class="pdf-keep-together" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px;">
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px;">
          <div style="font-size: 12px; font-weight: 800; color: #065f46; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            بيانات العميل المستفيد
          </div>
          <div style="font-size: 12px; margin-bottom: 4px;"><strong>اسم العميل:</strong> ${escapeHtml(invoice.customer_name || '-')}</div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>كود العميل:</strong> <span dir="ltr" style="font-family: monospace;">${escapeHtml(invoice.customer_code || '-')}</span></div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>رقم الهاتف:</strong> <span dir="ltr" style="font-family: monospace;">${escapeHtml(invoice.customer_phone || '-')}</span></div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>الرقم الضريبي:</strong> <span dir="ltr" style="font-family: monospace;">${escapeHtml(invoice.tax_number || invoice.customer_tax || 'غير مسجل')}</span></div>
          <div style="font-size: 11px;"><strong>العنوان:</strong> ${escapeHtml(invoice.customer_address || '-')}</div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px;">
          <div style="font-size: 12px; font-weight: 800; color: #065f46; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            تفاصيل الفاتورة والسداد
          </div>
          <div style="font-size: 12px; margin-bottom: 4px;"><strong>رقم الفاتورة:</strong> <span dir="ltr" style="font-family: monospace; font-weight: 800;">${escapeHtml(invoice.invoice_no)}</span></div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>تاريخ الإصدار:</strong> <span dir="ltr" style="font-family: monospace;">${escapeHtml(invoice.invoice_date)}</span></div>
          <div style="font-size: 11px; margin-bottom: 4px;">
            <strong>حالة السداد:</strong>
            <span style="color: ${statusColor[pStatus] || '#0f172a'}; font-weight: 800;">
              ${escapeHtml(statusLabels[pStatus] || pStatus)}
            </span>
          </div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>مسؤول المبيعات المُصدر:</strong> ${escapeHtml(invoice.created_by_name || invoice.issuer_name || '-')}</div>
          <div style="font-size: 11px;"><strong>إجمالي البنود والكميات:</strong> ${lines.length} صنف (${formatNumber(totalQuantity)} وحدة)</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px;">
        <thead>
          <tr style="background-color: #064e3b; color: #ffffff;">
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: center; width: 40px;">#</th>
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: right;">كود الصنف</th>
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: right;">اسم المنتج والبيان</th>
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: center;">الوحدة</th>
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: center;">الكمية</th>
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: center;">سعر الوحدة</th>
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: center;">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="7" style="padding: 16px; text-align: center;">لا توجد أصناف مسجلة</td></tr>'}
        </tbody>
        <tfoot>
          <tr style="background-color: #ecfdf5; font-weight: 800; color: #064e3b;">
            <td colspan="4" style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">إجمالي البنود والكميات المباعة</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-family: monospace;">${formatNumber(totalQuantity)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">المجموع الفرعي:</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-family: monospace;">${formatNumber(invoice.subtotal)} ر.ي</td>
          </tr>
        </tfoot>
      </table>

      <div class="pdf-keep-together" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; font-size: 11px;">
          <div style="font-weight: 800; color: #334155; margin-bottom: 4px;">ملاحظات الفاتورة وشروط التسليم:</div>
          <div style="color: #475569; line-height: 1.6;">
            ${escapeHtml(invoice.notes || 'تم تسليم البضاعة بحالة ممتازة ومطابقة للمواصفات القياسية المعتمدة في شركة نتش رول جروث، وتم خصم الكميات آلياً من أرصدة المستودعات (BR-03).')}
          </div>
        </div>

        <div style="width: 290px; background: #f8fafc; border: 2px solid #065f46; border-radius: 8px; padding: 12px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #475569;">المجموع الفرعي:</span>
            <strong style="font-family: monospace;">${formatNumber(invoice.subtotal)} ر.ي</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #475569;">الخصم التجاري الممنوح:</span>
            <strong style="color: #dc2626; font-family: monospace;">- ${formatNumber(invoice.discount || 0)} ر.ي</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #cbd5e1;">
            <span style="color: #475569;">الضريبة المضافة:</span>
            <strong style="font-family: monospace;">+ ${formatNumber(invoice.tax_amount || 0)} ر.ي</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; color: #064e3b;">
            <span>الصافي النهائي المستحق:</span>
            <span style="font-family: monospace;">${formatNumber(invoice.total_amount)} ر.ي</span>
          </div>
        </div>
      </div>

      <div class="pdf-keep-together" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 30px; padding-top: 16px; border-top: 1px dashed #94a3b8; text-align: center; font-size: 11px;">
        <div>
          <div style="font-weight: 800; color: #1e293b; margin-bottom: 28px;">توقيع المستلم (العميل)</div>
          <div style="border-bottom: 1px solid #94a3b8; width: 75%; margin: 0 auto;"></div>
        </div>
        <div>
          <div style="font-weight: 800; color: #1e293b; margin-bottom: 28px;">مسؤول المبيعات (${escapeHtml(invoice.created_by_name || invoice.issuer_name || '')})</div>
          <div style="border-bottom: 1px solid #94a3b8; width: 75%; margin: 0 auto;"></div>
        </div>
        <div>
          <div style="font-weight: 800; color: #1e293b; margin-bottom: 28px;">اعتماد الإدارة المالية والمحاسبة</div>
          <div style="border-bottom: 1px solid #94a3b8; width: 75%; margin: 0 auto;"></div>
        </div>
      </div>
    </div>
  `;
}

export async function exportSalesInvoicePDF(invoice: any, printedBy?: string): Promise<void> {
  const html = buildSalesInvoiceDocumentHtml(invoice, printedBy);
  await renderHtmlToPdf(html, `فاتورة_مبيعات_${invoice.invoice_no}.pdf`);
}

export function printSalesInvoiceDocument(invoice: any, printedBy?: string): void {
  const html = buildSalesInvoiceDocumentHtml(invoice, printedBy);
  printDocumentHtml(html, `فاتورة مبيعات ${invoice.invoice_no}`);
}

/**
 * 2. Build & Export Warehouse Supply Receipt HTML / PDF (FR-11 / UC-11)
 */
export function buildWarehouseReceiptDocumentHtml(receipt: any, printedBy?: string): string {
  const items =
    Array.isArray(receipt.items) && receipt.items.length > 0
      ? receipt.items
      : [
          {
            product_code: receipt.product_code,
            product_name: receipt.product_name,
            quantity_received: receipt.quantity,
            unit: receipt.unit,
            batch_number: receipt.batch_number || receipt.batch_no
          }
        ];

  const totalQty = items.reduce(
    (sum: number, item: any) => sum + (Number(item.quantity_received ?? item.quantity) || 0),
    0
  );

  const rowsHtml = items
    .map(
      (item: any, idx: number) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="border: 1px solid #cbd5e1; padding: 9px; text-align: center; font-weight: 700;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 9px; font-family: monospace;">${escapeHtml(item.product_code || '-')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 9px; font-weight: 700;">${escapeHtml(item.product_name || '-')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 9px; text-align: center;">${escapeHtml(item.unit || '-')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 9px; text-align: center; font-family: monospace;">${escapeHtml(item.batch_number || item.batch_no || receipt.batch_number || receipt.batch_no || 'عام')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 9px; text-align: center; font-weight: 800; color: #065f46; font-size: 13px; font-family: monospace;">+ ${formatNumber(item.quantity_received ?? item.quantity)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <div style="padding: 24px; background: #ffffff; color: #0f172a; direction: rtl;">
      ${buildOfficialHeader(
        'سند توريد واستلام مخزني',
        'مستند إضافة مخزنية رسمي معتمد (FR-11 / BR-04)',
        receipt.receipt_no,
        receipt.supply_date || receipt.receipt_date,
        printedBy,
        'مكتمل ومضاف للمخزون'
      )}

      <div class="pdf-keep-together" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px;">
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px;">
          <div style="font-size: 12px; font-weight: 800; color: #065f46; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            بيانات المستودع المستلم
          </div>
          <div style="font-size: 12px; margin-bottom: 4px;"><strong>اسم المستودع:</strong> ${escapeHtml(receipt.warehouse_name || '-')}</div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>كود المستودع:</strong> <span dir="ltr" style="font-family: monospace;">${escapeHtml(receipt.warehouse_code || '-')}</span></div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>أمين المستودع المستلم:</strong> ${escapeHtml(receipt.received_by_name || receipt.receiver_name || '-')}</div>
          <div style="font-size: 11px;"><strong>حالة القيد المخزني:</strong> <span style="color: #065f46; font-weight: 800;">تمت إضافة الكمية للرصيد الفعلي (COMPLETED)</span></div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px;">
          <div style="font-size: 12px; font-weight: 800; color: #065f46; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            بيانات التوريد والدفعة
          </div>
          <div style="font-size: 12px; margin-bottom: 4px;"><strong>رقم السند:</strong> <span dir="ltr" style="font-family: monospace; font-weight: 800;">${escapeHtml(receipt.receipt_no)}</span></div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>تاريخ التوريد:</strong> <span dir="ltr" style="font-family: monospace;">${escapeHtml(receipt.supply_date || receipt.receipt_date)}</span></div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>المصدر / جهة التوريد:</strong> ${escapeHtml(receipt.supplier_name || '-')}</div>
          <div style="font-size: 11px;"><strong>رقم التشغيلة (Batch):</strong> <span dir="ltr" style="font-family: monospace;">${escapeHtml(receipt.batch_number || receipt.batch_no || 'عام')}</span></div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px;">
        <thead>
          <tr style="background-color: #064e3b; color: #ffffff;">
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: center; width: 40px;">#</th>
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: right;">كود الصنف</th>
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: right;">اسم الصنف المورّد</th>
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: center;">الوحدة</th>
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: center;">رقم الدفعة (Batch)</th>
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: center;">الكمية المستلمة</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="background-color: #ecfdf5; font-weight: 800; color: #064e3b;">
            <td colspan="5" style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">إجمالي الكميات المستلمة والمضافة للمخزون (${items.length} صنف)</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-family: monospace; font-size: 13px;">+ ${formatNumber(totalQty)}</td>
          </tr>
        </tfoot>
      </table>

      <div class="pdf-keep-together" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; font-size: 11px; margin-bottom: 24px;">
        <div style="font-weight: 800; color: #334155; margin-bottom: 4px;">ملاحظات الفحص والاستلام المخزني:</div>
        <div style="color: #475569; line-height: 1.6;">
          ${escapeHtml(receipt.notes || 'تم فحص الأصناف المورّدة ظاهرياً والتأكد من مطابقتها لمعايير الجودة والسلامة وإضافتها إلى أرصدة المستودع.')}
        </div>
      </div>

      <div class="pdf-keep-together" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 30px; padding-top: 16px; border-top: 1px dashed #94a3b8; text-align: center; font-size: 11px;">
        <div>
          <div style="font-weight: 800; color: #1e293b; margin-bottom: 28px;">مسلّم البضاعة (${escapeHtml(receipt.supplier_name || 'المصدر')})</div>
          <div style="border-bottom: 1px solid #94a3b8; width: 75%; margin: 0 auto;"></div>
        </div>
        <div>
          <div style="font-weight: 800; color: #1e293b; margin-bottom: 28px;">أمين المخازن المستلم (${escapeHtml(receipt.received_by_name || receipt.receiver_name || '')})</div>
          <div style="border-bottom: 1px solid #94a3b8; width: 75%; margin: 0 auto;"></div>
        </div>
        <div>
          <div style="font-weight: 800; color: #1e293b; margin-bottom: 28px;">اعتماد مدير قسم الإنتاج</div>
          <div style="border-bottom: 1px solid #94a3b8; width: 75%; margin: 0 auto;"></div>
        </div>
      </div>
    </div>
  `;
}

export async function exportWarehouseReceiptPDF(receipt: any, printedBy?: string): Promise<void> {
  const html = buildWarehouseReceiptDocumentHtml(receipt, printedBy);
  await renderHtmlToPdf(html, `سند_توريد_مخزني_${receipt.receipt_no}.pdf`);
}

export function printWarehouseReceiptDocument(receipt: any, printedBy?: string): void {
  const html = buildWarehouseReceiptDocumentHtml(receipt, printedBy);
  printDocumentHtml(html, `سند توريد مخزني ${receipt.receipt_no}`);
}

/**
 * 3. Build & Export Production Requisition HTML / PDF (FR-03..FR-07)
 */
export function buildRequisitionDocumentHtml(req: any, printedBy?: string): string {
  const typeLabels: Record<string, string> = {
    CHICKS: 'طلب كتاكيت وبداري (FR-03)',
    FEED: 'طلب أعلاف وتغذية (FR-04)',
    MEDICINE: 'طلب أدوية ولقاحات بيطرية (FR-05)',
    TREATMENT: 'طلب علاجات وتحصينات (FR-05)',
    SUPPLIES: 'طلب مستلزمات تشغيل (FR-06)',
    SUPPLY: 'طلب مستلزمات عامة (FR-06)',
    MAINTENANCE: 'طلب قطع غيار وصيانة'
  };
  const statusLabels: Record<string, string> = {
    DRAFT: 'مسودة (DRAFT)',
    SUBMITTED: 'مقدم للمراجعة (SUBMITTED)',
    UNDER_REVIEW: 'قيد المراجعة الفنية (UNDER_REVIEW)',
    APPROVED: 'معتمد للتنفيذ (APPROVED)',
    REJECTED: 'مرفوض (REJECTED)',
    COMPLETED: 'مكتمل الصرف والتوريد (COMPLETED)'
  };
  const urgencyLabels: Record<string, string> = {
    LOW: 'منخفضة',
    NORMAL: 'عادية (اعتيادية)',
    HIGH: 'عاجلة (خلال 24 ساعة)',
    CRITICAL: 'حرجة جداً',
    EMERGENCY: 'طوارئ فورية (EMERGENCY)'
  };

  const items = Array.isArray(req.items) ? req.items : [];
  const totalQty = items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0);

  const rowsHtml = items
    .map(
      (item: any, idx: number) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: 700;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 700;">${escapeHtml(item.item_name || item.itemName || '-')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${escapeHtml(item.unit || '-')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: 800; color: #065f46; font-family: monospace;">${formatNumber(item.quantity)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px;">${escapeHtml(item.specifications || item.notes || '-')}</td>
      </tr>
    `
    )
    .join('');

  return `
    <div style="padding: 24px; background: #ffffff; color: #0f172a; direction: rtl;">
      ${buildOfficialHeader(
        'نموذج طلب احتياج تشغيلي',
        typeLabels[req.req_type] || req.req_type,
        req.request_no,
        req.request_date,
        printedBy,
        statusLabels[req.status] || req.status
      )}

      <div class="pdf-keep-together" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px;">
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px;">
          <div style="font-size: 12px; font-weight: 800; color: #065f46; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            بيانات الطلب والجهة الطالبة
          </div>
          <div style="font-size: 12px; margin-bottom: 4px;"><strong>رقم الطلب:</strong> <span dir="ltr" style="font-family: monospace; font-weight: 800;">${escapeHtml(req.request_no)}</span></div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>نوع الاحتياج:</strong> ${escapeHtml(typeLabels[req.req_type] || req.req_type)}</div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>مقدم الطلب (المشرف):</strong> ${escapeHtml(req.requester_name || '-')}</div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>المزرعة / الموقع:</strong> ${escapeHtml(req.farm_name || 'عام للمزرعة')}</div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>العنبر / الهنجر:</strong> ${escapeHtml(req.house_name || 'عام لكافة الهناجر')}</div>
          <div style="font-size: 11px;"><strong>القطيع المرتبط:</strong> ${escapeHtml(req.flock_code ? `${req.flock_code} (${req.flock_breed || req.breed || ''})` : 'غير محدد')}</div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px;">
          <div style="font-size: 12px; font-weight: 800; color: #065f46; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            حالة الاعتماد والمراجعة الإدارية (FR-07)
          </div>
          <div style="font-size: 12px; margin-bottom: 4px;"><strong>الحالة الحالية:</strong> <span style="font-weight: 800; color: ${req.status === 'REJECTED' ? '#dc2626' : '#065f46'};">${escapeHtml(statusLabels[req.status] || req.status)}</span></div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>درجة الأهمية:</strong> ${escapeHtml(urgencyLabels[req.urgency] || req.urgency)}</div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>المراجع / المعتمد:</strong> ${escapeHtml(req.reviewer_name || 'بانتظار المراجعة')}</div>
          <div style="font-size: 11px; margin-bottom: 4px;"><strong>تاريخ المراجعة:</strong> <span dir="ltr" style="font-family: monospace;">${escapeHtml(req.review_date || '-')}</span></div>
          <div style="font-size: 11px;"><strong>قرار وملاحظات المراجعة:</strong> ${escapeHtml(req.review_notes || '-')}</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px;">
        <thead>
          <tr style="background-color: #064e3b; color: #ffffff;">
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: center; width: 40px;">#</th>
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: right;">اسم الصنف / المادة المطلوبة</th>
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: center;">الوحدة</th>
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: center;">الكمية المطلوبة</th>
            <th style="border: 1px solid #064e3b; padding: 9px; text-align: right;">المواصفات والبيان الفني</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="5" style="padding: 16px; text-align: center;">لا توجد بنود مسجلة</td></tr>'}
        </tbody>
        <tfoot>
          <tr style="background-color: #ecfdf5; font-weight: 800; color: #064e3b;">
            <td colspan="3" style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">إجمالي البنود المطلوبة (${items.length} بند)</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-family: monospace;">${formatNumber(totalQty)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;"></td>
          </tr>
        </tfoot>
      </table>

      <div class="pdf-keep-together" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; font-size: 11px; margin-bottom: 24px;">
        <div style="font-weight: 800; color: #334155; margin-bottom: 4px;">مبررات وملاحظات الطلب التشغيلي:</div>
        <div style="color: #475569; line-height: 1.6;">
          ${escapeHtml(req.notes || 'لا توجد ملاحظات إضافية.')}
        </div>
      </div>

      <div class="pdf-keep-together" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 30px; padding-top: 16px; border-top: 1px dashed #94a3b8; text-align: center; font-size: 11px;">
        <div>
          <div style="font-weight: 800; color: #1e293b; margin-bottom: 28px;">مشرف الإنتاج مقدم الطلب (${escapeHtml(req.requester_name || '')})</div>
          <div style="border-bottom: 1px solid #94a3b8; width: 75%; margin: 0 auto;"></div>
        </div>
        <div>
          <div style="font-weight: 800; color: #1e293b; margin-bottom: 28px;">اعتماد مدير قسم الإنتاج (${escapeHtml(req.reviewer_name || 'أحمد صبر')})</div>
          <div style="border-bottom: 1px solid #94a3b8; width: 75%; margin: 0 auto;"></div>
        </div>
        <div>
          <div style="font-weight: 800; color: #1e293b; margin-bottom: 28px;">أمين المخازن (التنفيذ والصرف)</div>
          <div style="border-bottom: 1px solid #94a3b8; width: 75%; margin: 0 auto;"></div>
        </div>
      </div>
    </div>
  `;
}

export async function exportRequisitionPDF(req: any, printedBy?: string): Promise<void> {
  const html = buildRequisitionDocumentHtml(req, printedBy);
  await renderHtmlToPdf(html, `طلب_احتياج_${req.request_no}.pdf`);
}

export function printRequisitionDocument(req: any, printedBy?: string): void {
  const html = buildRequisitionDocumentHtml(req, printedBy);
  printDocumentHtml(html, `طلب احتياج ${req.request_no}`);
}

/**
 * 4. Build & Export Operational Reports HTML / PDF (FR-12 / UC-12)
 */
export function buildReportDocumentHtml(params: {
  reportCode: string;
  reportTitle: string;
  reportSubtitle: string;
  periodLabel: string;
  exportedBy?: string;
  summaryCards: Array<{ label: string; value: string }>;
  headers: string[];
  rows: Array<Array<string | number>>;
  footerSummaryRow?: Array<string | number>;
}): string {
  const {
    reportCode,
    reportTitle,
    reportSubtitle,
    periodLabel,
    exportedBy,
    summaryCards,
    headers,
    rows,
    footerSummaryRow
  } = params;

  const kpisHtml = summaryCards
    .map(
      (k) => `
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-right: 4px solid #065f46; border-radius: 8px; padding: 10px 12px;">
        <div style="font-size: 10px; color: #64748b; font-weight: 700; margin-bottom: 4px;">${escapeHtml(k.label)}</div>
        <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${escapeHtml(k.value)}</div>
      </div>
    `
    )
    .join('');

  const headersHtml = headers
    .map(
      (h) =>
        `<th style="border: 1px solid #064e3b; padding: 8px; text-align: right; font-size: 11px;">${escapeHtml(h)}</th>`
    )
    .join('');

  const rowsHtml = rows
    .map(
      (row, rIdx) => `
      <tr style="background-color: ${rIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        ${row
          .map(
            (cell) =>
              `<td style="border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 11px; color: #1e293b;">${escapeHtml(cell)}</td>`
          )
          .join('')}
      </tr>
    `
    )
    .join('');

  const footerHtml =
    footerSummaryRow && footerSummaryRow.length > 0
      ? `<tfoot>
          <tr style="background-color: #ecfdf5; font-weight: 800; color: #064e3b;">
            ${footerSummaryRow
              .map(
                (cell) =>
                  `<td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; font-weight: 800; color: #064e3b;">${escapeHtml(cell)}</td>`
              )
              .join('')}
          </tr>
        </tfoot>`
      : '';

  return `
    <div style="padding: 22px; background: #ffffff; color: #0f172a; direction: rtl;">
      ${buildOfficialHeader(
        reportTitle,
        reportSubtitle,
        reportCode,
        periodLabel,
        exportedBy,
        'تقرير رسمي معتمد'
      )}

      <div class="pdf-keep-together" style="display: grid; grid-template-columns: repeat(${Math.min(4, Math.max(2, summaryCards.length))}, 1fr); gap: 10px; margin-bottom: 18px;">
        ${kpisHtml}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #064e3b; color: #ffffff;">
            ${headersHtml}
          </tr>
        </thead>
        <tbody>
          ${
            rowsHtml ||
            `<tr><td colspan="${headers.length}" style="padding: 18px; text-align: center; color: #64748b;">لا توجد سجلات مطابقة للفترة المحددة</td></tr>`
          }
        </tbody>
        ${footerHtml}
      </table>

      <div class="pdf-keep-together" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 26px; padding-top: 14px; border-top: 1px dashed #94a3b8; text-align: center; font-size: 11px;">
        <div>
          <div style="font-weight: 800; color: #1e293b; margin-bottom: 24px;">إعداد ومراجعة القسم المختص (${escapeHtml(exportedBy || '')})</div>
          <div style="border-bottom: 1px solid #94a3b8; width: 75%; margin: 0 auto;"></div>
        </div>
        <div>
          <div style="font-weight: 800; color: #1e293b; margin-bottom: 24px;">اعتماد مدير قسم الإنتاج (أحمد صبر)</div>
          <div style="border-bottom: 1px solid #94a3b8; width: 75%; margin: 0 auto;"></div>
        </div>
        <div>
          <div style="font-weight: 800; color: #1e293b; margin-bottom: 24px;">الاعتماد العام والختم الرسمي</div>
          <div style="border-bottom: 1px solid #94a3b8; width: 75%; margin: 0 auto;"></div>
        </div>
      </div>

      <div class="pdf-keep-together" style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #475569;">
        <div>إجمالي السجلات المدرجة في التقرير: <strong>${rows.length}</strong> سجل</div>
        <div>تم استخراج هذا التقرير آلياً من نظام إدارة قسم الإنتاج — شركة نتش رول جروث</div>
      </div>
    </div>
  `;
}

export async function exportOperationalReportPDF(params: {
  reportTitle: string;
  reportSubtitle: string;
  filenamePrefix: string;
  startDate: string;
  endDate: string;
  kpis: Array<{ label: string; value: string }>;
  headers: string[];
  rows: Array<Array<string | number>>;
  printedBy?: string;
}): Promise<void> {
  const { reportTitle, reportSubtitle, filenamePrefix, startDate, endDate, kpis, headers, rows, printedBy } = params;
  const html = buildReportDocumentHtml({
    reportCode: filenamePrefix,
    reportTitle,
    reportSubtitle,
    periodLabel: `من ${startDate} إلى ${endDate}`,
    exportedBy: printedBy,
    summaryCards: kpis,
    headers,
    rows
  });
  await renderHtmlToPdf(html, `${filenamePrefix}_${startDate}_to_${endDate}.pdf`);
}

export async function exportReportToPdf(params: {
  reportCode: string;
  reportTitle: string;
  reportSubtitle: string;
  periodLabel: string;
  exportedBy?: string;
  summaryCards: Array<{ label: string; value: string }>;
  headers: string[];
  rows: Array<Array<string | number>>;
  footerSummaryRow?: Array<string | number>;
  filename: string;
}): Promise<void> {
  const html = buildReportDocumentHtml(params);
  await renderHtmlToPdf(html, params.filename);
}

export function printReportDocument(params: {
  reportCode: string;
  reportTitle: string;
  reportSubtitle: string;
  periodLabel: string;
  exportedBy?: string;
  summaryCards: Array<{ label: string; value: string }>;
  headers: string[];
  rows: Array<Array<string | number>>;
  footerSummaryRow?: Array<string | number>;
}): void {
  const html = buildReportDocumentHtml(params);
  printDocumentHtml(html, `${params.reportTitle} (${params.reportCode})`);
}

