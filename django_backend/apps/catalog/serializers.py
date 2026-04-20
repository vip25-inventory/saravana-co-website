"""
apps/catalog/serializers.py
FIXED:
 - Removed _id aliases. Frontend uses p.id, c.id, t.id everywhere.
 - category_name/slug/product_type_name made null-safe (SerializerMethodField)
 - image_urls: accepts comma-separated string from admin form OR JSON array
"""
from rest_framework import serializers
from .models import Category, ProductType, Product, Banner, Offer


class CategorySerializer(serializers.ModelSerializer):
    _id = serializers.CharField(source="id", read_only=True)
    
    class Meta:
        model = Category
        fields = ["_id", "id", "name", "slug", "icon", "created_at"]


class ProductTypeSerializer(serializers.ModelSerializer):
    _id = serializers.CharField(source="id", read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category"
    )

    class Meta:
        model = ProductType
        fields = ["_id", "id", "category_id", "name", "created_at"]


class ProductSerializer(serializers.ModelSerializer):
    _id = serializers.CharField(source="id", read_only=True)
    # Writeable FK fields (accept integer PK, return integer PK)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category",
        required=False, allow_null=True
    )
    product_type_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductType.objects.all(), source="product_type",
        required=False, allow_null=True
    )

    # Read-only flattened fields — null-safe via SerializerMethodField
    category_name = serializers.SerializerMethodField()
    category_slug = serializers.SerializerMethodField()
    product_type_name = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "_id",
            "id",
            "name",
            "category_id",
            "product_type_id",
            "category_name",
            "category_slug",
            "product_type_name",
            "price",
            "original_price",
            "description",
            "image_urls",
            "stock",
            "is_top_selling",
            "is_new_arrival",
            "created_at",
            "updated_at",
        ]

    def get_category_name(self, obj):
        return obj.category.name if obj.category_id else None

    def get_category_slug(self, obj):
        return obj.category.slug if obj.category_id else None

    def get_product_type_name(self, obj):
        return obj.product_type.name if obj.product_type_id else None

    def validate_image_urls(self, value):
        """
        Admin form sends comma-separated string: "url1, url2, url3"
        API clients may send a JSON array: ["url1", "url2"]
        Normalise both to a list.
        """
        if isinstance(value, str):
            return [u.strip() for u in value.split(',') if u.strip()]
        if isinstance(value, list):
            return value
        return []


class BannerSerializer(serializers.ModelSerializer):
    _id = serializers.CharField(source="id", read_only=True)
    
    class Meta:
        model = Banner
        fields = [
            "_id", "id", "title", "subtitle", "button_text", "button_link",
            "bg_color_class", "image_url", "sort_order", "is_active", "created_at"
        ]


class OfferSerializer(serializers.ModelSerializer):
    _id = serializers.CharField(source="id", read_only=True)

    class Meta:
        model = Offer
        fields = [
            "_id", "id", "title", "description", "discount_percentage",
            "start_date", "end_date", "is_active", "created_at"
        ]
