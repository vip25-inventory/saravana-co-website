/**
 * product-api.js – Product detail page API integration
 * Wires: product data, image carousel, add to cart / order now, similar products
 */

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    showError('No product specified. Please go back and select a product.');
    return;
  }

  const loader = document.getElementById('product-loader');
  const content = document.getElementById('product-content');
  if (loader) loader.style.display = 'flex';

  try {
    const { product, similar_category, similar_type } = await API.fetchAPI(`/products/${productId}`);
    document.title = `${product.name} | Saravana & Co`;

    renderProduct(product);
    renderSimilarProducts(similar_category, 'similar-category-grid', 'Similar Products');
    renderSimilarProducts(similar_type, 'similar-type-grid', `Other ${product.product_type_name || 'Products'}`);
  } catch (e) {
    showError(`Could not load product: ${e.message}`);
  } finally {
    if (loader) loader.style.display = 'none';
    if (content) content.style.display = 'block';
  }
});

function renderProduct(p) {
  // Title & price
  const titleEl = document.getElementById('product-title');
  const priceEl = document.getElementById('product-price');
  const origPriceEl = document.getElementById('product-original-price');
  const descEl = document.getElementById('product-description');
  const catEl = document.getElementById('product-category');
  const typeEl = document.getElementById('product-type');

  if (titleEl) titleEl.textContent = p.name;
  if (priceEl) priceEl.textContent = API.formatINR(p.price);
  if (origPriceEl && p.original_price && p.original_price > p.price) {
    origPriceEl.textContent = API.formatINR(p.original_price);
    origPriceEl.style.display = 'inline';
  }
  if (descEl) descEl.textContent = p.description || 'No description available.';
  if (catEl) catEl.textContent = p.category_name || '';
  if (typeEl) typeEl.textContent = p.product_type_name || '';

  // Image carousel
  renderCarousel(p.image_urls || [], p.name, p.category_name);

  // Add to Cart
  document.getElementById('add-to-cart-btn')?.addEventListener('click', () => {
    Cart.add({
      id: p.id, name: p.name, price: p.price,
      image_url: p.image_urls?.[0] || '',
      category_name: p.category_name || '',
      quantity: 1
    });
    API.showToast(`${p.name.slice(0,30)} added to cart!`);
  });

  // Order Now
  document.getElementById('order-now-btn')?.addEventListener('click', () => {
    Cart.clear();
    Cart.add({ id: p.id, name: p.name, price: p.price, image_url: p.image_urls?.[0] || '', quantity: 1 });
    window.location.href = '/checkout.html';
  });
}

function renderCarousel(images, name, catName) {
  const container = document.getElementById('product-carousel');
  if (!container) return;

  const emoji = getCatEmoji(catName);

  if (!images || images.length === 0) {
    container.innerHTML = `<div class="w-full h-72 flex items-center justify-center bg-ivory-2 rounded-2xl">
      <span class="text-9xl">${emoji}</span></div>`;
    return;
  }

  let current = 0;
  const update = () => {
    thumbs.forEach((t, i) => t.classList.toggle('ring-2', i === current));
    thumbs.forEach((t, i) => t.classList.toggle('ring-gold', i === current));
    mainImg.src = images[current];
  };

  const mainImg = document.createElement('img');
  mainImg.src = images[0];
  mainImg.alt = name;
  mainImg.className = 'w-full h-72 md:h-96 object-contain rounded-2xl bg-ivory-2 p-4';

  container.innerHTML = '';
  container.appendChild(mainImg);

  const thumbs = [];
  if (images.length > 1) {
    const thumbRow = document.createElement('div');
    thumbRow.className = 'flex gap-3 mt-4 overflow-x-auto';
    images.forEach((imgUrl, i) => {
      const thumb = document.createElement('img');
      thumb.src = imgUrl;
      thumb.alt = `${name} ${i + 1}`;
      thumb.className = `w-16 h-16 object-cover rounded-xl cursor-pointer border-2 border-transparent hover:border-gold`;
      thumb.addEventListener('click', () => { current = i; update(); });
      thumbRow.appendChild(thumb);
      thumbs.push(thumb);
    });
    container.appendChild(thumbRow);
    update();
  }
}

function renderSimilarProducts(products, containerId, title) {
  const sec = document.getElementById(containerId + '-section');
  const container = document.getElementById(containerId);
  if (!container || !products?.length) {
    if (sec) sec.style.display = 'none'; return;
  }
  if (sec) sec.style.display = 'block';

  container.innerHTML = products.map(p => {
    const img = p.image_urls?.[0]
      ? `<img src="${p.image_urls[0]}" alt="${p.name}" class="w-full h-full object-cover"/>`
      : `<span class="text-5xl">${getCatEmoji(p.category_name)}</span>`;
    return `
      <div class="bg-white p-4 rounded-2xl border border-ivory-2 hover:shadow-lg cursor-pointer transition-all group"
           onclick="window.location.href='/product.html?id=${p.id}'">
        <div class="aspect-square bg-ivory-2 rounded-xl mb-3 flex items-center justify-center overflow-hidden">${img}</div>
        <h4 class="font-bold text-sm group-hover:text-gold transition-colors line-clamp-2">${p.name}</h4>
        <p class="font-price text-gold font-bold mt-1">${API.formatINR(p.price)}</p>
      </div>`;
  }).join('');
}

function showError(msg) {
  const content = document.getElementById('product-content');
  if (content) {
    content.style.display = 'block';
    content.innerHTML = `<div class="text-center py-20">
      <div class="text-6xl mb-4">❌</div>
      <p class="text-red-500 font-semibold">${msg}</p>
      <a href="/lists.html" class="inline-block mt-4 px-6 py-2 bg-gold text-white rounded-full font-bold">Browse Products</a>
    </div>`;
  }
}

function getCatEmoji(cat) {
  const m = { 'Refrigerators':'❄️','Washing Machines':'🧺','Smart TVs':'📺',
    'Sofas':'🛋️','Beds':'🛏️','Air Conditioners':'🌬️','Kitchen Appliances':'🍳','Furniture':'🪑' };
  return m[cat] || '📦';
}
