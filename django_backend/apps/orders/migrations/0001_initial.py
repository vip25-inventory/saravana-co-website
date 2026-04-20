"""
apps/orders/migrations/0001_initial.py
Auto-generated initial migration for: Order, OrderItem
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("catalog", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Order",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("customer_name", models.CharField(max_length=500)),
                ("phone", models.CharField(max_length=20)),
                ("email", models.EmailField(blank=True, max_length=254, null=True)),
                ("address", models.TextField()),
                ("city", models.CharField(max_length=255)),
                ("state", models.CharField(max_length=255)),
                ("pincode", models.CharField(max_length=20)),
                ("total_amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("status", models.CharField(choices=[("Pending", "Pending"), ("Processing", "Processing"), ("In Transit", "In Transit"), ("Delivered", "Delivered"), ("Cancelled", "Cancelled")], default="Pending", max_length=50)),
                ("payment_method", models.CharField(default="Cash on Delivery", max_length=100)),
                ("notes", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "orders_order", "verbose_name": "Order", "verbose_name_plural": "Orders", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="OrderItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("product_name", models.CharField(max_length=500)),
                ("price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("quantity", models.PositiveIntegerField(default=1)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="orders.order")),
                ("product", models.ForeignKey(blank=True, db_column="product_id", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="order_items", to="catalog.product")),
            ],
            options={"db_table": "orders_order_item", "verbose_name": "Order Item", "verbose_name_plural": "Order Items"},
        ),
    ]
