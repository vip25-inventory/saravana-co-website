"""
apps/catalog/migrations/0001_initial.py
Auto-generated initial migration for: Category, ProductType, Product, Banner, Offer
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("slug", models.SlugField(max_length=255, unique=True)),
                ("icon", models.CharField(default="📦", max_length=10)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "catalog_category", "verbose_name": "Category", "verbose_name_plural": "Categories", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="ProductType",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("category", models.ForeignKey(db_column="category_id", on_delete=django.db.models.deletion.CASCADE, related_name="product_types", to="catalog.category")),
            ],
            options={"db_table": "catalog_product_type", "verbose_name": "Product Type", "verbose_name_plural": "Product Types", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=500)),
                ("price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("original_price", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("description", models.TextField(blank=True, default="")),
                ("image_urls", models.JSONField(blank=True, default=list)),
                ("stock", models.PositiveIntegerField(default=0)),
                ("is_top_selling", models.BooleanField(default=False)),
                ("is_new_arrival", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("category", models.ForeignKey(blank=True, db_column="category_id", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="products", to="catalog.category")),
                ("product_type", models.ForeignKey(blank=True, db_column="product_type_id", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="products", to="catalog.producttype")),
            ],
            options={"db_table": "catalog_product", "verbose_name": "Product", "verbose_name_plural": "Products", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Banner",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=500)),
                ("subtitle", models.CharField(blank=True, default="", max_length=500)),
                ("button_text", models.CharField(default="Shop Now", max_length=100)),
                ("button_link", models.CharField(default="/lists.html", max_length=500)),
                ("bg_color_class", models.CharField(default="bg-gold-grad", max_length=100)),
                ("image_url", models.URLField(blank=True, default="", max_length=1000)),
                ("sort_order", models.IntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "catalog_banner", "verbose_name": "Banner", "verbose_name_plural": "Banners", "ordering": ["sort_order", "-created_at"]},
        ),
        migrations.CreateModel(
            name="Offer",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=500)),
                ("description", models.TextField(blank=True, default="")),
                ("discount_percentage", models.DecimalField(decimal_places=2, max_digits=5)),
                ("start_date", models.DateTimeField()),
                ("end_date", models.DateTimeField()),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "catalog_offer", "verbose_name": "Offer", "verbose_name_plural": "Offers", "ordering": ["-start_date"]},
        ),
    ]
