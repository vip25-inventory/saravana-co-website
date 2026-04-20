/**
 * cart.js – Cart state management using localStorage
 * Saravana & Co
 */

const CART_KEY = 'spl_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(product) {
  // product: { id, name, price, image_url, quantity? }
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + (product.quantity || 1);
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      image_url: product.image_url || '',
      category_name: product.category_name || '',
      quantity: product.quantity || 1,
    });
  }
  saveCart(cart);
  return cart;
}

function removeFromCart(productId) {
  const cart = getCart().filter(item => item.id !== productId);
  saveCart(cart);
  return cart;
}

function updateQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) {
    item.quantity = Math.max(1, parseInt(quantity));
    saveCart(cart);
  }
  return cart;
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-count-badge');
  const count = getCartCount();
  badges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
}

// Call on page load
document.addEventListener('DOMContentLoaded', updateCartBadge);

window.Cart = {
  get: getCart,
  add: addToCart,
  remove: removeFromCart,
  updateQuantity,
  clear: clearCart,
  total: getCartTotal,
  count: getCartCount,
};
