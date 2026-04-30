from django.urls import path
from ..views import (
    BulkPriceUpdateView,
    SinglePriceUpdateView,
    SelectiveDiscountView,
    GlobalDiscountView,
    UndoOfferView
)

urlpatterns = [
    path('', BulkPriceUpdateView.as_view(), name='prices-bulk-update'),
    path('single', SinglePriceUpdateView.as_view(), name='prices-single'),
    path('selective', SelectiveDiscountView.as_view(), name='prices-selective'),
    path('global-discount', GlobalDiscountView.as_view(), name='prices-global'),
    path('undo-offer', UndoOfferView.as_view(), name='prices-undo'),
]
