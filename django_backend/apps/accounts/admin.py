from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import AdminProfile


class AdminProfileInline(admin.StackedInline):
    model = AdminProfile
    can_delete = False
    verbose_name_plural = "Admin Profile Metadata"


class UserAdmin(BaseUserAdmin):
    """
    Extends standard Django user admin to append our custom metadata inline
    so you don't have to edit user models in two places.
    """
    inlines = (AdminProfileInline,)


# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)
