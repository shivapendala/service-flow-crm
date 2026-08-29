from django.db import models
from django.conf import settings
from customers.models import Customer

class ServiceRequest(models.Model):
    CATEGORY_CHOICES = (
        ('Maintenance', 'Maintenance'),
        ('Installation', 'Installation'),
        ('Repair', 'Repair'),
        ('Consultation', 'Consultation'),
        ('Other', 'Other'),
    )

    PRIORITY_CHOICES = (
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Urgent', 'Urgent'),
    )

    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Scheduled', 'Scheduled'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    )

    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='service_requests'
    )
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Maintenance')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    
    due_date = models.DateField(null=True, blank=True)
    description = models.TextField()
    resolution_details = models.TextField(blank=True, default='')
    
    # Assignments & Ownership
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_service_requests'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_service_requests'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Service Request {self.id}: {self.category} ({self.status}) for {self.customer.company_name or self.customer.first_name}"


class ServiceRequestComment(models.Model):
    request = models.ForeignKey(
        ServiceRequest,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.author.email} on Request {self.request.id}"


class ServiceRequestHistory(models.Model):
    request = models.ForeignKey(
        ServiceRequest,
        on_delete=models.CASCADE,
        related_name='history'
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    status_from = models.CharField(max_length=20)
    status_to = models.CharField(max_length=20)
    notes = models.TextField(blank=True, default='')
    
    changed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"History for Request {self.request.id}: {self.status_from} -> {self.status_to}"
