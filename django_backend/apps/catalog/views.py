"""
apps/catalog/views.py
FIXED:
 - CategoryViewSet.list() → { categories: [...] }   (frontend: const { categories } = ...)
 - ProductTypeViewSet.list() → { product_types: [...] }
 - BannerViewSet.list() → { banners: [...] }
 - OfferViewSet.list() → { offers: [...] }
 - Public GET endpoints use AllowAny; writes still require IsAuthenticated
"""
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.db.models import Q
from django.utils.text import slugify
from saravanaco.pagination import CustomNodePagination
from .models import Category, ProductType, Product, Banner, Offer
from .serializers import (
    CategorySerializer, ProductTypeSerializer, ProductSerializer,
    BannerSerializer, OfferSerializer
)


def _public_or_admin(action):
    """Return AllowAny for safe reads, IsAuthenticated for writes."""
    if action in ('list', 'retrieve'):
        return [permissions.AllowAny()]
    return [permissions.IsAuthenticated()]


# ── Category ─────────────────────────────────────────────────────

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        return _public_or_admin(self.action)

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        seen = set()
        unique_qs = []
        for cat in qs:
            if cat.name not in seen:
                seen.add(cat.name)
                unique_qs.append(cat)
        serializer = self.get_serializer(unique_qs, many=True)
        return Response({"categories": serializer.data})


# ── ProductType ───────────────────────────────────────────────────

class ProductTypeViewSet(viewsets.ModelViewSet):
    queryset = ProductType.objects.select_related('category').all()
    serializer_class = ProductTypeSerializer

    def get_permissions(self):
        return _public_or_admin(self.action)

    def get_queryset(self):
        qs = super().get_queryset()
        category_id = self.request.query_params.get('category_id')
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(qs, many=True)
        return Response({"product_types": serializer.data})


# ── Product ───────────────────────────────────────────────────────

class ProductPagination(CustomNodePagination):
    out_key = 'products'


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category', 'product_type').all()
    serializer_class = ProductSerializer
    pagination_class = ProductPagination

    def get_permissions(self):
        return _public_or_admin(self.action)

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        category = params.get('category')
        if category:
            qs = qs.filter(category__slug=category)

        category_id = params.get('category_id')
        if category_id:
            qs = qs.filter(category_id=category_id)

        product_type_id = params.get('product_type_id')
        if product_type_id:
            qs = qs.filter(product_type_id=product_type_id)

        min_price = params.get('min_price')
        max_price = params.get('max_price')
        if min_price:
            try:
                qs = qs.filter(price__gte=float(min_price))
            except ValueError:
                pass
        if max_price:
            try:
                qs = qs.filter(price__lte=float(max_price))
            except ValueError:
                pass

        search = params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))

        if params.get('is_top_selling') == 'true':
            qs = qs.filter(is_top_selling=True)
        if params.get('is_new_arrival') == 'true':
            qs = qs.filter(is_new_arrival=True)

        sort_map = {
            'created_at_desc': '-created_at',
            'price_asc':        'price',
            'price_desc':       '-price',
            'name_asc':         'name',
        }
        sort = params.get('sort', 'created_at_desc')
        qs = qs.order_by(sort_map.get(sort, '-created_at'))
        return qs

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        # Similar by category (random sample of 4)
        similar_category = []
        if instance.category_id:
            cat_qs = (Product.objects
                      .select_related('category', 'product_type')
                      .filter(category_id=instance.category_id)
                      .exclude(id=instance.id)
                      .order_by('?')[:4])
            similar_category = ProductSerializer(cat_qs, many=True).data

        # Similar by product type
        similar_type = []
        if instance.product_type_id:
            type_qs = (Product.objects
                       .select_related('category', 'product_type')
                       .filter(product_type_id=instance.product_type_id)
                       .exclude(id=instance.id)
                       .order_by('?')[:4])
            similar_type = ProductSerializer(type_qs, many=True).data

        return Response({
            "product": serializer.data,
            "similar_category": similar_category,
            "similar_type": similar_type,
        })

    @action(detail=False, methods=['post'], url_path='bulk-upload')
    def bulk_upload(self, request):
        if 'file' not in request.FILES:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
        
        file_obj = request.FILES['file']
        filename = file_obj.name.lower()
        success = 0
        failed = []
        
        def process_row(row, idx):
            try:
                name = row.get('product_name')
                if not name:
                    return False, f"Row {idx}: product_name missing"
                
                price = row.get('price')
                images = row.get('image_urls', '')
                if isinstance(images, str):
                    images = [u.strip() for u in images.split(',') if u.strip()]
                
                cat_slug = row.get('category')
                cat = None
                if cat_slug:
                    cat, _ = Category.objects.get_or_create(slug=slugify(cat_slug), defaults={'name': cat_slug})
                
                Product.objects.update_or_create(
                    name=name,
                    defaults={
                        'price': float(price) if price else 0.0,
                        'description': row.get('description', ''),
                        'image_urls': images,
                        'stock': int(row.get('stock_qty') or 0),
                        'category': cat
                    }
                )
                return True, None
            except Exception as e:
                return False, f"Row {idx}: {str(e)}"
        
        if filename.endswith('.csv'):
            import codecs
            import csv
            reader = csv.DictReader(codecs.iterdecode(file_obj, 'utf-8'))
            for idx, row in enumerate(reader, start=1):
                ok, err = process_row(row, idx)
                if ok: success += 1
                else: failed.append(err)
        elif filename.endswith('.json'):
            import json
            try:
                data = json.load(file_obj)
                if not isinstance(data, list):
                    return Response({"error": "JSON must be an array"}, status=400)
                for idx, row in enumerate(data, start=1):
                    ok, err = process_row(row, idx)
                    if ok: success += 1
                    else: failed.append(err)
            except Exception as e:
                return Response({"error": f"Invalid JSON: {str(e)}"}, status=400)
        else:
            return Response({"error": "Only CSV and JSON allowed"}, status=400)
            
        return Response({
            "success_count": success,
            "failed_rows": failed
        })


# ── Banner ────────────────────────────────────────────────────────

class BannerViewSet(viewsets.ModelViewSet):
    queryset = Banner.objects.filter(is_active=True).order_by('sort_order')
    serializer_class = BannerSerializer

    def get_permissions(self):
        return _public_or_admin(self.action)

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(qs, many=True)
        return Response({"banners": serializer.data})


# ── Offer ─────────────────────────────────────────────────────────

class OfferViewSet(viewsets.ModelViewSet):
    queryset = Offer.objects.all()
    serializer_class = OfferSerializer

    def get_permissions(self):
        return _public_or_admin(self.action)

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(qs, many=True)
        return Response({"offers": serializer.data})


# ── Bulk Price Update ─────────────────────────────────────────────

class BulkPriceUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, *args, **kwargs):
        updates = request.data.get('updates', [])
        if not isinstance(updates, list):
            return Response({"error": "updates must be a list"}, status=400)
        updated = 0
        for update in updates:
            prod_id = update.get('product_id')
            price = update.get('price')
            if prod_id and price is not None:
                try:
                    rows = Product.objects.filter(id=int(prod_id)).update(price=float(price))
                    updated += rows
                except (ValueError, TypeError):
                    pass
        return Response({"message": f"Updated {updated} product price(s)."})
