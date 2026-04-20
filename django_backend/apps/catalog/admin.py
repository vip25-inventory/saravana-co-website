from django.contrib import admin
from .models import Category, ProductType, Product, Banner, Offer


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "icon", "created_at")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")


@admin.register(ProductType)
class ProductTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "created_at")
    list_filter = ("category",)
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "price", "stock", "category", "product_type", "is_top_selling", "is_new_arrival")
    list_filter = ("is_top_selling", "is_new_arrival", "category", "product_type")
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ("title", "sort_order", "is_active", "created_at")
    list_editable = ("sort_order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("title", "subtitle")


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ("title", "discount_percentage", "start_date", "end_date", "is_active")
    list_filter = ("is_active", "start_date", "end_date")
    search_fields = ("title",)
