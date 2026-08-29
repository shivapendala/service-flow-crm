from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Customer, CustomerHistory

User = get_user_model()

class UserMinimalSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'role')

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email


class CustomerHistorySerializer(serializers.ModelSerializer):
    action_by_details = UserMinimalSerializer(source='action_by', read_only=True)

    class Meta:
        model = CustomerHistory
        fields = ('id', 'action', 'note', 'timestamp', 'action_by_details')


class CustomerSerializer(serializers.ModelSerializer):
    assigned_to_details = UserMinimalSerializer(source='assigned_to', read_only=True)
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)
    
    # We allow writing assigned_to as a primary key (user ID)
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Customer
        fields = (
            'id', 'first_name', 'last_name', 'email', 'phone', 
            'company_name', 'company_website', 'status', 'address',
            'assigned_to', 'assigned_to_details', 'created_by', 'created_by_details',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_by', 'created_by_details', 'created_at', 'updated_at')

    def validate_email(self, value):
        # Email uniqueness check (excluding current instance on updates)
        instance = self.instance
        queryset = Customer.objects.filter(email__iexact=value)
        if instance:
            queryset = queryset.exclude(id=instance.id)
        if queryset.exists():
            raise serializers.ValidationError("A customer with this email address already exists.")
        return value.lower()

    def validate_phone(self, value):
        if value:
            # Basic validation: check length and digit presence
            cleaned = ''.join(c for c in value if c.isdigit() or c in '+-() ')
            if len(cleaned) < 7:
                raise serializers.ValidationError("Please enter a valid phone number (at least 7 digits).")
        return value
