/**
 * lists-api.js – Product listing page API integration
 * Wires: product grid, category/type filters, price range, search, pagination
 */

let currentPage = 1;
const PAGE_SIZE = 12;
let totalPages = 1;
let filters = {};

document.addEventListener('DOMContentLoaded', async () => {
  // Parse URL params
  const params = new URLSearchParams(window.location.search);
  filters = {
    search: params.get('search') || '',
    category: params.get('category') || '',
    category_id: params.get('category_id') || '',
    product_type_id: params.get('product_type_id') || '',
    min_price: params.get('min_price') || '',
    max_price: params.get('max_price') || '',
    sort: params.get('sort') || 'created_at_desc',
  };
  currentPage = parseInt(params.get('page') || '1');

  // Load categories for filter panel
  await loadCategories();
  // Load products
  await loadProducts();
  bindFilterEvents();
});

// Module-level category cache to avoid repeated API calls
let _categoriesCache = null;

async function loadCategories() {
  try {
    const { categories } = await API.fetchAPI('/categories');
    _categoriesCache = categories; // cache for loadProductTypes
    const catFilter = document.getElementById('category-filter');
    if (!catFilter || !categories) return;
    catFilter.innerHTML = '<option value="">All Categories</option>' +
      categories.map(c => `<option value="${c.slug}" ${filters.category === c.slug ? 'selected' : ''}>${c.name}</option>`).join('');

    catFilter.addEventListener('change', async () => {
      filters.category = catFilter.value;
      filters.category_id = '';
      filters.product_type_id = '';
      currentPage = 1;
      await loadProductTypes(catFilter.value);
      await loadProducts();
    });

    if (filters.category) await loadProductTypes(filters.category);
  } catch (e) { console.warn('Categories load failed', e.message); }
}

async function loadProductTypes(categorySlug) {
  const typeFilter = document.getElementById('product-type-filter');
  if (!typeFilter || !categorySlug) return;
  try {
    // Use cached categories — avoids a second /api/categories round-trip
    const cats = _categoriesCache || (await API.fetchAPI('/categories')).categories;
    const cat = cats?.find(c => c.slug === categorySlug);
    if (!cat) return;
    const { product_types } = await API.fetchAPI(`/product-types?category_id=${cat.id}`);
    typeFilter.innerHTML = '<option value="">All Types</option>' +
      (product_types || []).map(t =>
        `<option value="${t.id}" ${filters.product_type_id == t.id ? 'selected' : ''}>${t.name}</option>`
      ).join('');
    typeFilter.parentElement.style.display = 'block';
  } catch (e) { console.warn('Product types load failed', e); }
}

async function loadProducts() {
  const grid = document.getElementById('products-grid');
  const countEl = document.getElementById('products-count');
  if (!grid) return;

  grid.innerHTML = `<div class="col-span-full flex justify-center py-20">
    <div class="text-center">
      <div class="text-6xl mb-4">⏳</div>
      <p class="text-text-muted">Loading products...</p>
    </div>
  </div>`;

  try {
    const query = buildQuery();
    const data = await API.fetchAPI(`/products?${query}`);
    const { products, pagination } = data;
    totalPages = pagination.totalPages;

    if (countEl) countEl.textContent = `${pagination.total} products found`;

    if (!products.length) {
      grid.innerHTML = `<div class="col-span-full text-center py-20">
        <div class="text-6xl mb-4">🔍</div>
        <h3 class="text-xl font-bold mb-2">No products found</h3>
        <p class="text-text-muted">Try adjusting your filters or search term</p>
      </div>`;
      updatePagination(pagination);
      return;
    }

    grid.innerHTML = products.map(p => {
      const imgHtml = p.image_urls && p.image_urls[0]
        ? `<img src="${p.image_urls[0]}" alt="${p.name}" class="w-full h-full object-cover"/>`
        : `<span class="text-6xl select-none">${getCatEmoji(p.category_name)}</span>`;
      return `
        <div class="bg-white p-5 rounded-[20px] shadow-sm hover:shadow-xl border border-ivory-2 transition-all group cursor-pointer"
             onclick="window.location.href='/product.html?id=${p.id}'">
          <div class="aspect-square bg-ivory-2 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
            ${imgHtml}
            ${p.is_new_arrival ? '<span class="absolute top-3 left-3 bg-teal text-white text-[10px] font-bold px-2 py-1 rounded">NEW</span>' : ''}
            ${p.original_price && p.original_price > p.price ? `<span class="absolute top-3 right-3 bg-crimson text-white text-[10px] font-bold px-2 py-1 rounded">${Math.round((1 - p.price/p.original_price)*100)}% OFF</span>` : ''}
          </div>
          <h3 class="font-bold mb-1 group-hover:text-gold transition-colors line-clamp-2">${p.name}</h3>
          <p class="text-text-muted text-xs mb-3">${p.product_type_name || p.category_name || ''}</p>
          <div class="flex justify-between items-center">
            <div>
              <span class="font-price text-lg text-gold font-bold">${API.formatINR(p.price)}</span>
              ${p.original_price && p.original_price > p.price
                ? `<span class="text-xs text-text-muted line-through ml-1">${API.formatINR(p.original_price)}</span>` : ''}
            </div>
            <button onclick="event.stopPropagation(); quickAddToCart(JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify({
              id: p.id, name: p.name, price: p.price,
              image_url: (p.image_urls && p.image_urls[0]) || '',
              category_name: p.category_name || ''
            }))}')))"
              class="bg-gold/10 p-2.5 rounded-full text-gold hover:bg-gold hover:text-white transition-colors" title="Add to Cart">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewbox="0 0 24 24">
                <path d="M12 4v16m8-8H4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>`;
    }).join('');

    updatePagination(pagination);
  } catch (e) {
    grid.innerHTML = `<div class="col-span-full text-center py-20 text-red-500">Error: ${e.message}</div>`;
  }
}

