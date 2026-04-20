/**
 * admin-export.js – Wire export page to /api/export/orders
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!API.requireAdmin()) return;
  document.getElementById('admin-logout-btn')?.addEventListener('click', API.adminLogout);

  document.getElementById('export-btn')?.addEventListener('click', exportOrders);
});

async function exportOrders() {
  const btn = document.getElementById('export-btn');
  const statusEl = document.getElementById('export-status');
  const dateRange = document.getElementById('export-date-range')?.value;
  const status = document.getElementById('export-status-filter')?.value;

  const params = new URLSearchParams();

  // Map preset date ranges to actual dates
  if (dateRange && dateRange !== 'all') {
    const now = new Date();
    let from;
    if (dateRange === '30') {
      from = new Date(now - 30 * 86400000);
    } else if (dateRange === '90') {
      from = new Date(now - 90 * 86400000);
    } else if (dateRange === 'year') {
      from = new Date(now.getFullYear(), 0, 1);
    }
    if (from) params.set('date_from', from.toISOString().slice(0, 10));
    params.set('date_to', now.toISOString().slice(0, 10));
  }

  if (status) params.set('status', status);

  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  if (statusEl) statusEl.textContent = 'Preparing your file...';

  try {
    const res = await API.fetchAPI(`/export/orders?${params}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Saravana_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (statusEl) statusEl.textContent = '✅ Export downloaded successfully!';
    API.showToast('Orders exported successfully!');
  } catch (e) {
    if (statusEl) statusEl.textContent = '❌ Export failed: ' + e.message;
    API.showToast('Export failed: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Export Orders'; }
  }
}
