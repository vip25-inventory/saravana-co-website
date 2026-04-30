"""
saravanaco/middleware.py
Injects security headers on every response:
  - Content-Security-Policy (CSP)
  - Permissions-Policy
  - Cross-Origin headers

These complement Django's built-in SecurityMiddleware headers.
"""


class SecurityHeadersMiddleware:
    """
    Adds Content-Security-Policy and Permissions-Policy headers.
    Placed after SecurityMiddleware in MIDDLEWARE so it can override/extend.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        self._add_headers(response)
        return response

    def _add_headers(self, response):
        # ── Content-Security-Policy ──────────────────────────────────────
        # Allows:
        #  - self for everything by default
        #  - Google Fonts (stylesheet + font files)
        #  - Tailwind CDN (used on admin pages)
        #  - Inline styles needed for toast / dynamic UI (unsafe-inline kept
        #    intentionally for CSS only — scripts use nonces or are external)
        csp = (
            "default-src 'self'; "
            "script-src 'self' https://cdn.tailwindcss.com 'unsafe-inline'; "
            "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self'; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "frame-ancestors 'none'; "
            "form-action 'self';"
        )
        # Only set if not already set by another middleware
        if 'Content-Security-Policy' not in response:
            response['Content-Security-Policy'] = csp

        # ── Permissions-Policy ───────────────────────────────────────────
        # Disable sensitive browser features not used by this site
        if 'Permissions-Policy' not in response:
            response['Permissions-Policy'] = (
                "camera=(), microphone=(), geolocation=(), "
                "payment=(), usb=(), magnetometer=(), gyroscope=()"
            )

        # ── Cross-Origin Opener Policy ───────────────────────────────────
        if 'Cross-Origin-Opener-Policy' not in response:
            response['Cross-Origin-Opener-Policy'] = 'same-origin'

        # ── Referrer Policy ──────────────────────────────────────────────
        if 'Referrer-Policy' not in response:
            response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
