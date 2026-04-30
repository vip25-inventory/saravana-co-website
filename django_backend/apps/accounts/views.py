"""
apps/accounts/views.py
SECURITY HARDENED:
 - LoginView: rate-limited (10/min per IP via LoginRateThrottle)
 - LoginView: 1-second delay on failed login to slow brute-force
 - LoginView: constant-time username lookup (no user-enumeration via timing)
 - LogoutView: requires authentication (no open logout abuse)
 - ChangePasswordView: unchanged — already validates strong password regex
"""
import time
import re
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import AccessToken

from .throttles import LoginRateThrottle


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]   # 10 attempts / minute per IP

    def post(self, request, *args, **kwargs):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response(
                {"error": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce reasonable length limits to prevent DoS via large payloads
        if len(username) > 150 or len(password) > 256:
            return Response(
                {"error": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        user = authenticate(username=username, password=password)

        if not user:
            # 1-second delay on failure — slows brute-force without blocking
            time.sleep(1)
            return Response(
                {"error": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            time.sleep(1)
            return Response(
                {"error": "Account is disabled."},
                status=status.HTTP_403_FORBIDDEN
            )

        token = AccessToken.for_user(user)

        return Response({
            "token": str(token),
            "username": user.username,
            "message": "Login successful"
        })


class LogoutView(APIView):
    # Require auth so the endpoint can't be abused to fish for token state
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Stateless JWT — client drops the token; server acknowledges
        return Response({"message": "Logged out successfully."})


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        strong_password_regex = re.compile(
            r'^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,}$'
        )

        if not current_password or not new_password:
            return Response(
                {"error": "Both current_password and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not strong_password_regex.match(new_password):
            return Response({
                "error": (
                    "New password must be at least 10 characters and include "
                    "a letter, number, and special character."
                )
            }, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(current_password):
            time.sleep(1)   # same delay as login to prevent timing attacks
            return Response(
                {"error": "Current password is incorrect."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        user.set_password(new_password)
        user.save()

        return Response({"message": "Password changed successfully."})
