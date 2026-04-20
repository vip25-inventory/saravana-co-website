/**
 * api.js – Shared API client for Saravana & Co frontend
 * Handles all fetch calls, JWT injection for admin pages, and errors
 */

const API_BASE = '/api';

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

  // Inject JWT for admin pages
  const token = sessionStorage.getItem('admin_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    // Session expired – redirect to login if on admin page
    if (window.location.pathname.includes('/admin/')) {
      sessionStorage.removeItem('admin_token');
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
 * Check admin auth – redirect to login if no token
 * Call at the top of every admin page
 */
function requireAdmin() {
  const token = sessionStorage.getItem('admin_token');
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
  sessionStorage.removeItem('admin_token');
  window.location.href = '/admin/login.html';
}

/**
 * Format INR currency
 */
function formatINR(amount) {
  return '₹' + parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Format date to readable Indian format
 */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
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

window.API = { fetchAPI, requireAdmin, adminLogout, formatINR, formatDate, showToast };
