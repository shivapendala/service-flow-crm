from rest_framework.permissions import BasePermission, SAFE_METHODS

class CanManageAppointment(BasePermission):
    """
    Object-level permissions check for Appointments:
    - Customer role: Can view own appointments. Can PATCH status to 'Cancelled'. Cannot update other fields. Cannot delete.
    - Staff (Admin, Manager, Support Agent, Sales Agent): Full CRUD.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return True

    def has_object_permission(self, request, view, obj):
        # 1. Staff access override
        if request.user.role in ['Admin', 'Manager', 'Support Agent', 'Sales Agent'] or request.user.is_superuser:
            return True

        # 2. Customer limitations
        if request.user.role == 'Customer':
            belongs_to_user = (obj.customer.email.lower() == request.user.email.lower())
            
            if not belongs_to_user:
                return False
                
            if request.method == 'DELETE':
                return False
                
            # Allow customers to self-cancel appointments
            if request.method in ['PUT', 'PATCH']:
                status_change_only = len(request.data.keys()) == 1 and 'status' in request.data
                if status_change_only and request.data['status'] == 'Cancelled':
                    return True
                return False

            return True

        return False
