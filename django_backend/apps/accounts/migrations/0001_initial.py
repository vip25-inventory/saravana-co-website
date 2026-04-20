"""
apps/accounts/migrations/0001_initial.py
Auto-generated initial migration for: AdminProfile
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AdminProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("notes", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="admin_profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "accounts_admin_profile", "verbose_name": "Admin Profile", "verbose_name_plural": "Admin Profiles"},
        ),
    ]
