from rest_framework import serializers
from django.contrib.auth import get_user_model
from customers.serializers import UserMinimalSerializer
from customers.models import Customer
from .models import Deal

User = get_user_model()

class CustomerMinimalSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ('id', 'name', 'company_name')

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class DealSerializer(serializers.ModelSerializer):
    assigned_to_details = UserMinimalSerializer(source='assigned_to', read_only=True)
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)
    customer_details = CustomerMinimalSerializer(source='customer', read_only=True)

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
        model = Deal
        fields = (
            'id', 'title', 'deal_value', 'stage', 'expected_close_date',
            'customer', 'customer_details',
            'assigned_to', 'assigned_to_details', 'created_by', 'created_by_details',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_by', 'created_by_details', 'created_at', 'updated_at')

    def validate_deal_value(self, value):
        if value < 0:
            raise serializers.ValidationError("Deal value cannot be a negative amount.")
        return value
