from django.db import models
from django.conf import settings
from customers.models import Customer

class Ticket(models.Model):
    CATEGORY_CHOICES = (
        ('Technical', 'Technical'),
        ('Billing', 'Billing'),
        ('General', 'General'),
        ('Feature Request', 'Feature Request'),
        ('Other', 'Other'),
    )

    PRIORITY_CHOICES = (
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Urgent', 'Urgent'),
    )

    STATUS_CHOICES = (
        ('Open', 'Open'),
        ('In Progress', 'In Progress'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
    )

    ticket_number = models.CharField(max_length=20, unique=True, blank=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='tickets'
    )
    subject = models.CharField(max_length=200)
    description = models.TextField()
    
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='General')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
    
    # Assignments & Ownership
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_tickets'
    )
    
    attachment = models.FileField(upload_to='attachments/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Auto-generate unique ticket number TIC-1001, TIC-1002, etc.
        if not self.ticket_number:
            # Query maximum ID or record count in DB
            last_ticket = Ticket.objects.all().order_by('id').last()
            if last_ticket:
                last_id = last_ticket.id
            else:
                last_id = 0
            self.ticket_number = f"TIC-{1000 + last_id + 1}"
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ticket_number}: {self.subject} ({self.status})"


class TicketComment(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    text = models.TextField()
    is_internal = models.BooleanField(default=False) # Internal notes only visible to staff
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.author.email} on {self.ticket.ticket_number}"


class TicketHistory(models.Model):
    ticket = models.ForeignKey(
        Ticket,
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
        return f"History: {self.ticket.ticket_number} changed {self.status_from} -> {self.status_to}"
