from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CommunicationLogViewSet

router = DefaultRouter()
router.register(r'communications', CommunicationLogViewSet, basename='communicationlog')

urlpatterns = [
    path('', include(router.urls)),
]
