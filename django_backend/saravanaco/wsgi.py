"""
saravanaco/wsgi.py — WSGI entry (local dev + Vercel cold-start)
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "saravanaco.settings")

application = get_wsgi_application()
