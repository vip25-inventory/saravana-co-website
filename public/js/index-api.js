/**
 * index-api.js – Home page live API integration
 * Wires: hero banners slideshow, Top Selling, New Arrivals, Search, Category links
 */

document.addEventListener('DOMContentLoaded', async () => {

  // ── Cart badge ───────────────────────────────────────────
  document.querySelectorAll('.cart-count-badge').forEach(b => {
    const count = Cart.count();
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });

  // ── Load Banners ─────────────────────────────────────────
  try {
    const { banners } = await API.fetchAPI('/banners');
    if (banners && banners.length > 0) {
      renderBanners(banners);
    }
  } catch (e) {
    console.warn('Banner load failed, using static slides:', e.message);
  }

  // ── Load Top Selling Products ─────────────────────────────
  try {
    const data = await API.fetchAPI('/products?is_top_selling=true&limit=8');
    renderProductGrid(data.products, 'top-selling-grid', false);
  } catch (e) {
    console.warn('Top selling load failed:', e.message);
  }

  // ── Load New Arrivals ─────────────────────────────────────
  try {
    const data = await API.fetchAPI('/products?is_new_arrival=true&limit=8');
    renderProductGrid(data.products, 'new-arrivals-grid', true);
  } catch (e) {
    console.warn('New arrivals load failed:', e.message);
  }

  // ── Search bar ────────────────────────────────────────────
  const searchInput = document.querySelector('input[type="text"]');
  const searchBtn = document.querySelector('button[data-search]') ||
                    (searchInput && searchInput.nextElementSibling);
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch(searchInput.value);
    });
    if (searchBtn) searchBtn.addEventListener('click', () => doSearch(searchInput.value));
  }

  // Quick chips
  document.querySelectorAll('[data-search-chip]').forEach(chip => {
    chip.addEventListener('click', () => doSearch(chip.dataset.searchChip));
  });

  // ── Category links ────────────────────────────────────────
  document.querySelectorAll('[data-category]').forEach(el => {
    el.addEventListener('click', () => {
      window.location.href = `/lists.html?category=${el.dataset.category}`;
    });
  });

  // Cart icon
  document.getElementById('navbar-cart-btn')?.addEventListener('click', () => {
    window.location.href = '/cart_page.html';
  });
});

function doSearch(query) {
  if (!query.trim()) return;
  window.location.href = `/lists.html?search=${encodeURIComponent(query.trim())}`;
}

function renderBanners(banners) {
  const container = document.getElementById('hero-section');
  if (!container) return;

  // Clear existing static slides
  const existingSlides = container.querySelectorAll('.hero-slide');
  existingSlides.forEach(s => s.remove());

  const bgClasses = {
    'gold-grad': 'bg-gold-grad',
    'teal': 'bg-teal',
    'crimson-gold': 'bg-gradient-to-r from-crimson to-gold',
  };

  banners.forEach((banner, i) => {
    const bgClass = bgClasses[banner.bg_color_class] || banner.bg_color_class || 'bg-gold-grad';
    const slide = document.createElement('div');
    slide.className = `hero-slide absolute inset-0 flex items-center ${bgClass}`;
    slide.id = `slide-${i}`;
    slide.style.opacity = i === 0 ? '1' : '0';
    slide.style.zIndex = i === 0 ? '1' : '0';

    slide.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 w-full flex flex-col md:flex-row items-center justify-between">
        <div class="text-white space-y-4 max-w-xl">
          <h1 class="font-heading text-5xl md:text-7xl leading-tight">${banner.title}</h1>
          ${banner.subtitle ? `<p class="text-lg opacity-90">${banner.subtitle}</p>` : ''}
          <a href="${banner.button_link || '/lists.html'}"
             class="inline-block mt-4 px-8 py-3 bg-white text-gold font-bold rounded-full
                    hover:bg-opacity-90 transition-all uppercase tracking-widest text-sm">
            ${banner.button_text || 'Shop Now'}
          </a>
        </div>
        ${banner.image_url
          ? `<div class="hidden md:block"><img src="${banner.image_url}" alt="${banner.title}" class="h-64 object-contain rounded-2xl"/></div>`
          : `<div class="hidden md:block opacity-20">
               <svg fill="white" height="400" viewBox="0 0 24 24" width="300"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"/></svg>
             </div>`
        }
      </div>`;
    container.appendChild(slide);
  });

  // Restart carousel with new slides
  let current = 0;
  const slides = container.querySelectorAll('.hero-slide');
  clearInterval(window._heroTimer);
  window._heroTimer = setInterval(() => {
    slides[current].style.opacity = '0';
    slides[current].style.zIndex = '0';
    current = (current + 1) % slides.length;
    slides[current].style.opacity = '1';
    slides[current].style.zIndex = '1';
  }, 4500);
}

function renderProductGrid(products, containerId, isNew) {
  const container = document.getElementById(containerId);
  if (!container || !products?.length) return;

  container.innerHTML = products.map(p => {
    const imgHtml = p.image_urls && p.image_urls[0]
      ? `<img src="${p.image_urls[0]}" alt="${p.name}" class="w-full h-full object-cover rounded-2xl"/>`
      : `<span class="text-7xl select-none">${getCategoryEmoji(p.category_name)}</span>`;

    return `
      <div class="bg-white p-6 rounded-[24px] shadow-sm hover:shadow-2xl hover:shadow-gold/10 border border-ivory-2 transition-all duration-300 group cursor-pointer"
           onclick="window.location.href='/product.html?id=${p.id}'">
        <div class="aspect-square bg-ivory-2 rounded-2xl mb-6 flex items-center justify-center relative overflow-hidden">
          ${imgHtml}
          ${isNew ? '<span class="absolute top-4 left-4 bg-teal text-white text-[10px] font-bold px-2 py-1 rounded">NEW</span>' : ''}
        </div>
        <h3 class="font-bold text-lg mb-2 group-hover:text-gold transition-colors">${p.name}</h3>
        <p class="text-text-muted text-sm mb-4">${p.category_name || ''}</p>
        <div class="flex justify-between items-center">
          <span class="font-price text-xl text-gold">${API.formatINR(p.price)}</span>
          <button onclick="event.stopPropagation(); addToCartHome(JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify({
            id: p.id, name: p.name, price: p.price,
            image_url: (p.image_urls && p.image_urls[0]) || '',
            category_name: p.category_name || ''
          }))}')))"
            class="bg-gold/10 p-3 rounded-full text-gold hover:bg-gold hover:text-white transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>`;
  }).join('');
}

function addToCartHome(product) {
  Cart.add(product);
  API.showToast(`${product.name.slice(0,30)}... added to cart!`);
  // Update badge
  document.querySelectorAll('.cart-count-badge').forEach(b => {
    b.textContent = Cart.count();
    b.style.display = 'flex';
  });
}

function getCategoryEmoji(cat) {
  const map = {
    'Refrigerators': '❄️', 'Washing Machines': '🧺', 'Smart TVs': '📺',
    'Sofas': '🛋️', 'Beds': '🛏️', 'Air Conditioners': '🌬️',
    'Kitchen Appliances': '🍳', 'Furniture': '🪑'
  };
  return map[cat] || '📦';
}
