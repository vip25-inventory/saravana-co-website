"""
apps/catalog/models.py
Migrated from Node Mongoose models:
  - Category.js      → Category
  - ProductType.js   → ProductType
  - Product.js       → Product
  - Banner.js        → Banner
  - Offer.js         → Offer
"""
from django.db import models


class Category(models.Model):
    """
    Node: Category.js
    { name, slug (unique), icon }
    """
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    icon = models.CharField(max_length=10, default="📦")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "catalog_category"
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class ProductType(models.Model):
    """
    Node: ProductType.js
    { category_id (FK → Category), name }
    """
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="product_types",
        db_column="category_id",
    )
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "catalog_product_type"
        verbose_name = "Product Type"
        verbose_name_plural = "Product Types"
        ordering = ["name"]

    def __str__(self):
        return f"{self.category.name} › {self.name}"


class Product(models.Model):
    """
    Node: Product.js
    { name, category_id, product_type_id, price, original_price,
      description, image_urls[], stock, is_top_selling, is_new_arrival }
    """
    name = models.CharField(max_length=500)
    category = models.ForeignKey(
        Category,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="products",
        db_column="category_id",
    )
    product_type = models.ForeignKey(
        ProductType,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="products",
        db_column="product_type_id",
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True, default="")
    # Mongoose: image_urls [String] — stored as JSON array in a TextField
    image_urls = models.JSONField(default=list, blank=True)
    stock = models.PositiveIntegerField(default=0)
    is_top_selling = models.BooleanField(default=False)
    is_new_arrival = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "catalog_product"
        verbose_name = "Product"
        verbose_name_plural = "Products"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Banner(models.Model):
    """
    Node: Banner.js
    { title, subtitle, button_text, button_link, bg_color_class,
      image_url, sort_order, is_active }
    """
    title = models.CharField(max_length=500)
    subtitle = models.CharField(max_length=500, blank=True, default="")
    button_text = models.CharField(max_length=100, default="Shop Now")
    button_link = models.CharField(max_length=500, default="/lists.html")
    bg_color_class = models.CharField(max_length=100, default="bg-gold-grad")
    image_url = models.URLField(max_length=1000, blank=True, default="")
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "catalog_banner"
        verbose_name = "Banner"
        verbose_name_plural = "Banners"
        ordering = ["sort_order", "-created_at"]

    def __str__(self):
        return self.title


class Offer(models.Model):
    """
    Node: Offer.js
    { title, description, discount_percentage, start_date,
      end_date, is_active }
    """
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True, default="")
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "catalog_offer"
        verbose_name = "Offer"
        verbose_name_plural = "Offers"
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.title} ({self.discount_percentage}%)"
