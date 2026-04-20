"""
saravanaco/exceptions.py — Custom DRF exception handler
Mirrors Node's errorHandler.js response shape: { "error": "message" }
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        # Flatten DRF's nested error dicts into a single "error" string
        data = response.data
        if isinstance(data, dict):
            # Extract first error message for Node-compat shape
            first_val = next(iter(data.values()), None)
            if isinstance(first_val, list):
                error_msg = str(first_val[0])
            elif isinstance(first_val, str):
                error_msg = first_val
            else:
                error_msg = str(data)
            response.data = {"error": error_msg}
        elif isinstance(data, list):
            response.data = {"error": str(data[0])}

    return response
