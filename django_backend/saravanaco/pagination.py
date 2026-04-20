"""
saravanaco/pagination.py
Matches Node.js backend pagination shape exactly:
{
  "products": [...], # Or orders, depending on view
  "pagination": {
      "total": 100,
      "page": 1,
      "limit": 12,
      "totalPages": 9
  }
}
"""
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
import math

class CustomNodePagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'limit'
    max_page_size = 100
    page_query_param = 'page'

    # Allow views to override what the root key is called (e.g. 'orders' instead of 'products')
    out_key = 'products'

    def get_paginated_response(self, data):
        total = self.page.paginator.count
        limit = self.get_page_size(self.request)
        page = self.page.number

        return Response({
            self.out_key: data,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "totalPages": math.ceil(total / limit) if limit else 1
            }
        })
