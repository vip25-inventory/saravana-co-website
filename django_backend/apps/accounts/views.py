from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import AccessToken
import re


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({"error": "Username and password are required."}, status=400)

        user = authenticate(username=username, password=password)
        if not user:
            return Response({"error": "Invalid credentials."}, status=401)

        token = AccessToken.for_user(user)

        return Response({
            "token": str(token),
            "username": user.username,
            "message": "Login successful"
        })


class LogoutView(APIView):
    # Public because client just drops token in stateless JWT
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        return Response({"message": "Logged out successfully."})


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        strong_password_regex = re.compile(r'^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,}$')

        if not current_password or not new_password or not strong_password_regex.match(new_password):
            return Response({
                "error": "New password must be at least 10 characters and include a letter, number, and special character."
            }, status=400)

        if not user.check_password(current_password):
            return Response({"error": "Current password is incorrect."}, status=401)

        user.set_password(new_password)
        user.save()

        return Response({"message": "Password changed successfully."})
