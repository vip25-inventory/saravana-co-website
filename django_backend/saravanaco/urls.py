"""
saravanaco/urls.py — Root URL configuration + frontend static serving
FIXED:
 - PUBLIC_ROOT resolves correctly both locally (d:/spl/public) and on Vercel
   (/var/task/public which sits alongside django_backend/)
"""
import os
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import HttpResponse, Http404
from django.conf import settings

# ── Frontend file server ──────────────────────────────────────────
# On Vercel, the repo root is /var/task, so layout is:
#   /var/task/django_backend/   ← cwd / this file lives here
#   /var/task/public/           ← frontend
# Locally:
#   d:\spl\django_backend\      ← this file
#   d:\spl\public\              ← frontend
#
# Either way: go up TWO dirs from saravanaco/ → up one to django_backend/
# then up one more to repo root, then into public/
_HERE = os.path.dirname(os.path.abspath(__file__))          # …/saravanaco
_DJANGO_BACKEND = os.path.dirname(_HERE)                    # …/django_backend
_REPO_ROOT = os.path.dirname(_DJANGO_BACKEND)               # …/spl  (or /var/task)
PUBLIC_ROOT = os.path.normpath(os.path.join(_REPO_ROOT, 'public'))

_MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.ico':  'image/x-icon',
    '.svg':  'image/svg+xml',
    '.woff':  'font/woff',
    '.woff2': 'font/woff2',
    '.webp':  'image/webp',
}

# Allowlisted extensions for public file serving
_ALLOWED_EXTENSIONS = {
    '.html', '.js', '.css', '.json', '.png', '.jpg', '.jpeg',
    '.ico', '.svg', '.woff', '.woff2', '.webp', '.txt', '.xml',
}

# Cache durations (seconds) per content type
_CACHE_SECONDS = {
    'text/html; charset=utf-8': 0,           # never cache HTML
    'application/javascript':   86400,        # 1 day
    'text/css':                 86400,
    'image/png':                604800,       # 7 days
    'image/jpeg':               604800,
    'image/webp':               604800,
    'image/svg+xml':            604800,
    'image/x-icon':             604800,
    'font/woff':                2592000,      # 30 days
    'font/woff2':               2592000,
}


def serve_public(request, path=''):
    """Serve files from public/ directory.
    
    Security controls:
     - Directory traversal blocked via normpath comparison
     - Extension allowlist rejects unknown file types
     - Security headers added to every response
     - HTML is never cached
    """
    if not path:
        path = 'index.html'

    # Security: block directory traversal
    safe_path = os.path.normpath(os.path.join(PUBLIC_ROOT, path))
    if not safe_path.startswith(PUBLIC_ROOT):
        raise Http404

    if os.path.isdir(safe_path):
        safe_path = os.path.join(safe_path, 'index.html')

    # Security: only serve allowlisted extensions
    ext = os.path.splitext(safe_path)[1].lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise Http404

    if not os.path.isfile(safe_path):
        raise Http404

    content_type = _MIME.get(ext, 'application/octet-stream')
    cache_secs   = _CACHE_SECONDS.get(content_type, 3600)

    with open(safe_path, 'rb') as f:
        response = HttpResponse(f.read(), content_type=content_type)

    # Security headers on every static file response
    response['X-Content-Type-Options'] = 'nosniff'
    if cache_secs == 0:
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate'
    else:
        response['Cache-Control'] = f'public, max-age={cache_secs}'

    return response


urlpatterns = [
    # Django admin UI
    path("django-admin/", admin.site.urls),

    # ── API Routes ────────────────────────────────────────────────
    path("api/admin/",        include("apps.accounts.urls")),
    path("api/products/",     include("apps.catalog.urls.products")),
    path("api/products",      include("apps.catalog.urls.products")),   # no-slash alias
    path("api/categories/",   include("apps.catalog.urls.categories")),
    path("api/categories",    include("apps.catalog.urls.categories")),
    path("api/category/",     include("apps.catalog.urls.categories")),  # /category/ alias
    path("api/category",      include("apps.catalog.urls.categories")),
    path("api/product-types/",include("apps.catalog.urls.product_types")),
    path("api/product-types", include("apps.catalog.urls.product_types")),
    path("api/offers/",       include("apps.catalog.urls.offers")),
    path("api/offers",        include("apps.catalog.urls.offers")),
    path("api/banners/",      include("apps.catalog.urls.banners")),
    path("api/banners",       include("apps.catalog.urls.banners")),
    path("api/prices/",       include("apps.catalog.urls.prices")),
    path("api/prices",        include("apps.catalog.urls.prices")),
    path("api/orders/",       include("apps.orders.urls")),
    path("api/orders",        include("apps.orders.urls")),    # no-slash alias for POST
    path("api/stats/",        include("apps.orders.urls_stats")),
    path("api/stats",         include("apps.orders.urls_stats")),
    path("api/export/",       include("apps.orders.urls_export")),
    path("api/export",        include("apps.orders.urls_export")),

    # ── Health check ─────────────────────────────────────────────
    path("api/health/",       include("saravanaco.health")),
    path("api/health",        include("saravanaco.health")),

    # ── Frontend (serves public/ for all non-API routes) ─────────
    path("", serve_public, {"path": ""}),
    re_path(r"^(?!api/)(?!django-admin/)(?P<path>.+)$", serve_public),
]
