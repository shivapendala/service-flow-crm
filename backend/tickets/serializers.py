from rest_framework import serializers
from django.contrib.auth import get_user_model
from customers.serializers import UserMinimalSerializer
from customers.models import Customer
from .models import Ticket, TicketComment, TicketHistory

User = get_user_model()

class CustomerSummarySerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ('id', 'name', 'company_name', 'email')

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class TicketSerializer(serializers.ModelSerializer):
    assigned_to_details = UserMinimalSerializer(source='assigned_to', read_only=True)
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)
    customer_details = CustomerSummarySerializer(source='customer', read_only=True)

    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True
    )
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        required=True
    )

    class Meta:
        model = Ticket
        fields = (
            'id', 'ticket_number', 'customer', 'customer_details',
            'subject', 'description', 'category', 'priority', 'status',
            'assigned_to', 'assigned_to_details', 'created_by', 'created_by_details',
            'attachment', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'ticket_number', 'created_by', 'created_by_details', 'created_at', 'updated_at')


class TicketCommentSerializer(serializers.ModelSerializer):
    author_details = UserMinimalSerializer(source='author', read_only=True)

    class Meta:
        model = TicketComment
        fields = ('id', 'ticket', 'author', 'author_details', 'text', 'is_internal', 'created_at')
        read_only_fields = ('id', 'ticket', 'author', 'author_details', 'created_at')

    def validate(self, data):
        # Prevent customer role from posting comments flagged as internal
        request = self.context.get('request')
        if request and request.user and request.user.role == 'Customer':
            if data.get('is_internal', False):
                raise serializers.ValidationError({"is_internal": "Customers cannot submit internal support notes."})
        return data


class TicketHistorySerializer(serializers.ModelSerializer):
    changed_by_details = UserMinimalSerializer(source='changed_by', read_only=True)

    class Meta:
        model = TicketHistory
        fields = ('id', 'ticket', 'changed_by', 'changed_by_details', 'status_from', 'status_to', 'notes', 'changed_at')
        read_only_fields = ('id', 'changed_by', 'changed_by_details', 'changed_at')
