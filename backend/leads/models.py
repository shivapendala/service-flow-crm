from django.db import models
from django.conf import settings
from customers.models import Customer

class Lead(models.Model):
    SOURCE_CHOICES = (
        ('Website', 'Website'),
        ('Referral', 'Referral'),
        ('Cold Reach', 'Cold Reach'),
        ('Advertisement', 'Advertisement'),
        ('Partner', 'Partner'),
        ('Other', 'Other'),
    )

    STATUS_CHOICES = (
        ('New', 'New'),
        ('Contacted', 'Contacted'),
        ('Qualified', 'Qualified'),
        ('Proposal Sent', 'Proposal Sent'),
        ('Converted', 'Converted'),
        ('Lost', 'Lost'),
    )

    PRIORITY_CHOICES = (
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    )

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, default='')
    company_name = models.CharField(max_length=150, blank=True, default='')
    
    source = models.CharField(max_length=50, choices=SOURCE_CHOICES, default='Website')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='New')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    
    follow_up_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    
    # Lead Conversion Pointers
    is_converted = models.BooleanField(default=False)
    converted_customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='converted_from_lead'
    )
    
    # Assignments & Ownership
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_leads'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_leads'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Lead: {self.first_name} {self.last_name} ({self.company_name or 'No Company'})"
