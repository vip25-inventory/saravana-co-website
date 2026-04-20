/**
 * admin-products.js – Product management CRUD
 */

let editingId = null;
let allCategories = [];
let allProductTypes = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!API.requireAdmin()) return;

  document.getElementById('admin-logout-btn')?.addEventListener('click', API.adminLogout);

  await loadCategories();
  await loadProducts();

  document.getElementById('add-product-btn')?.addEventListener('click', () => openModal());
  document.getElementById('product-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('product-form')?.addEventListener('submit', saveProduct);
  document.getElementById('product-search-input')?.addEventListener('input', debounce(async e => {
    await loadProducts(e.target.value);
  }, 400));

  // Bulk Import: button → hidden file input → upload on change
  const bulkBtn = document.getElementById('bulk-import-btn');
  const bulkInput = document.getElementById('bulk-file-input');
  if (bulkBtn && bulkInput) {
    bulkBtn.addEventListener('click', () => bulkInput.click());
    bulkInput.addEventListener('change', async () => {
      const file = bulkInput.files[0];
      if (!file) return;
      bulkBtn.disabled = true;
      bulkBtn.textContent = 'Uploading...';
      try {
        const fd = new FormData();
        fd.append('file', file);
        const token = sessionStorage.getItem('admin_token');
        const res = await fetch('/api/products/bulk-upload', {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: fd
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        const modal = document.getElementById('bulk-result-modal');
        const content = document.getElementById('bulk-result-content');
        if (content) {
          content.innerHTML = `
            <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <p class="font-bold text-green-700 dark:text-green-400">✅ ${data.success_count} product(s) imported successfully</p>
            </div>
            ${data.failed_rows?.length ? `
              <div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <p class="font-bold text-red-600 dark:text-red-400 mb-2">❌ ${data.failed_rows.length} row(s) failed:</p>
                <ul class="list-disc pl-4 space-y-1 text-red-600 dark:text-red-400">
                  ${data.failed_rows.map(r => `<li>${r}</li>`).join('')}
                </ul>
              </div>` : ''}
          `;
        }
        if (modal) modal.classList.remove('hidden');
        await loadProducts();
      } catch (err) {
        API.showToast('Bulk import failed: ' + err.message, 'error');
      } finally {
        bulkBtn.disabled = false;
        bulkBtn.innerHTML = '<span class="material-symbols-outlined text-lg">file_upload</span> Bulk Import';
        bulkInput.value = '';
      }
    });
  }

  // Load product types when category changes in form
  document.getElementById('form-category')?.addEventListener('change', async (e) => {
    await loadFormProductTypes(e.target.value);
  });
});

async function loadCategories() {
  try {
    const { categories } = await API.fetchAPI('/categories');
    allCategories = categories;
    const sel = document.getElementById('form-category');
    if (sel) sel.innerHTML = '<option value="">Select Category</option>' +
      categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    // Filter dropdown
    const filterSel = document.getElementById('filter-category');
    if (filterSel) filterSel.innerHTML = '<option value="">All Categories</option>' +
      categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    filterSel?.addEventListener('change', () => loadProducts('', filterSel.value));
  } catch (e) { console.error(e); }
}

async function loadFormProductTypes(categoryId) {
  const sel = document.getElementById('form-product-type');
  if (!sel || !categoryId) return;
  try {
    const { product_types } = await API.fetchAPI(`/product-types?category_id=${categoryId}`);
    sel.innerHTML = '<option value="">Select Type (optional)</option>' +
      (product_types || []).map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  } catch (e) {}
}

async function loadProducts(search = '', categoryId = '') {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-slate-400">Loading...</td></tr>`;
  try {
    const q = new URLSearchParams({ limit: 50 });
    if (search) q.set('search', search);
    if (categoryId) q.set('category_id', categoryId);
    const { products } = await API.fetchAPI(`/products?${q}`);
    const countLabel = document.getElementById('products-count-label');
    if (countLabel) countLabel.textContent = `${products.length} product(s) found`;
    if (!products.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-slate-400">No products found.</td></tr>`;
      return;
    }
    tbody.innerHTML = products.map(p => `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <td class="px-6 py-4 text-sm font-semibold">#${p.id}</td>
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            ${p.image_urls?.[0] ? `<img src="${p.image_urls[0]}" class="w-10 h-10 rounded-lg object-cover"/>` : '<div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xl">📦</div>'}
            <span class="font-medium text-sm">${p.name}</span>
          </div>
        </td>
        <td class="px-6 py-4 text-sm text-slate-500">${p.category_name || '—'}</td>
        <td class="px-6 py-4 text-sm text-slate-500">${p.product_type_name || '—'}</td>
        <td class="px-6 py-4 text-sm font-bold">${API.formatINR(p.price)}</td>
        <td class="px-6 py-4 text-sm">${p.stock || 0}</td>
        <td class="px-6 py-4">
          <div class="flex gap-2">
            <button onclick="editProduct('${p.id}')" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
              <span class="material-symbols-outlined text-sm">edit</span>
            </button>
            <button onclick="deleteProduct('${p.id}', '${p.name.replace(/'/g,"\\'").replace(/"/g,"&quot;")}', this)" class="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-500">${e.message}</td></tr>`;
  }
}

function openModal(product = null) {
  editingId = product?.id || null;
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('product-form');
  if (!modal || !form) return;

  form.reset();
  if (title) title.textContent = editingId ? 'Edit Product' : 'Add Product';

  if (product) {
    document.getElementById('form-name').value = product.name || '';
    document.getElementById('form-price').value = product.price || '';
    document.getElementById('form-description').value = product.description || '';
    document.getElementById('form-stock').value = product.stock || 0;
    document.getElementById('form-image-urls').value = (product.image_urls || []).join(', ');
    document.getElementById('form-top-selling').checked = !!product.is_top_selling;
    document.getElementById('form-new-arrival').checked = !!product.is_new_arrival;
    if (product.category_id) {
      document.getElementById('form-category').value = product.category_id;
      loadFormProductTypes(product.category_id).then(() => {
        if (product.product_type_id) document.getElementById('form-product-type').value = product.product_type_id;
      });
    }
  }
  modal.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('product-modal')?.classList.add('hidden');
  editingId = null;
}

async function editProduct(id) {
  try {
    const { product } = await API.fetchAPI(`/products/${id}`);
    openModal(product);
  } catch (e) { API.showToast('Failed to load product: ' + e.message, 'error'); }
}

async function saveProduct(e) {
  e.preventDefault();
  const btn = document.getElementById('save-product-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  const data = {
    name: document.getElementById('form-name')?.value.trim(),
    price: document.getElementById('form-price')?.value,
    category_id: document.getElementById('form-category')?.value || null,
    product_type_id: document.getElementById('form-product-type')?.value || null,
    description: document.getElementById('form-description')?.value.trim(),
    stock: document.getElementById('form-stock')?.value || 0,
    image_urls: document.getElementById('form-image-urls')?.value || '',
    is_top_selling: document.getElementById('form-top-selling')?.checked,
    is_new_arrival: document.getElementById('form-new-arrival')?.checked,
  };

  try {
    if (editingId) {
      await API.fetchAPI(`/products/${editingId}`, { method: 'PUT', body: JSON.stringify(data) });
      API.showToast('Product updated successfully!');
    } else {
      await API.fetchAPI('/products', { method: 'POST', body: JSON.stringify(data) });
      API.showToast('Product added successfully!');
    }
    closeModal();
    await loadProducts();
  } catch (err) {
    API.showToast('Error: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Product'; }
  }
}

async function deleteProduct(id, name, btn) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await API.fetchAPI(`/products/${id}`, { method: 'DELETE' });
    API.showToast(`"${name}" deleted.`);
    await loadProducts();
  } catch (e) { API.showToast('Delete failed: ' + e.message, 'error'); }
}

function debounce(fn, delay) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
