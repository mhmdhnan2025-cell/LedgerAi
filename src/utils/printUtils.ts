/**
 * Shared clean printing & PDF export utility for ERP documents, bills, and ledgers.
 * Isolates the target printable container, removes unneeded UI chrome, sets @page rules,
 * and sets the document title so that browser "Save as PDF" automatically uses the proper file name.
 */
export function printCleanDocument(elementId: string, documentTitle?: string): void {
  const srcEl = document.getElementById(elementId);
  if (!srcEl) {
    if (documentTitle) document.title = documentTitle;
    window.print();
    return;
  }

  // Remove any previously orphaned print containers
  const oldContainer = document.getElementById('active-print-container');
  if (oldContainer) oldContainer.remove();

  const printContainer = document.createElement('div');
  printContainer.id = 'active-print-container';
  printContainer.innerHTML = srcEl.outerHTML;

  // Clean out action buttons, icons that shouldn't print, and hidden markers
  printContainer.querySelectorAll('.print\\:hidden, .print-hidden, button, input[type="file"]').forEach((el) => el.remove());

  const oldStyle = document.getElementById('dynamic-print-page-style');
  if (oldStyle) oldStyle.remove();

  const pageStyle = document.createElement('style');
  pageStyle.id = 'dynamic-print-page-style';
  pageStyle.textContent = `
    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }
    @media print {
      html, body {
        background: white !important;
        color: black !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
      }
      #active-print-container {
        display: block !important;
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        color: black !important;
      }
      #active-print-container * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-shadow: none !important;
      }
      #active-print-container table {
        width: 100% !important;
        max-width: 100% !important;
        border-collapse: collapse !important;
        table-layout: auto !important;
      }
      #active-print-container th, #active-print-container td {
        word-break: normal !important;
        overflow-wrap: break-word !important;
      }
      #active-print-container tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .overflow-x-auto, .overflow-y-auto {
        overflow: visible !important;
      }
    }
  `;

  const originalTitle = document.title;
  if (documentTitle) {
    // Sanitize title for filename safety
    const safeTitle = documentTitle.replace(/[/\\?%*:|"<>]/g, '_').trim();
    document.title = safeTitle;
  }

  document.head.appendChild(pageStyle);
  document.body.appendChild(printContainer);
  document.body.classList.add('is-printing-slip');

  const cleanup = () => {
    document.body.classList.remove('is-printing-slip');
    if (documentTitle) {
      document.title = originalTitle;
    }
    if (printContainer && printContainer.parentNode) {
      printContainer.remove();
    }
    if (pageStyle && pageStyle.parentNode) {
      pageStyle.remove();
    }
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.focus();
  setTimeout(() => {
    window.print();
    setTimeout(cleanup, 2500);
  }, 150);
}
