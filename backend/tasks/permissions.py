from rest_framework.permissions import BasePermission, SAFE_METHODS

class CanManageTask(BasePermission):
    """
    Object-level permissions check for Task Management:
    - Customer role: blocked entirely.
    - Sales Agent & Support Agent: Create, view all, update/delete only if assigned to them or created by them.
    - Admin & Manager: Full CRUD.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        # Block Customers from accessing Tasks app
        if request.user.role == 'Customer':
            return False
            
        return True

    def has_object_permission(self, request, view, obj):
        if request.user.role in ['Admin', 'Manager'] or request.user.is_superuser:
            return True

        # Agents can update/delete only if owner or assignee
        return obj.created_by == request.user or obj.assigned_to == request.user
