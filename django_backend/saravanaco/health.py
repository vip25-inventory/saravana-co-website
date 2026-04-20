"""
Health check endpoint — GET /api/health/
Returns { status, pid, timestamp } — identical to Node's health route.
"""
from django.urls import path
from django.http import JsonResponse
import os
import datetime


def health(request):
    return JsonResponse({
        "status": "ok",
        "pid": os.getpid(),
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "backend": "django",
    })


urlpatterns = [
    path("", health),
]
