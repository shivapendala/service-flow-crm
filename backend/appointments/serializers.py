from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from customers.serializers import UserMinimalSerializer
from tickets.serializers import CustomerSummarySerializer
from customers.models import Customer
from .models import Appointment, AppointmentHistory

User = get_user_model()

class AppointmentSerializer(serializers.ModelSerializer):
    assigned_to_details = UserMinimalSerializer(source='assigned_to', read_only=True)
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)
    customer_details = CustomerSummarySerializer(source='customer', read_only=True)

    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(), required=True
    )

    class Meta:
        model = Appointment
        fields = (
            'id', 'customer', 'customer_details', 'assigned_to', 'assigned_to_details',
            'date', 'time', 'purpose', 'location', 'status', 'notes',
            'created_by', 'created_by_details', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_by', 'created_by_details', 'created_at', 'updated_at')

    def validate_date(self, value):
        # Prevent scheduling appointments in the past (before today)
        today = timezone.now().date()
        if value < today:
            raise serializers.ValidationError("Appointment date cannot be scheduled in the past.")
        return value


class AppointmentHistorySerializer(serializers.ModelSerializer):
    changed_by_details = UserMinimalSerializer(source='changed_by', read_only=True)

    class Meta:
        model = AppointmentHistory
        fields = ('id', 'appointment', 'changed_by', 'changed_by_details', 'status_from', 'status_to', 'notes', 'changed_at')
        read_only_fields = ('id', 'appointment', 'changed_by', 'changed_by_details', 'changed_at')
