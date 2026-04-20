"""
saravanaco/urls.py — Root URL configuration + frontend static serving
"""
import os
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import HttpResponse, Http404
from django.conf import settings

# ── Frontend file server ──────────────────────────────────────────
# Serves the public/ directory (index.html, cart_page.html, etc.)
# This replaces Node's express.static('public')
PUBLIC_ROOT = os.path.normpath(
    os.path.join(os.path.dirname(__file__), '..', '..', 'public')
)

_MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.ico':  'image/x-icon',
    '.svg':  'image/svg+xml',
}

def serve_public(request, path=''):
    """Serve any file from public/ directory. Falls back to index.html for bare /."""
    if not path:
        path = 'index.html'

    # Security: block directory traversal
    safe_path = os.path.normpath(os.path.join(PUBLIC_ROOT, path))
    if not safe_path.startswith(PUBLIC_ROOT):
        raise Http404

    if os.path.isdir(safe_path):
        safe_path = os.path.join(safe_path, 'index.html')

    if not os.path.isfile(safe_path):
        raise Http404

    ext = os.path.splitext(safe_path)[1].lower()
    content_type = _MIME.get(ext, 'application/octet-stream')

    with open(safe_path, 'rb') as f:
        return HttpResponse(f.read(), content_type=content_type)


urlpatterns = [
    # Django admin UI
    path("django-admin/", admin.site.urls),

    # ── API Routes (mirrors Node Express mounts exactly) ──────────
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
