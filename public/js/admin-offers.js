/**
 * admin-offers.js – Offer management (CRUD)
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!API.requireAdmin()) return;
  document.getElementById('admin-logout-btn')?.addEventListener('click', API.adminLogout);
  await loadOffers();
  document.getElementById('add-offer-btn')?.addEventListener('click', () => openOfferModal());
  document.getElementById('offer-modal-close')?.addEventListener('click', closeOfferModal);
  document.getElementById('offer-form')?.addEventListener('submit', saveOffer);
});

let editOfferId = null;

async function loadOffers() {
  const tbody = document.getElementById('offers-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400">Loading...</td></tr>`;
  try {
    const { offers } = await API.fetchAPI('/offers/all');
    if (!offers.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400">No offers found.</td></tr>`;
      return;
    }
    tbody.innerHTML = offers.map(o => `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <td class="px-6 py-4 text-sm font-bold">${o.title}</td>
        <td class="px-6 py-4 text-sm">${o.discount_percentage}%</td>
        <td class="px-6 py-4 text-sm text-slate-500">${o.start_date}</td>
        <td class="px-6 py-4 text-sm text-slate-500">${o.end_date}</td>
        <td class="px-6 py-4">
          <span class="px-2 py-1 rounded-full text-[11px] font-bold ${o.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} uppercase">
            ${o.is_active ? 'Active' : 'Inactive'}</span>
        </td>
        <td class="px-6 py-4">
          <div class="flex gap-2">
            <button onclick="editOffer('${o.id}')" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
              <span class="material-symbols-outlined text-sm">edit</span></button>
            <button onclick="deleteOffer('${o.id}', '${o.title.replace(/'/g,"\\'").replace(/"/g,"&quot;")}', this)" class="p-2 text-red-400 hover:bg-red-50 rounded-lg">
              <span class="material-symbols-outlined text-sm">delete</span></button>
          </div>
        </td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">${e.message}</td></tr>`;
  }
}

function openOfferModal(offer = null) {
  editOfferId = offer?.id || null;
  const modal = document.getElementById('offer-modal');
  const form = document.getElementById('offer-form');
  if (!modal || !form) return;
  form.reset();
  document.getElementById('offer-modal-title').textContent = editOfferId ? 'Edit Offer' : 'Create Offer';
  if (offer) {
    document.getElementById('offer-title').value = offer.title || '';
    document.getElementById('offer-description').value = offer.description || '';
    document.getElementById('offer-discount').value = offer.discount_percentage || '';
    document.getElementById('offer-start').value = offer.start_date || '';
    document.getElementById('offer-end').value = offer.end_date || '';
    document.getElementById('offer-active').checked = !!offer.is_active;
  }
  modal.classList.remove('hidden');
}

function closeOfferModal() {
  document.getElementById('offer-modal')?.classList.add('hidden');
  editOfferId = null;
}

async function editOffer(id) {
  const { offers } = await API.fetchAPI('/offers/all');
  const offer = offers.find(o => String(o.id) === String(id));
  if (offer) openOfferModal(offer);
  else API.showToast('Offer not found.', 'error');
}

async function saveOffer(e) {
  e.preventDefault();
  const btn = document.getElementById('save-offer-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  const data = {
    title: document.getElementById('offer-title')?.value.trim(),
    description: document.getElementById('offer-description')?.value.trim(),
    discount_percentage: document.getElementById('offer-discount')?.value,
    start_date: document.getElementById('offer-start')?.value,
    end_date: document.getElementById('offer-end')?.value,
    is_active: document.getElementById('offer-active')?.checked,
  };
  try {
    if (editOfferId) {
      await API.fetchAPI(`/offers/${editOfferId}`, { method: 'PUT', body: JSON.stringify(data) });
      API.showToast('Offer updated!');
    } else {
      await API.fetchAPI('/offers', { method: 'POST', body: JSON.stringify(data) });
      API.showToast('Offer created!');
    }
    closeOfferModal();
    await loadOffers();
  } catch (err) {
    API.showToast('Error: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Offer'; }
  }
}

async function deleteOffer(id, title) {
  if (!confirm(`Delete offer "${title}"?`)) return;
  try {
    await API.fetchAPI(`/offers/${id}`, { method: 'DELETE' });
    API.showToast(`Offer deleted.`);
    await loadOffers();
  } catch (e) { API.showToast('Failed: ' + e.message, 'error'); }
}
