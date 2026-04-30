"""
apps/orders/serializers.py
SECURITY HARDENED:
 - phone: regex validation (7-15 digits, optional leading + or spaces/dashes)
 - pincode: 6-digit India PIN enforced
 - customer_name: strip leading/trailing whitespace, block pure-HTML content
 - address: max_length set
 - items: unchanged — price snapshot logic unchanged
"""
import re
from rest_framework import serializers
from .models import Order, OrderItem
from apps.catalog.models import Product


class OrderItemReadSerializer(serializers.ModelSerializer):
    """Used for GET responses — shows snapshot product_name & price."""
    product_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = OrderItem
        fields = ["product_id", "product_name", "price", "quantity"]


class OrderItemWriteSerializer(serializers.Serializer):
    """Used on POST — accepts product_id + quantity, resolves to Product for snapshot."""
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=100)

    def validate_product_id(self, value):
        try:
            return Product.objects.get(id=value)
        except Product.DoesNotExist:
            raise serializers.ValidationError(f"Product ID {value} not found.")


# Pre-compiled patterns
_PHONE_RE  = re.compile(r'^\+?[\d\s\-]{7,15}$')
_PIN_RE    = re.compile(r'^\d{6}$')
_HTML_TAGS = re.compile(r'<[^>]+>')


def _strip_html(value: str) -> str:
    """Remove any HTML tags from a string."""
    return _HTML_TAGS.sub('', value).strip()


class OrderSerializer(serializers.ModelSerializer):
    _id = serializers.CharField(source="id", read_only=True)
    id = serializers.IntegerField(read_only=True)
    items = OrderItemReadSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "_id",
            "id",
            "customer_name",
            "phone",
            "email",
            "address",
            "city",
            "state",
            "pincode",
            "total_amount",
            "status",
            "payment_method",
            "notes",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["total_amount", "created_at", "updated_at"]


class PlaceOrderSerializer(serializers.Serializer):
    """
    Used only for POST /api/orders — public order placement.
    Validates all required fields + items, then creates Order + OrderItems.
    Keeps snapshot logic (price captured from DB at order time).
    """
    customer_name  = serializers.CharField(max_length=200)
    phone          = serializers.CharField(max_length=20)
    email          = serializers.EmailField(
        required=False, allow_blank=True, allow_null=True, default=None
    )
    address        = serializers.CharField(max_length=500)
    city           = serializers.CharField(max_length=100)
    state          = serializers.CharField(max_length=100)
    pincode        = serializers.CharField(max_length=10)
    payment_method = serializers.CharField(max_length=100, default='Cash on Delivery')
    notes          = serializers.CharField(
        required=False, allow_blank=True, allow_null=True,
        default=None, max_length=1000
    )
    items          = OrderItemWriteSerializer(many=True)

    # ── Field-level validators ──────────────────────────────────────────

    def validate_customer_name(self, value):
        value = _strip_html(value)
        if not value:
            raise serializers.ValidationError("Name cannot be empty.")
        return value

    def validate_phone(self, value):
        value = value.strip()
        if not _PHONE_RE.match(value):
            raise serializers.ValidationError(
                "Enter a valid phone number (7–15 digits, optional +/spaces/dashes)."
            )
        return value

    def validate_pincode(self, value):
        value = value.strip()
        if not _PIN_RE.match(value):
            raise serializers.ValidationError(
                "Pincode must be exactly 6 digits."
            )
        return value

    def validate_address(self, value):
        return _strip_html(value)

    def validate_city(self, value):
        return _strip_html(value)

    def validate_state(self, value):
        return _strip_html(value)

    def validate_notes(self, value):
        if value:
            return _strip_html(value)
        return value

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Order must have at least one item.")
        if len(value) > 50:
            raise serializers.ValidationError("Order cannot contain more than 50 items.")
        return value

    # ── Create ─────────────────────────────────────────────────────────

    def create(self, validated_data):
        items_data = validated_data.pop("items")

        # Snapshot: resolve price from DB, ignore any client-sent price
        total = 0
        snapshot_items = []
        for item_data in items_data:
            product = item_data["product_id"]   # already resolved to Product by validate_product_id
            qty = item_data["quantity"]
            price = product.price
            total = round(float(total) + float(price) * qty, 2)
            snapshot_items.append({
                "product": product,
                "product_name": product.name,
                "price": price,
                "quantity": qty,
            })

        order = Order.objects.create(total_amount=total, **validated_data)

        OrderItem.objects.bulk_create([
            OrderItem(order=order, **snap) for snap in snapshot_items
        ])

        return order
