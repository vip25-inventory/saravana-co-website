from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    # Make advisory FK clickable but otherwise make fields readonly so snapshot isn't easily broken by mistake
    raw_id_fields = ("product",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "customer_name", "phone", "total_amount", "status", "created_at")
    list_filter = ("status", "payment_method", "created_at")
    search_fields = ("customer_name", "phone", "email", "id")
    inlines = [OrderItemInline]
    readonly_fields = ("total_amount", "created_at", "updated_at")
