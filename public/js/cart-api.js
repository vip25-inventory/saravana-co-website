/**
 * cart-api.js – Cart page logic (reads from localStorage, renders cart)
 */

document.addEventListener('DOMContentLoaded', () => {
  renderCartPage();
});

function renderCartPage() {
  const cart = Cart.get();
  const container = document.getElementById('cart-items-container');
  const emptyState = document.getElementById('empty-cart-state');
  const cartSection = document.getElementById('cart-section');
  const subtotalEl = document.getElementById('cart-subtotal');
  const totalEl = document.getElementById('cart-total');

  if (!cart.length) {
    if (emptyState) emptyState.style.display = 'flex';
    if (cartSection) cartSection.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (cartSection) cartSection.style.display = '';

  if (!container) return;

  container.innerHTML = cart.map(item => `
    <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6" id="cart-item-${item.id}">
      <div class="size-32 shrink-0 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
        ${item.image_url
          ? `<img src="${item.image_url}" alt="${item.name}" class="w-full h-full object-cover"/>`
          : `<span class="text-5xl">${getCatEmoji(item.category_name)}</span>`}
      </div>
      <div class="flex-1 w-full">
        <div class="flex justify-between items-start mb-1">
          <div>
            <h3 class="font-bold text-xl">${item.name}</h3>
            <p class="text-sm text-slate-500 uppercase tracking-wider">${item.category_name || ''}</p>
          </div>
          <button onclick="removeCartItem(${item.id})" class="p-2 text-slate-300 hover:text-red-500 transition-colors">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-4 mt-4">
          <div class="flex items-center bg-slate-50 dark:bg-slate-800 rounded-full p-1 border border-slate-100 dark:border-slate-700">
            <button onclick="changeQty(${item.id}, ${item.quantity - 1})" class="size-8 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all">
              <span class="material-symbols-outlined text-sm">remove</span>
            </button>
            <span class="w-10 text-center font-bold" id="qty-${item.id}">${item.quantity}</span>
            <button onclick="changeQty(${item.id}, ${item.quantity + 1})" class="size-8 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all">
              <span class="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
          <div class="text-right">
            <p class="font-mono text-lg font-bold" id="line-${item.id}">${API.formatINR(item.price * item.quantity)}</p>
            <p class="text-xs text-slate-400">${API.formatINR(item.price)} each</p>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  updateTotals();
}

function updateTotals() {
  const total = Cart.total();
  const subtotalEl = document.getElementById('cart-subtotal');
  const totalEl = document.getElementById('cart-total');
  const countEl = document.getElementById('cart-item-count');
  if (subtotalEl) subtotalEl.textContent = API.formatINR(total);
  if (totalEl) totalEl.textContent = API.formatINR(total);
  if (countEl) countEl.textContent = Cart.count();
}

function changeQty(productId, qty) {
  if (qty < 1) { removeCartItem(productId); return; }
  Cart.updateQuantity(productId, qty);
  const cart = Cart.get();
  const item = cart.find(i => i.id === productId);
  if (item) {
    const qtyEl = document.getElementById(`qty-${productId}`);
    const lineEl = document.getElementById(`line-${productId}`);
    if (qtyEl) qtyEl.textContent = item.quantity;
    if (lineEl) lineEl.textContent = API.formatINR(item.price * item.quantity);
  }
  updateTotals();
}

function removeCartItem(productId) {
  Cart.remove(productId);
  const el = document.getElementById(`cart-item-${productId}`);
  if (el) el.remove();
  updateTotals();
  if (Cart.get().length === 0) {
    const emptyState = document.getElementById('empty-cart-state');
    const cartSection = document.getElementById('cart-section');
    if (emptyState) emptyState.style.display = 'flex';
    if (cartSection) cartSection.style.display = 'none';
  }
}

function getCatEmoji(cat) {
  const m = { 'Refrigerators':'❄️','Washing Machines':'🧺','Smart TVs':'📺',
    'Sofas':'🛋️','Beds':'🛏️','Air Conditioners':'🌬️','Kitchen Appliances':'🍳','Furniture':'🪑' };
  return m[cat] || '📦';
}

// Checkout redirect
document.getElementById('checkout-btn')?.addEventListener('click', () => {
  if (Cart.count() === 0) { API.showToast('Your cart is empty!', 'error'); return; }
  window.location.href = '/checkout.html';
});
