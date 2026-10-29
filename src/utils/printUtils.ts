/**
 * Shared clean printing & PDF export utility for ERP documents, bills, and ledgers.
 * Isolates the target printable container, removes unneeded UI chrome, sets @page rules,
 * strips height/scroll restrictions to allow multi-page pagination without row-clipping or footer overlap,
 * resets sticky headers so they never float on top of data rows, and sets the document title.
 */
export function printCleanDocument(
  elementId: string,
  documentTitle?: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
): void {
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

  // Clean out action buttons, icons, filters, inputs that shouldn't print
  printContainer
    .querySelectorAll('.print\\:hidden, .print-hidden, .print-hide, button, input[type="file"], input[type="checkbox"], input[type="radio"]')
    .forEach((el) => el.remove());

  // Clean out any rogue <style> tags from the cloned tree so component-specific print hacks don't interfere
  printContainer.querySelectorAll('style').forEach((el) => el.remove());

  // Deeply reset all height, max-height, overflow and sticky positioning on every element in the cloned tree
  printContainer.querySelectorAll('*').forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.style) {
      if (htmlEl.style.maxHeight) htmlEl.style.maxHeight = 'none';
      if (htmlEl.style.height && htmlEl.style.height !== 'auto') htmlEl.style.height = 'auto';
      if (htmlEl.style.overflow) htmlEl.style.overflow = 'visible';
      if (htmlEl.style.position === 'sticky' || htmlEl.style.position === 'fixed') {
        htmlEl.style.position = 'static';
      }
      if (htmlEl.style.top) htmlEl.style.top = 'auto';
      if (htmlEl.style.bottom) htmlEl.style.bottom = 'auto';
    }
  });

  const oldStyle = document.getElementById('dynamic-print-page-style');
  if (oldStyle) oldStyle.remove();

  const isLandscape = orientation === 'landscape';
  const pageStyle = document.createElement('style');
  pageStyle.id = 'dynamic-print-page-style';
  pageStyle.textContent = `
    @page {
      size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
      margin: ${isLandscape ? '5mm 6mm' : '7mm 6mm'};
    }
    @media print {
      html, body {
        background: white !important;
        color: black !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
      }

      /* When printing isolated container, completely hide original #root */
      body.is-printing-slip #root,
      body.is-printing-slip > *:not(#active-print-container):not(#dynamic-print-page-style) {
        display: none !important;
        visibility: hidden !important;
      }

      #active-print-container {
        display: block !important;
        visibility: visible !important;
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        color: black !important;
        overflow: visible !important;
      }

      #active-print-container * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }

      /* CRITICAL: Overwrite any scroll container, height limits, and overflow so all rows paginate naturally */
      #active-print-container div,
      #active-print-container section,
      #active-print-container [class*="max-h-"],
      #active-print-container [class*="overflow-"],
      #active-print-container .overflow-x-auto,
      #active-print-container .overflow-y-auto,
      #active-print-container .party-rec-table-container {
        max-height: none !important;
        min-height: 0 !important;
        height: auto !important;
        overflow: visible !important;
        overflow-x: visible !important;
        overflow-y: visible !important;
        position: static !important;
      }

      /* CRITICAL: Reset sticky/fixed headers & footers so they never float on data rows */
      #active-print-container thead,
      #active-print-container tfoot,
      #active-print-container tr,
      #active-print-container th,
      #active-print-container td,
      #active-print-container [class*="sticky"],
      #active-print-container [class*="fixed"],
      #active-print-container .party-rec-table thead,
      #active-print-container .party-rec-table thead th,
      #active-print-container .party-rec-table tfoot,
      #active-print-container .party-rec-table tfoot td {
        position: static !important;
        top: auto !important;
        bottom: auto !important;
        left: auto !important;
        right: auto !important;
        transform: none !important;
        box-shadow: none !important;
        z-index: auto !important;
      }

      /* Clean table formatting */
      #active-print-container table {
        width: 100% !important;
        max-width: 100% !important;
        border-collapse: collapse !important;
        table-layout: auto !important;
        page-break-inside: auto !important;
      }

      #active-print-container thead {
        display: table-header-group !important;
      }

      #active-print-container tbody {
        display: table-row-group !important;
      }

      #active-print-container tfoot {
        display: table-footer-group !important;
      }

      #active-print-container tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      #active-print-container th,
      #active-print-container td {
        word-break: normal !important;
        overflow-wrap: break-word !important;
      }

      /* On wide tables, ensure cells don't force overflow */
      #active-print-container [class*="min-w-"] {
        min-width: 0 !important;
      }

      /* Action controls hide */
      #active-print-container button,
      #active-print-container .print\\:hidden,
      #active-print-container .print-hidden,
      #active-print-container .print-hide {
        display: none !important;
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
