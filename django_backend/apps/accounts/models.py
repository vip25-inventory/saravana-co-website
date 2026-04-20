"""
apps/accounts/models.py
Migrated from Node Mongoose model:
  - AdminUser.js → AdminProfile (wraps Django's built-in User)

Strategy:
  - Django's User handles username + password hashing (bcrypt-compatible via
    django.contrib.auth.hashers, PBKDF2 by default).
  - AdminProfile is a 1:1 extension for any extra fields.
  - Existing bcrypt hashes from MongoDB can be imported via a custom hasher
    (see management command in Phase 5).
"""
from django.db import models
from django.contrib.auth.models import User


class AdminProfile(models.Model):
    """
    1:1 extension of Django's User for admin-specific metadata.
    Node: AdminUser.js { username, password_hash, created_at }
    Django User already provides: username, password, date_joined.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="admin_profile",
    )
    # Placeholder for future admin-level metadata (e.g. last_login_ip)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "accounts_admin_profile"
        verbose_name = "Admin Profile"
        verbose_name_plural = "Admin Profiles"

    def __str__(self):
        return f"Admin: {self.user.username}"
