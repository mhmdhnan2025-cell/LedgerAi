/**
 * Robust CSV & Excel Export Utility
 * Handles UTF-8 BOM (\uFEFF) for Arabic, Urdu and UTF-8 characters,
 * proper quoting, commas, and blob downloads.
 */

export interface CsvColumn<T = any> {
  header: string;
  accessor: (item: T) => string | number | null | undefined;
}

export function exportToCsv<T = any>(filename: string, data: T[], columns: CsvColumn<any>[]): boolean {
  if (!data || data.length === 0) {
    console.warn('No data available to export.');
    return false;
  }

  // Header row
  const headerLine = columns
    .map((col) => `"${String(col.header).replace(/"/g, '""')}"`)
    .join(',');

  // Data rows
  const dataLines = data.map((item) =>
    columns
      .map((col) => {
        const val = col.accessor(item);
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  // Prepend UTF-8 BOM so Excel opens Urdu and Arabic cleanly
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 200);

  return true;
}
