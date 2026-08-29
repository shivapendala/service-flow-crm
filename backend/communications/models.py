from django.db import models
from django.conf import settings
from django.utils import timezone
from customers.models import Customer
from leads.models import Lead
from deals.models import Deal
from tickets.models import Ticket

class CommunicationLog(models.Model):
    CONTACT_TYPE_CHOICES = (
        ('Call', 'Call'),
        ('Email', 'Email'),
        ('Meeting', 'Meeting'),
        ('Message', 'Message'),
        ('Note', 'Note'),
        ('Follow-up', 'Follow-up'),
    )

    contact_type = models.CharField(max_length=20, choices=CONTACT_TYPE_CHOICES)
    subject = models.CharField(max_length=200)
    content = models.TextField()
    
    logged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logged_communications'
    )
    interaction_date = models.DateTimeField(default=timezone.now)

    # Optional relationships to other entities
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='communications'
    )
    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='communications'
    )
    deal = models.ForeignKey(
        Deal,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='communications'
    )
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='communications'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.contact_type}: {self.subject} ({self.interaction_date.date()})"
