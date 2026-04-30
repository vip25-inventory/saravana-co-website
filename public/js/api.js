/**
 * api.js – Shared API client for Saravana & Co frontend
 * SECURITY HARDENED:
 *  - Token expiry enforced client-side (mirrors 2h JWT lifetime)
 *  - On any 401, token is cleared immediately and admin is redirected
 *  - requireAdmin() checks both token presence AND expiry
 *  - Logout clears both token and expiry timestamp
 */

const API_BASE = '/api';

// JWT lifetime in ms — must match server's ACCESS_TOKEN_LIFETIME (2 hours)
const TOKEN_LIFETIME_MS = 2 * 60 * 60 * 1000;

/**
 * Make an API request
 * @param {string} endpoint - API endpoint (e.g. '/products', '/orders')
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>} JSON response
 */
async function fetchAPI(endpoint, options = {}) {
  const headers = { ...options.headers };

  // Only set JSON content-type when body is a plain string (not FormData)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Inject JWT for admin pages — check expiry first
  const token = _getValidToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    // Session expired or token invalid — clear and redirect immediately
    if (window.location.pathname.includes('/admin/')) {
      _clearToken();
      window.location.href = '/admin/login.html';
      return;
    }
  }

  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch { err = { error: `HTTP ${res.status}` }; }
    throw new Error(err.error || 'An error occurred');
  }

  // Excel/CSV export returns binary – caller handles it
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('spreadsheetml') || ct.includes('text/csv') || ct.includes('octet-stream')) {
    return res;
  }

  return res.json();
}

/**
 * Retrieve the stored token only if it has not expired.
 * Returns null if token is missing or stale.
 */
function _getValidToken() {
  const token  = sessionStorage.getItem('admin_token');
  const expiry = parseInt(sessionStorage.getItem('admin_token_expiry') || '0', 10);

  if (!token) return null;

  // If expiry is missing (old session) or past, treat as expired
  if (!expiry || Date.now() > expiry) {
    _clearToken();
    return null;
  }

  return token;
}

/**
 * Store a JWT token with an expiry timestamp.
 * @param {string} token - JWT string from login response
 */
function _storeToken(token) {
  sessionStorage.setItem('admin_token', token);
  sessionStorage.setItem('admin_token_expiry', String(Date.now() + TOKEN_LIFETIME_MS));
}

/**
 * Remove token + expiry from sessionStorage.
 */
function _clearToken() {
  sessionStorage.removeItem('admin_token');
  sessionStorage.removeItem('admin_token_expiry');
}

/**
 * Check admin auth – redirect to login if no token or token expired.
 * Call at the top of every admin page.
 */
function requireAdmin() {
  const token = _getValidToken();
  if (!token) {
    window.location.href = '/admin/login.html';
    return false;
  }
  return true;
}

/**
 * Admin logout
 */
function adminLogout() {
  _clearToken();
  window.location.href = '/admin/login.html';
}

/**
 * Format INR currency
 */
function formatINR(amount) {
  return '₹' + parseFloat(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });
}

/**
 * Format date to readable Indian format
 */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'success') {
  const existing = document.getElementById('spl-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'spl-toast';
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    padding: 14px 24px; border-radius: 12px; font-weight: 600;
    font-family: 'Hind', sans-serif; font-size: 14px; max-width: 360px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    background: ${type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#d4870a'};
    color: white; animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;

  const style = document.createElement('style');
  style.textContent = '@keyframes slideIn { from { transform: translateY(20px); opacity:0 } to { transform: translateY(0); opacity:1 } }';
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Expose public API — _storeToken is also exposed so login.html can call it
window.API = {
  fetchAPI, requireAdmin, adminLogout,
  storeToken: _storeToken,
  formatINR, formatDate, showToast,
};
