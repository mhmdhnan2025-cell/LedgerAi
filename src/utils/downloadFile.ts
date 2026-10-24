/**
 * Robust Client-Side File Downloader
 * Fetches files via Blob to guarantee:
 * 1. Works on all mobile and desktop browsers (iOS Safari, Android Chrome, Windows, Mac)
 * 2. Properly passes company ID and authentication headers
 * 3. Does not get blocked by popup blockers or data URI restrictions
 * 4. Fallback to direct navigation / window.open if network fetch fails
 */

export async function downloadReportFile(url: string, filename: string): Promise<boolean> {
  const companyId = localStorage.getItem('erp_company_id') || localStorage.getItem('companyId') || 'comp-muocj00t-j3co';
  const token = localStorage.getItem('token') || localStorage.getItem('erp_auth_token') || '';

  const sep = url.includes('?') ? '&' : '?';
  const finalUrl = `${url}${sep}companyId=${encodeURIComponent(companyId)}`;

  try {
    const headers: Record<string, string> = {
      'x-company-id': companyId,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(finalUrl, { headers });
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 10000);

    return true;
  } catch (err) {
    console.warn('[downloadReportFile] Blob fetch failed, falling back to window.open:', err);
    window.open(finalUrl, '_blank');
    return false;
  }
}
