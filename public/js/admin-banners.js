/**
 * admin-banners.js – Banner management (CRUD)
 */

let editBannerId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!API.requireAdmin()) return;
  document.getElementById('admin-logout-btn')?.addEventListener('click', API.adminLogout);
  await loadBanners();
  document.getElementById('add-banner-btn')?.addEventListener('click', () => openBannerModal());
  document.getElementById('banner-modal-close')?.addEventListener('click', closeBannerModal);
  document.getElementById('banner-form')?.addEventListener('submit', saveBanner);
});

async function loadBanners() {
  const tbody = document.getElementById('banners-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400">Loading...</td></tr>`;
  try {
    const { banners } = await API.fetchAPI('/banners/all');
    if (!banners.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400">No banners found. Add one!</td></tr>`;
      return;
    }
    tbody.innerHTML = banners.map(b => `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <td class="px-6 py-4 text-sm font-bold">${b.title}</td>
        <td class="px-6 py-4 text-sm text-slate-500 max-w-[180px] truncate">${b.subtitle || '—'}</td>
        <td class="px-6 py-4 text-sm">${b.sort_order}</td>
        <td class="px-6 py-4">
          <span class="px-2 py-1 rounded-full text-[11px] font-bold ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} uppercase">
            ${b.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td class="px-6 py-4 text-sm text-slate-500">${b.button_text}</td>
        <td class="px-6 py-4">
          <div class="flex gap-2">
            <button onclick="editBanner('${b.id}')" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
              <span class="material-symbols-outlined text-sm">edit</span>
            </button>
            <button onclick="toggleBanner('${b.id}', ${!b.is_active})" class="p-2 text-amber-500 hover:bg-amber-50 rounded-lg" title="${b.is_active ? 'Deactivate' : 'Activate'}">
              <span class="material-symbols-outlined text-sm">${b.is_active ? 'visibility_off' : 'visibility'}</span>
            </button>
            <button onclick="deleteBanner('${b.id}', '${b.title.replace(/'/g,"\\'").replace(/"/g,'&quot;')}')" class="p-2 text-red-400 hover:bg-red-50 rounded-lg">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">${e.message}</td></tr>`;
  }
}

function openBannerModal(banner = null) {
  editBannerId = banner?.id || null;
  const modal = document.getElementById('banner-modal');
  const form = document.getElementById('banner-form');
  if (!modal || !form) return;
  form.reset();
  document.getElementById('banner-modal-title').textContent = editBannerId ? 'Edit Banner' : 'Add Banner';
  if (banner) {
    document.getElementById('banner-title').value = banner.title || '';
    document.getElementById('banner-subtitle').value = banner.subtitle || '';
    document.getElementById('banner-btn-text').value = banner.button_text || 'Shop Now';
    document.getElementById('banner-btn-link').value = banner.button_link || '/lists.html';
    document.getElementById('banner-image-url').value = banner.image_url || '';
    document.getElementById('banner-sort-order').value = banner.sort_order || 0;
    document.getElementById('banner-active').checked = !!banner.is_active;
  }
  modal.classList.remove('hidden');
}

function closeBannerModal() {
  document.getElementById('banner-modal')?.classList.add('hidden');
  editBannerId = null;
}

async function editBanner(id) {
  try {
    const { banners } = await API.fetchAPI('/banners/all');
    const banner = banners.find(b => String(b.id) === String(id));
    if (banner) openBannerModal(banner);
    else API.showToast('Banner not found.', 'error');
  } catch (e) { API.showToast('Failed to load banner: ' + e.message, 'error'); }
}

async function toggleBanner(id, isActive) {
  try {
    await API.fetchAPI(`/banners/${id}`, { method: 'PUT', body: JSON.stringify({ is_active: isActive }) });
    API.showToast(`Banner ${isActive ? 'activated' : 'deactivated'}.`);
    await loadBanners();
  } catch (e) { API.showToast('Failed: ' + e.message, 'error'); }
}

async function saveBanner(e) {
  e.preventDefault();
  const btn = document.getElementById('save-banner-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  const data = {
    title: document.getElementById('banner-title')?.value.trim(),
    subtitle: document.getElementById('banner-subtitle')?.value.trim(),
    button_text: document.getElementById('banner-btn-text')?.value.trim() || 'Shop Now',
    button_link: document.getElementById('banner-btn-link')?.value.trim() || '/lists.html',
    image_url: document.getElementById('banner-image-url')?.value.trim() || null,
    sort_order: parseInt(document.getElementById('banner-sort-order')?.value || 0),
    is_active: document.getElementById('banner-active')?.checked,
  };
  try {
    if (editBannerId) {
      await API.fetchAPI(`/banners/${editBannerId}`, { method: 'PUT', body: JSON.stringify(data) });
      API.showToast('Banner updated!');
    } else {
      await API.fetchAPI('/banners', { method: 'POST', body: JSON.stringify(data) });
      API.showToast('Banner created!');
    }
    closeBannerModal();
    await loadBanners();
  } catch (err) {
    API.showToast('Error: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Banner'; }
  }
}

async function deleteBanner(id, title) {
  if (!confirm(`Delete banner "${title}"? This cannot be undone.`)) return;
  try {
    await API.fetchAPI(`/banners/${id}`, { method: 'DELETE' });
    API.showToast('Banner deleted.');
    await loadBanners();
  } catch (e) { API.showToast('Delete failed: ' + e.message, 'error'); }
}
