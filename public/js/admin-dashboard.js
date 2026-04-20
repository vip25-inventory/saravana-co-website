/**
 * admin-dashboard.js – Admin dashboard: stats, orders table, export, auth guard
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!API.requireAdmin()) return;

  // Show admin username
  const uname = sessionStorage.getItem('admin_username') || 'Admin';
  const unameEl = document.getElementById('admin-username');
  if (unameEl) unameEl.textContent = uname;

  // Logout
  document.getElementById('admin-logout-btn')?.addEventListener('click', API.adminLogout);

  await Promise.all([loadStats(), loadOrders()]);

  // Refresh button
  document.getElementById('refresh-orders-btn')?.addEventListener('click', () => loadOrders());

  // Export
  document.getElementById('export-orders-btn')?.addEventListener('click', exportOrders);

  // Search
  document.getElementById('order-search-input')?.addEventListener('input', debounce(async (e) => {
    await loadOrders(1, e.target.value);
  }, 400));
});

async function loadStats() {
  try {
    const stats = await API.fetchAPI('/stats');
    const map = {
      'stat-orders': stats.total_orders,
      'stat-products': stats.total_products,
      'stat-offers': stats.active_offers,
      'stat-revenue': API.formatINR(stats.today_revenue),
      'stat-pending': stats.pending_orders,
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  } catch (e) { console.warn('Stats load failed', e.message); }
}

let currentPage = 1;
async function loadOrders(page = 1, search = '') {
  currentPage = page;
  const tbody = document.getElementById('orders-tbody');
  const countEl = document.getElementById('orders-count');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-8 text-center text-slate-400">Loading orders...</td></tr>`;

  try {
    const q = new URLSearchParams({ page, limit: 20 });
    if (search) q.set('search', search);
    const { orders, pagination } = await API.fetchAPI(`/orders?${q}`);

    if (countEl) countEl.textContent = `${pagination.total} orders`;

    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-8 text-center text-slate-400">No orders found.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const items = o.items ? o.items.map(i => `${i.product_name} (×${i.quantity})`).join(', ') : '—';
      const statusColor = {
        'Delivered': 'bg-green-100 text-green-700',
        'In Transit': 'bg-blue-100 text-blue-700',
        'Processing': 'bg-orange-100 text-orange-700',
        'Pending': 'bg-gray-100 text-gray-700',
        'Cancelled': 'bg-red-100 text-red-700',
      }[o.status] || 'bg-gray-100 text-gray-700';
      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <td class="px-6 py-4 text-sm font-semibold text-primary">#ORD-${o.id}</td>
          <td class="px-6 py-4 text-sm font-medium">${o.customer_name}</td>
          <td class="px-6 py-4 text-sm text-slate-500">${o.phone}</td>
          <td class="px-6 py-4 text-sm text-slate-500 max-w-[200px] truncate" title="${items}">${items}</td>
          <td class="px-6 py-4 text-sm font-bold">${API.formatINR(o.total_amount)}</td>
          <td class="px-6 py-4 text-sm text-slate-500">${API.formatDate(o.created_at)}</td>
          <td class="px-6 py-4">
            <select onchange="updateOrderStatus('${o.id}', this.value)"
              class="px-2 py-1 rounded-full text-[11px] font-bold cursor-pointer border-none outline-none ${statusColor}">
              ${['Pending', 'Processing', 'In Transit', 'Delivered', 'Cancelled'].map(s =>
                `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </td>
          <td class="px-6 py-4">
            <div class="flex gap-2">
              <button onclick="viewOrder('${o.id}')" class="p-2 text-slate-400 hover:text-primary rounded-lg transition-colors" title="View details">
                <span class="material-symbols-outlined text-sm">open_in_new</span>
              </button>
              <button onclick="deleteOrder('${o.id}')" class="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Delete order">
                <span class="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    // Pagination
    renderPagination(pagination);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-8 text-center text-red-500">Error: ${e.message}</td></tr>`;
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    await API.fetchAPI(`/orders/${orderId}/status`, {
      method: 'PUT', body: JSON.stringify({ status })
    });
    API.showToast(`Order #ORD-${orderId} status updated to ${status}`);
  } catch (e) {
    API.showToast(`Update failed: ${e.message}`, 'error');
  }
}

async function deleteOrder(orderId) {
  if (!confirm(`Are you sure you want to completely delete Order #ORD-${orderId}? This cannot be undone.`)) return;
  try {
    await API.fetchAPI(`/orders/${orderId}`, { method: 'DELETE' });
    API.showToast(`Order #ORD-${orderId} deleted successfully.`);
    await loadOrders(currentPage);
  } catch (e) {
    API.showToast(`Delete failed: ${e.message}`, 'error');
  }
}

function viewOrder(orderId) {
  window.open(`/admin/order-detail.html?id=${orderId}`, '_blank');
}

async function exportOrders() {
  try {
    const res = await API.fetchAPI('/export/orders');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Saravana_Orders_${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    API.showToast('Orders exported successfully!');
  } catch (e) {
    API.showToast('Export failed: ' + e.message, 'error');
  }
}

function renderPagination(pagination) {
  const pc = document.getElementById('pagination-container');
  if (!pc || pagination.totalPages <= 1) { if(pc) pc.innerHTML=''; return; }
  let html = '<div class="flex gap-2">';
  if (pagination.page > 1) html += `<button onclick="loadOrders(${pagination.page-1})" class="p-2 rounded-lg border hover:bg-slate-50"><span class="material-symbols-outlined text-sm">chevron_left</span></button>`;
  html += `<span class="px-4 py-2 text-sm font-medium">Page ${pagination.page} / ${pagination.totalPages}</span>`;
  if (pagination.page < pagination.totalPages) html += `<button onclick="loadOrders(${pagination.page+1})" class="p-2 rounded-lg border hover:bg-slate-50"><span class="material-symbols-outlined text-sm">chevron_right</span></button>`;
  html += '</div>';
  pc.innerHTML = html;
}

function debounce(fn, delay) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
