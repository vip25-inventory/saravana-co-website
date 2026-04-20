import csv
from datetime import datetime
from django.db.models import Q, Sum
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.utils.dateparse import parse_datetime
from django.http import HttpResponse

from saravanaco.pagination import CustomNodePagination
from .models import Order
from apps.catalog.models import Product, Offer
from .serializers import OrderSerializer, PlaceOrderSerializer


class OrderPagination(CustomNodePagination):
    out_key = 'orders'


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.prefetch_related('items').all()
    serializer_class = OrderSerializer
    pagination_class = OrderPagination

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        search = params.get('search')
        if search:
            # We match Node's custom behavior
            qs = qs.filter(
                Q(customer_name__icontains=search) |
                Q(phone__icontains=search) |
                Q(id=search if search.isdigit() else -1)
            )

        status_filter = params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        date_from = params.get('date_from')
        date_to = params.get('date_to')
        if date_from:
            qs = qs.filter(created_at__gte=parse_datetime(date_from))
        if date_to:
            qs = qs.filter(created_at__lte=parse_datetime(date_to + "T23:59:59Z"))

        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return PlaceOrderSerializer
        return OrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = PlaceOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        # Return full order using read serializer
        read_serializer = OrderSerializer(order)
        return Response({
            "message": "Order placed successfully!",
            "order_id": str(order.id),
            "order": read_serializer.data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['put'])
    def status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = [c[0] for c in Order.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({"error": f"Status must be one of: {', '.join(valid_statuses)}"}, status=400)
        
        order.status = new_status
        order.save()
        serializer = self.get_serializer(order)
        return Response({"order": serializer.data, "message": "Order status updated."})


class StatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from django.utils import timezone
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        total_orders = Order.objects.count()
        total_products = Product.objects.count()
        active_offers = Offer.objects.filter(
            is_active=True,
            start_date__lte=now,
            end_date__gte=now
        ).count()
        pending_orders = Order.objects.filter(status='Pending').count()

        # Revenue today (USE_TZ-aware filter)
        revenue_agg = Order.objects.filter(
            created_at__gte=today_start
        ).exclude(status='Cancelled').aggregate(Sum('total_amount'))
        today_revenue = revenue_agg['total_amount__sum'] or 0

        return Response({
            "total_orders": total_orders,
            "total_products": total_products,
            "active_offers": active_offers,
            "today_revenue": today_revenue,
            "pending_orders": pending_orders,
        })


class ExportOrdersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # Return as spreadsheetml so api.js returns raw response for blob download
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="orders.csv"'

        # Write CSV content (openpyxl could be used here in future)
        import io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Order ID', 'Customer', 'Phone', 'Email', 'Address',
                         'City', 'State', 'Pincode', 'Total', 'Status',
                         'Payment Method', 'Notes', 'Items', 'Date'])
        
        orders = Order.objects.prefetch_related('items').order_by('-created_at')
        for order in orders:
            items_str = '; '.join(
                f"{i.product_name} x{i.quantity} @{i.price}"
                for i in order.items.all()
            )
            writer.writerow([
                order.id,
                order.customer_name,
                order.phone,
                order.email or '',
                order.address,
                order.city,
                order.state,
                order.pincode,
                order.total_amount,
                order.status,
                order.payment_method,
                order.notes or '',
                items_str,
                order.created_at.strftime('%Y-%m-%d %H:%M'),
            ])

        response.write(output.getvalue().encode('utf-8'))
        return response
