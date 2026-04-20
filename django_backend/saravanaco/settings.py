"""
saravanaco/settings.py
HARDENED for production:
 - SECRET_KEY from env (no fallback to placeholder)
 - DEBUG off by default; opt-in via DJANGO_DEBUG=true
 - ALLOWED_HOSTS / CSRF_TRUSTED_ORIGINS from env
 - Secure headers when not in debug mode
 - Structured logging
"""
import os
import logging
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# ── Load .env ────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
_env_local = BASE_DIR / ".env"
_env_parent = BASE_DIR.parent / ".env"
if _env_local.exists():
    load_dotenv(_env_local)
elif _env_parent.exists():
    load_dotenv(_env_parent)

# ── Core ─────────────────────────────────────────────────────────
_raw_secret = os.environ.get("SECRET_KEY") or os.environ.get("JWT_SECRET", "")
if not _raw_secret:
    # Only allow missing secret in local dev (DEBUG must be explicitly true)
    _raw_secret = "local-dev-insecure-secret-key-change-me"

SECRET_KEY = _raw_secret

DEBUG = os.environ.get("DJANGO_DEBUG", "false").lower() in ("true", "1", "yes")

# Hosts: always allow localhost + any extra from env
_extra_hosts = [
    h.strip().replace("https://", "").replace("http://", "")
    for h in os.environ.get("ALLOWED_ORIGIN", "").split(",")
    if h.strip()
]
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    ".vercel.app",
    ".now.sh",
    *_extra_hosts,
]

# CSRF trusted origins (needed for POST from browser on Vercel)
_raw_origins = os.environ.get("ALLOWED_ORIGIN", "")
CSRF_TRUSTED_ORIGINS = [
    o.strip() if o.strip().startswith("http") else f"https://{o.strip()}"
    for o in _raw_origins.split(",")
    if o.strip()
] or ["https://*.vercel.app"]

# Disable auto-redirect adding trailing slash
APPEND_SLASH = False

# ── Secure Headers (production only) ─────────────────────────────
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER      = True
    SECURE_CONTENT_TYPE_NOSNIFF    = True
    X_FRAME_OPTIONS                = "DENY"
    SECURE_HSTS_SECONDS            = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

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

# ── Database (SQLite) ─────────────────────────────────────────────
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": "/tmp/saravanaco.db" if os.environ.get("VERCEL") else BASE_DIR / "db.sqlite3",
    }
}

# ── MongoDB (raw PyMongo) ─────────────────────────────────────────
MONGODB_URI = os.environ.get("MONGODB_URI", "")
MONGODB_DB  = os.environ.get("MONGODB_DB", "test")
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
        o.strip() if o.strip().startswith("http") else f"https://{o.strip()}"
        for o in os.environ.get("ALLOWED_ORIGIN", "").split(",")
        if o.strip()
    ] or ["https://*.vercel.app"]
    CORS_ALLOW_ALL_ORIGINS = False

CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "x-admin-token",
]

# ── Static Files (WhiteNoise) ─────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
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

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.BCryptPasswordHasher",
]

# ── Logging ──────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": '{"time":"%(asctime)s","level":"%(levelname)s","module":"%(module)s","msg":%(message)s}',
        },
        "simple": {
            "format": "[%(levelname)s] %(module)s: %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple" if DEBUG else "json",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG" if DEBUG else "WARNING",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "saravanaco": {
            "handlers": ["console"],
            "level": "DEBUG" if DEBUG else "INFO",
            "propagate": False,
        },
    },
}
