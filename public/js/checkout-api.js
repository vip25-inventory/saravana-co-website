/**
 * checkout-api.js – Checkout page: renders order summary from cart, submits order
 */

/**
 * Escape HTML special characters to prevent XSS when inserting
 * cart data (from localStorage) into innerHTML.
 */
function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

document.addEventListener('DOMContentLoaded', () => {
  const cart = Cart.get();

  if (!cart.length) {
    window.location.href = '/cart_page.html'; return;
  }

  renderOrderSummary(cart);
  bindPlaceOrder();
});

function renderOrderSummary(cart) {
  const listEl = document.getElementById('checkout-product-list');
  const subtotalEl = document.getElementById('checkout-subtotal');
  const totalEl = document.getElementById('checkout-total');

  if (listEl) {
    listEl.innerHTML = cart.map(item => `
      <div class="flex items-center gap-4">
        <div class="h-16 w-16 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
          ${item.image_url
            // escapeHTML on URL prevents javascript: href / data: XSS attacks
            ? `<img src="${escapeHTML(item.image_url)}" alt="${escapeHTML(item.name)}" class="h-full w-full object-cover"/>`
            : `<span class="text-3xl">${getCatEmoji(item.category_name)}</span>`}
        </div>
        <div class="flex-1">
          <h4 class="text-sm font-bold truncate">${escapeHTML(item.name)}</h4>
          <div class="flex justify-between items-center mt-1">
            <span class="text-sm">Qty: ${escapeHTML(String(item.quantity))}</span>
            <span class="text-sm font-bold">${API.formatINR(item.price * item.quantity)}</span>
          </div>
        </div>
      </div>`).join('<hr class="border-slate-100 dark:border-slate-800"/>');
  }

  const total = Cart.total();
  if (subtotalEl) subtotalEl.textContent = API.formatINR(total);
  if (totalEl) totalEl.textContent = API.formatINR(total);
}

function bindPlaceOrder() {
  const btn = document.getElementById('place-order-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const name = document.getElementById('checkout-name')?.value.trim();
    const phone = document.getElementById('checkout-phone')?.value.trim();
    const email = document.getElementById('checkout-email')?.value.trim();
    const address = document.getElementById('checkout-address')?.value.trim();
    const city = document.getElementById('checkout-city')?.value.trim();
    const state = document.getElementById('checkout-state')?.value.trim();
    const pincode = document.getElementById('checkout-pincode')?.value.trim();
    const payment = document.querySelector('input[name="payment"]:checked');

    if (!name || !phone || !address || !city || !state || !pincode) {
      API.showToast('Please fill all required fields.', 'error'); return;
    }
    if (!phone.match(/^[6-9]\d{9}$/)) {
      API.showToast('Please enter a valid 10-digit mobile number.', 'error'); return;
    }

    btn.disabled = true;
    btn.textContent = 'Placing Order...';

    try {
      const cart = Cart.get();
      const orderData = {
        customer_name: name,
        phone,
        email: email || null,
        address,
        city,
        state,
        pincode,
        payment_method: payment ? payment.value : 'Cash on Delivery',
        // price intentionally omitted — server always uses DB price (security fix)
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity
        }))
      };

      const result = await API.fetchAPI('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });

      Cart.clear();
      window.location.href = `/order_placed_greet.html?orderId=${result.order_id}&name=${encodeURIComponent(name)}&total=${result.order.total_amount}`;
    } catch (err) {
      API.showToast(`Order failed: ${err.message}`, 'error');
      btn.disabled = false;
      btn.innerHTML = 'Place Order <span class="material-symbols-outlined">chevron_right</span>';
    }
  });
}

function getCatEmoji(cat) {
  const m = { 'Refrigerators':'❄️','Washing Machines':'🧺','Smart TVs':'📺',
    'Sofas':'🛋️','Beds':'🛏️','Air Conditioners':'🌬️','Kitchen Appliances':'🍳','Furniture':'🪑' };
  return m[cat] || '📦';
}
