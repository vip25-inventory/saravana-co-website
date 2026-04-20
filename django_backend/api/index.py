"""
Vercel Serverless Entry Point — api/index.py
All HTTP traffic is routed here via vercel.json.
Django WSGI app is loaded once per cold start.
"""
import os
import sys

# Make sure the project root is on the Python path
# Vercel runs from the repo root; django_backend/ is our project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "saravanaco.settings")

from django.core.wsgi import get_wsgi_application  # noqa: E402

application = get_wsgi_application()

# Vercel expects a callable named `app`
app = application
