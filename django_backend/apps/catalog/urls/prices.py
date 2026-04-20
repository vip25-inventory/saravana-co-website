from django.urls import path
from ..views import BulkPriceUpdateView

urlpatterns = [
    path('', BulkPriceUpdateView.as_view(), name='prices-bulk-update'),
]
