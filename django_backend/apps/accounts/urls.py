from django.urls import path
from .views import LoginView, LogoutView, ChangePasswordView

urlpatterns = [
    path('login', LoginView.as_view(), name='login'),
    # Also support trailing slash if needed
    path('login/', LoginView.as_view(), name='login_slash'),
    path('logout', LogoutView.as_view(), name='logout'),
    path('logout/', LogoutView.as_view(), name='logout_slash'),
    path('change-password', ChangePasswordView.as_view(), name='change_password'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password_slash'),
]
