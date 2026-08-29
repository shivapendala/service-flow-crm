from django.db import models
from django.conf import settings
from customers.models import Customer

class Appointment(models.Model):
    STATUS_CHOICES = (
        ('Scheduled', 'Scheduled'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
        ('No Show', 'No Show'),
    )

    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='appointments'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_appointments'
    )
    
    date = models.DateField()
    time = models.TimeField()
    purpose = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Scheduled')
    notes = models.TextField(blank=True, default='')

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_appointments'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Appointment with {self.customer.first_name} {self.customer.last_name} on {self.date} at {self.time} ({self.status})"


class AppointmentHistory(models.Model):
    appointment = models.ForeignKey(
        Appointment,
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
        return f"History for Appointment {self.appointment.id}: {self.status_from} -> {self.status_to}"
