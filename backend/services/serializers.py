from rest_framework import serializers
from django.contrib.auth import get_user_model
from customers.serializers import UserMinimalSerializer
from tickets.serializers import CustomerSummarySerializer
from customers.models import Customer
from .models import ServiceRequest, ServiceRequestComment, ServiceRequestHistory

User = get_user_model()

class ServiceRequestSerializer(serializers.ModelSerializer):
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
        model = ServiceRequest
        fields = (
            'id', 'customer', 'customer_details',
            'category', 'priority', 'status', 'due_date',
            'description', 'resolution_details',
            'assigned_to', 'assigned_to_details', 'created_by', 'created_by_details',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_by', 'created_by_details', 'created_at', 'updated_at')


class ServiceRequestCommentSerializer(serializers.ModelSerializer):
    author_details = UserMinimalSerializer(source='author', read_only=True)

    class Meta:
        model = ServiceRequestComment
        fields = ('id', 'request', 'author', 'author_details', 'text', 'created_at')
        read_only_fields = ('id', 'request', 'author', 'author_details', 'created_at')


class ServiceRequestHistorySerializer(serializers.ModelSerializer):
    changed_by_details = UserMinimalSerializer(source='changed_by', read_only=True)

    class Meta:
        model = ServiceRequestHistory
        fields = ('id', 'request', 'changed_by', 'changed_by_details', 'status_from', 'status_to', 'notes', 'changed_at')
        read_only_fields = ('id', 'request', 'changed_by', 'changed_by_details', 'changed_at')
