from django.db import models
from django.conf import settings
from customers.models import Customer

class Deal(models.Model):
    STAGE_CHOICES = (
        ('New', 'New'),
        ('Contacted', 'Contacted'),
        ('Qualified', 'Qualified'),
        ('Proposal', 'Proposal'),
        ('Negotiation', 'Negotiation'),
        ('Won', 'Won'),
        ('Lost', 'Lost'),
    )

    title = models.CharField(max_length=150)
    deal_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default='New')
    expected_close_date = models.DateField(null=True, blank=True)
    
    # Customer relationship association
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='deals'
    )
    
    # Assignments & Ownership
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_deals'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_deals'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Deal: {self.title} (${self.deal_value}) - {self.stage}"
