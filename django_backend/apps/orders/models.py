"""
apps/orders/models.py
Migrated from Node Mongoose models:
  - Order.js      → Order + OrderItem
  - Snapshot pattern preserved: price stored at time of order placement
"""
from django.db import models


class Order(models.Model):
    """
    Node: Order.js (orderSchema)
    Snapshot pattern: customer details + total stored at order time.
    No FK to Customer — matches Node's stateless guest-checkout model.
    """
    STATUS_CHOICES = [
        ("Pending",     "Pending"),
        ("Processing",  "Processing"),
        ("In Transit",  "In Transit"),
        ("Delivered",   "Delivered"),
        ("Cancelled",   "Cancelled"),
    ]

    # Customer info (snapshot — no auth required for public checkout)
    customer_name = models.CharField(max_length=500)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField()
    city = models.CharField(max_length=255)
    state = models.CharField(max_length=255)
    pincode = models.CharField(max_length=20)

    # Order metadata
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="Pending")
    payment_method = models.CharField(max_length=100, default="Cash on Delivery")
    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders_order"
        verbose_name = "Order"
        verbose_name_plural = "Orders"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.pk} — {self.customer_name} ({self.status})"


class OrderItem(models.Model):
    """
    Node: orderItemSchema (embedded in Order.items[])
    Snapshot pattern: product_name and price copied at checkout time.
    FK to Product is advisory — product may be deleted later.
    """
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )
    # Advisory FK — SET_NULL so order history survives product deletion
    product = models.ForeignKey(
        "catalog.Product",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="order_items",
        db_column="product_id",
    )
    # Snapshot fields (always written at order time — never read from Product)
    product_name = models.CharField(max_length=500)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "orders_order_item"
        verbose_name = "Order Item"
        verbose_name_plural = "Order Items"

    def __str__(self):
        return f"{self.quantity}× {self.product_name} @ ₹{self.price}"
