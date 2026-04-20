"""
Vercel Serverless Entry Point — django_backend/api/index.py
All HTTP traffic is routed here via vercel.json at repo root.

Deployment layout on Vercel (/var/task = repo root):
  /var/task/
    vercel.json
    django_backend/
      api/index.py   ← THIS FILE
      saravanaco/
      apps/
      ...
    public/
      index.html
      ...
"""
import os
import sys

# Add django_backend/ to Python path so Django can find saravanaco.settings
# __file__ = /var/task/django_backend/api/index.py
# parent   = /var/task/django_backend/           ← this is what we need on sys.path
_DJANGO_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _DJANGO_BACKEND not in sys.path:
    sys.path.insert(0, _DJANGO_BACKEND)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "saravanaco.settings")
os.environ.setdefault("VERCEL", "1")

from django.core.wsgi import get_wsgi_application  # noqa: E402

application = get_wsgi_application()

# Vercel expects a callable named `app`
app = application
