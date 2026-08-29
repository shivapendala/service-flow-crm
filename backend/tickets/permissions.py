from rest_framework.permissions import BasePermission, SAFE_METHODS

class CanManageTicket(BasePermission):
    """
    Object-level permissions check for Support Tickets:
    - Customer role: Can create, can list/retrieve ONLY tickets linked to their email, can post comments. Cannot delete.
    - Support Agent & Admin & Manager: Full CRUD.
    - Sales Agent: Read-only access to tickets directory. Can comment.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        return True

    def has_object_permission(self, request, view, obj):
        # 1. Staff override (Admin, Manager, Support Agent)
        if request.user.role in ['Admin', 'Manager', 'Support Agent'] or request.user.is_superuser:
            return True

        # 2. Sales Agent (Read-only access)
        if request.user.role == 'Sales Agent':
            return request.method in SAFE_METHODS or view.action == 'add_comment'

        # 3. Customer Role restrictions
        if request.user.role == 'Customer':
            # Check if ticket belongs to the customer contact matching user's email
            belongs_to_user = (obj.customer.email.lower() == request.user.email.lower())
            
            if not belongs_to_user:
                return False
                
            # Customers cannot delete tickets
            if request.method == 'DELETE':
                return False
                
            # Allowed standard GET, PUT, PATCH actions on their own tickets
            return True

        return False
