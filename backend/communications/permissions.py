from rest_framework.permissions import BasePermission, SAFE_METHODS

class CanManageCommunication(BasePermission):
    """
    Object-level permissions check for Communication Logs:
    - Customer role: Can read/retrieve ONLY communications linked to their email. Cannot create, update, or delete.
    - Staff (Admin, Manager, Support Agent, Sales Agent): Full CRUD.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        if request.user.role == 'Customer':
            # Customers are only allowed to read (GET)
            return request.method in SAFE_METHODS
            
        return True

    def has_object_permission(self, request, view, obj):
        # 1. Staff access override
        if request.user.role in ['Admin', 'Manager', 'Support Agent', 'Sales Agent'] or request.user.is_superuser:
            return True

        # 2. Customer limitations
        if request.user.role == 'Customer':
            if request.method not in SAFE_METHODS:
                return False
            # Check linkage
            return obj.customer and (obj.customer.email.lower() == request.user.email.lower())

        return False
