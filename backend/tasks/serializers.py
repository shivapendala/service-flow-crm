from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from customers.serializers import UserMinimalSerializer
from tickets.serializers import CustomerSummarySerializer
from customers.models import Customer
from leads.models import Lead
from deals.models import Deal
from tickets.models import Ticket
from .models import Task

User = get_user_model()

class LeadMinimalSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = ('id', 'name', 'company_name')

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class DealMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deal
        fields = ('id', 'title', 'deal_value')


class TicketMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ('id', 'ticket_number', 'subject')


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_details = UserMinimalSerializer(source='assigned_to', read_only=True)
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)
    customer_details = CustomerSummarySerializer(source='customer', read_only=True)
    lead_details = LeadMinimalSerializer(source='lead', read_only=True)
    deal_details = DealMinimalSerializer(source='deal', read_only=True)
    ticket_details = TicketMinimalSerializer(source='ticket', read_only=True)

    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(), required=False, allow_null=True
    )
    lead = serializers.PrimaryKeyRelatedField(
        queryset=Lead.objects.all(), required=False, allow_null=True
    )
    deal = serializers.PrimaryKeyRelatedField(
        queryset=Deal.objects.all(), required=False, allow_null=True
    )
    ticket = serializers.PrimaryKeyRelatedField(
        queryset=Ticket.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Task
        fields = (
            'id', 'title', 'description', 'priority', 'status', 'due_date', 'reminder_time',
            'assigned_to', 'assigned_to_details', 'created_by', 'created_by_details',
            'customer', 'customer_details', 'lead', 'lead_details', 'deal', 'deal_details', 'ticket', 'ticket_details',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_by', 'created_by_details', 'created_at', 'updated_at')

    def validate(self, data):
        # Validate reminder time is before due date
        due_date = data.get('due_date')
        reminder_time = data.get('reminder_time')
        
        if due_date and reminder_time:
            if reminder_time.date() > due_date:
                raise serializers.ValidationError({"reminder_time": "Reminder date cannot be scheduled after the due date."})
        return data