function buildQuery() {
  const q = new URLSearchParams();
  q.set('page', currentPage);
  q.set('limit', PAGE_SIZE);
  if (filters.search) q.set('search', filters.search);
  if (filters.category) q.set('category', filters.category);
  if (filters.category_id) q.set('category_id', filters.category_id);
  if (filters.product_type_id) q.set('product_type_id', filters.product_type_id);
  if (filters.min_price) q.set('min_price', filters.min_price);
  if (filters.max_price) q.set('max_price', filters.max_price);
  if (filters.sort) q.set('sort', filters.sort);
  return q.toString();
}

function bindFilterEvents() {
  // Price filter
  document.getElementById('apply-price-filter')?.addEventListener('click', async () => {
    filters.min_price = document.getElementById('min-price')?.value || '';
    filters.max_price = document.getElementById('max-price')?.value || '';
    currentPage = 1;
    await loadProducts();
  });

  // Sort
  document.getElementById('sort-select')?.addEventListener('change', async (e) => {
    filters.sort = e.target.value;
    currentPage = 1;
    await loadProducts();
  });

  // Search
  document.querySelectorAll('.list-search-input').forEach(input => {
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        filters.search = e.target.value;
        currentPage = 1;
        await loadProducts();
      }
    });
  });

  // Product type filter
  document.getElementById('product-type-filter')?.addEventListener('change', async (e) => {
    filters.product_type_id = e.target.value;
    currentPage = 1;
    await loadProducts();
  });
}

function updatePagination(pagination) {
  const pcont = document.getElementById('pagination-container');
  if (!pcont) return;
  if (pagination.totalPages <= 1) { pcont.innerHTML = ''; return; }

  let html = `<div class="flex items-center gap-3 justify-center mt-10">`;
  if (pagination.page > 1) {
    html += `<button onclick="changePage(${pagination.page - 1})"
      class="px-5 py-2 rounded-full border border-gold text-gold hover:bg-gold hover:text-white transition-all">← Prev</button>`;
  }
  html += `<span class="text-sm text-text-muted">Page ${pagination.page} of ${pagination.totalPages}</span>`;
  if (pagination.page < pagination.totalPages) {
    html += `<button onclick="changePage(${pagination.page + 1})"
      class="px-5 py-2 rounded-full bg-gold text-white hover:bg-gold/90 transition-all">Next →</button>`;
  }
  html += '</div>';
  pcont.innerHTML = html;
}

async function changePage(page) {
  currentPage = page;
  window.scrollTo(0, 0);
  await loadProducts();
}

function quickAddToCart(product) {
  product.quantity = 1;
  Cart.add(product);
  API.showToast(`${product.name.slice(0,28)}... added to cart!`);
  // Update badge immediately
  document.querySelectorAll('.cart-count-badge').forEach(b => {
    b.textContent = Cart.count();
    b.style.display = 'flex';
  });
}

function getCatEmoji(cat) {
  const m = { 'Refrigerators':'❄️','Washing Machines':'🧺','Smart TVs':'📺',
    'Sofas':'🛋️','Beds':'🛏️','Air Conditioners':'🌬️','Kitchen Appliances':'🍳','Furniture':'🪑' };
  return m[cat] || '📦';
}
