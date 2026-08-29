from rest_framework.permissions import BasePermission, SAFE_METHODS

class CanManageServiceRequest(BasePermission):
    """
    Object-level permissions check for Service Requests:
    - Customer role: Can create, can list/retrieve ONLY requests linked to their email, can post comments. Cannot delete or edit configurations.
    - Support Agent & Admin & Manager: Full CRUD.
    - Sales Agent: Full CRUD.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return True

    def has_object_permission(self, request, view, obj):
        # 1. Staff override
        if request.user.role in ['Admin', 'Manager', 'Support Agent', 'Sales Agent'] or request.user.is_superuser:
            return True

        # 2. Customer Role restrictions
        if request.user.role == 'Customer':
            belongs_to_user = (obj.customer.email.lower() == request.user.email.lower())
            
            if not belongs_to_user:
                return False
                
            if request.method == 'DELETE':
                return False
                
            # Customers cannot edit resolution details or assign agents
            if request.method in ['PUT', 'PATCH']:
                # Allow customers to cancel their own requests by setting status = Cancelled
                status_change_only = len(request.data.keys()) == 1 and 'status' in request.data
                if status_change_only and request.data['status'] == 'Cancelled':
                    return True
                return False

            return True

        return False
