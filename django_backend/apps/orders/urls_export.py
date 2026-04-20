from django.urls import path
from .views import ExportOrdersView

urlpatterns = [
    # Frontend calls /api/export/orders (admin-dashboard.js:140)
    path('orders', ExportOrdersView.as_view(), name='export_orders'),
    path('orders/', ExportOrdersView.as_view(), name='export_orders_slash'),
    # bare /api/export also works
    path('', ExportOrdersView.as_view(), name='export'),
]
