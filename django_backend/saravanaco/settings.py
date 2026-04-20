"""
saravanaco/settings.py
Django settings for Saravana & Co — Vercel-compatible, stateless, MongoDB via pymongo.
"""
import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# ── Load .env ────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
# Load from django_backend/.env first, fall back to parent spl/.env
_env_local = BASE_DIR / ".env"
_env_parent = BASE_DIR.parent / ".env"
if _env_local.exists():
    load_dotenv(_env_local)
elif _env_parent.exists():
    load_dotenv(_env_parent)

# ── Core ─────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", os.environ.get("JWT_SECRET", "changeme-in-production"))
# Use DJANGO_DEBUG=false to disable debug in production (NODE_ENV is for Node, not Django)
DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() not in ("false", "0", "no")

# Disable auto-redirect adding trailing slash — frontend JS uses non-slash URLs
# Without this, POST /api/orders → 301 redirect to /api/orders/ which strips the body
APPEND_SLASH = False
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    ".vercel.app",
    *[h.strip() for h in os.environ.get("ALLOWED_ORIGIN", "").replace("https://", "").replace("http://", "").split(",") if h.strip()],
]

# ── Apps ─────────────────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "whitenoise.runserver_nostatic",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    # Project apps
    "apps.catalog",
    "apps.orders",
    "apps.accounts",
]

# ── Middleware ────────────────────────────────────────────────────
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "saravanaco.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "saravanaco.wsgi.application"

# ── Database ─────────────────────────────────────────────────────
# Using SQLite for local dev / Vercel demo.
# For production swap to PostgreSQL (Neon/Supabase) or MongoDB via motor.
# SQLite is written to /tmp on Vercel (ephemeral but fine for demo).
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": "/tmp/saravanaco.db" if os.environ.get("VERCEL") else BASE_DIR / "db.sqlite3",
    }
}

# ── MongoDB (raw) ────────────────────────────────────────────────
# Used by import_from_mongo management command to pull data into SQLite.
MONGODB_URI = os.environ.get("MONGODB_URI", "")
MONGODB_DB  = os.environ.get("MONGODB_DB", "test")   # default DB name in Atlas free tier
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

# ── DRF ─────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 12,
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "EXCEPTION_HANDLER": "saravanaco.exceptions.custom_exception_handler",
}

# ── JWT ──────────────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "AUTH_HEADER_TYPES": ("Bearer",),
    # Also accept x-admin-token header (Node compat)
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "SIGNING_KEY": os.environ.get("JWT_SECRET", SECRET_KEY),
    "ALGORITHM": "HS256",
    "UPDATE_LAST_LOGIN": False,
}

# ── CORS ─────────────────────────────────────────────────────────
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = [
        o.strip()
        for o in os.environ.get("ALLOWED_ORIGIN", "").split(",")
        if o.strip()
    ]
CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "x-admin-token",  # Node-compat header
]

# ── Static Files (WhiteNoise) ─────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
# CompressedManifest crashes without collectstatic; use simple storage in dev
STATICFILES_STORAGE = (
    "django.contrib.staticfiles.storage.StaticFilesStorage"
    if DEBUG else
    "whitenoise.storage.CompressedManifestStaticFilesStorage"
)

# ── Password validation ───────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ── Internationalisation ──────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Support native Django + legacy BCrypt hashes from Node
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.BCryptPasswordHasher",  # Needed for raw Node bcrypt migrations
]
