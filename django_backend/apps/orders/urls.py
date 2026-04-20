from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'', OrderViewSet, basename='order')

urlpatterns = [path('', include(router.urls))]
