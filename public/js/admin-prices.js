/**
 * admin-prices.js – Price control: single update, selective, global discount, undo
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!API.requireAdmin()) return;
  document.getElementById('admin-logout-btn')?.addEventListener('click', API.adminLogout);

  await loadProductsForPrice();

  document.getElementById('single-price-form')?.addEventListener('submit', singlePriceUpdate);
  document.getElementById('global-discount-form')?.addEventListener('submit', globalDiscount);
  document.getElementById('undo-offer-btn')?.addEventListener('click', undoOffer);
  document.getElementById('selective-form')?.addEventListener('submit', selectiveDiscount);
});

async function loadProductsForPrice() {
  try {
    const { products } = await API.fetchAPI('/products?limit=200');
    const sel = document.getElementById('single-product-select');
    const selSel = document.getElementById('selective-product-select');
    const opts = products.map(p => `<option value="${p.id}">${p.name} — ${API.formatINR(p.price)}</option>`).join('');
    if (sel) sel.innerHTML = '<option value="">— Select Product —</option>' + opts;
    if (selSel) selSel.innerHTML = opts;
  } catch (e) { console.error(e); }
}

async function singlePriceUpdate(e) {
  e.preventDefault();
  const productId = document.getElementById('single-product-select')?.value;
  const price = document.getElementById('single-new-price')?.value;
  if (!productId || !price) { API.showToast('Select a product and enter price.', 'error'); return; }
  try {
    const { product } = await API.fetchAPI('/prices/single', {
      method: 'PUT', body: JSON.stringify({ product_id: productId, price: parseFloat(price) })
    });
    API.showToast(`${product.name} price updated to ${API.formatINR(product.price)}`);
    await loadProductsForPrice();
    document.getElementById('single-price-form')?.reset();
  } catch (e) { API.showToast('Error: ' + e.message, 'error'); }
}

async function selectiveDiscount(e) {
  e.preventDefault();
  const sel = document.getElementById('selective-product-select');
  const productIds = Array.from(sel?.selectedOptions || []).map(o => o.value);
  const type = document.querySelector('input[name="selective-type"]:checked')?.value;
  const value = document.getElementById('selective-value')?.value;
  if (!productIds.length) { API.showToast('Select at least one product.', 'error'); return; }
  if (!type || !value) { API.showToast('Select discount type and enter value.', 'error'); return; }
  try {
    const { count } = await API.fetchAPI('/prices/selective', {
      method: 'POST', body: JSON.stringify({ product_ids: productIds, discount_type: type, discount_value: parseFloat(value) })
    });
    API.showToast(`Discount applied to ${count} products!`);
    await loadProductsForPrice();
  } catch (e) { API.showToast('Error: ' + e.message, 'error'); }
}

async function globalDiscount(e) {
  e.preventDefault();
  const pct = document.getElementById('global-discount-pct')?.value;
  if (!pct) { API.showToast('Enter a discount percentage.', 'error'); return; }
  if (!confirm(`Apply ${pct}% discount to ALL products? This can be undone.`)) return;
  try {
    const result = await API.fetchAPI('/prices/global-discount', {
      method: 'POST', body: JSON.stringify({ discount_percentage: parseFloat(pct) })
    });
    API.showToast(`${result.message}`);
    await loadProductsForPrice();
    document.getElementById('global-discount-form')?.reset();
  } catch (e) { API.showToast('Error: ' + e.message, 'error'); }
}

async function undoOffer() {
  if (!confirm('Restore ALL products to their original prices?')) return;
  try {
    const result = await API.fetchAPI('/prices/undo-offer', { method: 'POST', body: '{}' });
    API.showToast(`${result.message} (${result.restored_count} products restored)`);
    await loadProductsForPrice();
  } catch (e) { API.showToast('Error: ' + e.message, 'error'); }
}
