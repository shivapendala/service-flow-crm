from rest_framework import serializers
from django.contrib.auth import get_user_model
from customers.serializers import UserMinimalSerializer
from .models import Lead

User = get_user_model()

class CustomerMinimalSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class LeadSerializer(serializers.ModelSerializer):
    assigned_to_details = UserMinimalSerializer(source='assigned_to', read_only=True)
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)
    converted_customer_details = CustomerMinimalSerializer(source='converted_customer', read_only=True)

    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Lead
        fields = (
            'id', 'first_name', 'last_name', 'email', 'phone', 
            'company_name', 'source', 'status', 'priority', 
            'follow_up_date', 'notes', 'is_converted', 'converted_customer', 'converted_customer_details',
            'assigned_to', 'assigned_to_details', 'created_by', 'created_by_details',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'is_converted', 'converted_customer', 'converted_customer_details', 'created_by', 'created_by_details', 'created_at', 'updated_at')

    def validate_email(self, value):
        instance = self.instance
        queryset = Lead.objects.filter(email__iexact=value)
        if instance:
            queryset = queryset.exclude(id=instance.id)
        if queryset.exists():
            raise serializers.ValidationError("A lead with this email address already exists.")
        return value.lower()

    def validate_phone(self, value):
        if value:
            cleaned = ''.join(c for c in value if c.isdigit() or c in '+-() ')
            if len(cleaned) < 7:
                raise serializers.ValidationError("Please enter a valid phone number (at least 7 digits).")
        return value
