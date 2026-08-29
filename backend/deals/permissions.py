from rest_framework.permissions import BasePermission, SAFE_METHODS

class CanManageDeal(BasePermission):
    """
    Fine-grained permission check for Deals/Sales Pipeline:
    - Customer role: blocked entirely.
    - Support Agent: Read-only access.
    - Sales Agent: Create deals, Read all, Edit/Delete only if assigned to them or created by them.
    - Admin & Manager: Full read, write, edit, delete access.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        if request.user.role == 'Customer':
            return False
            
        if request.method in SAFE_METHODS:
            return True

        if request.user.role == 'Support Agent':
            return False

        if request.method == 'POST':
            return True

        return True

    def has_object_permission(self, request, view, obj):
        if request.user.role in ['Admin', 'Manager'] or request.user.is_superuser:
            return True

        if request.user.role == 'Support Agent':
            return request.method in SAFE_METHODS

        if request.user.role == 'Sales Agent':
            if request.method in SAFE_METHODS:
                return True
            return obj.created_by == request.user or obj.assigned_to == request.user

        return False
