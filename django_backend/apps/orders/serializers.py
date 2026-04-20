"""
apps/orders/serializers.py
FIXED:
 - items not required on update (admin status/detail PUT doesn't send items)
 - OrderItemSerializer properly shows product_id as int on read
 - validation only runs on create, not update
"""
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
    quantity = serializers.IntegerField(min_value=1)

    def validate_product_id(self, value):
        try:
            return Product.objects.get(id=value)
        except Product.DoesNotExist:
            raise serializers.ValidationError(f"Product ID {value} not found.")


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
    customer_name = serializers.CharField(max_length=500)
    phone         = serializers.CharField(max_length=20)
    email         = serializers.EmailField(required=False, allow_blank=True, allow_null=True, default=None)
    address       = serializers.CharField()
    city          = serializers.CharField(max_length=255)
    state         = serializers.CharField(max_length=255)
    pincode       = serializers.CharField(max_length=20)
    payment_method = serializers.CharField(max_length=100, default='Cash on Delivery')
    notes         = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    items         = OrderItemWriteSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Order must have at least one item.")
        return value

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
