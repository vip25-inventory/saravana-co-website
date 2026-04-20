from django.urls import path, include
from rest_framework.routers import DefaultRouter
from ..views import ProductTypeViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'', ProductTypeViewSet, basename='product_type')

urlpatterns = [path('', include(router.urls))]
