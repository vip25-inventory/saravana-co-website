"""
apps/accounts/throttles.py
Custom throttle for login endpoint — limits to 10 attempts per minute per IP.
Uses DRF's cache-backed throttling (works on single-process and multi-worker).
"""
from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """
    Applies to the login endpoint only.
    Rate: 10 requests / minute per IP address.
    On breach, DRF returns 429 with Retry-After header automatically.
    """
    scope = 'login'

    def get_cache_key(self, request, view):
        # Key on IP so each source address has its own bucket
        ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident,
        }
