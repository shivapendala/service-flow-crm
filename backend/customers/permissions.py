from rest_framework.permissions import BasePermission, SAFE_METHODS

class CanManageCustomer(BasePermission):
    """
    Fine-grained permission check for Customer Management:
    - Customer role: blocked entirely.
    - Support Agent: Read-only access to directory, but can add notes.
    - Sales Agent: Create customer, Read all, Edit/Delete only if assigned to them or created by them.
    - Admin & Manager: Full read, write, edit, delete access.
    """
    def has_permission(self, request, view):
        # 1. User must be authenticated
        if not (request.user and request.user.is_authenticated):
            return False
            
        # 2. Block the Customer role from accessing Customer Management APIs
        if request.user.role == 'Customer':
            return False
            
        # 3. Admins, Managers, Support Agents, and Sales Agents can perform Safe/Read actions
        if request.method in SAFE_METHODS:
            return True

        # 4. Support Agents cannot create or modify customer profiles (except adding notes via custom action)
        if request.user.role == 'Support Agent':
            # Allow POST only if it's the custom action to add notes
            if request.method == 'POST' and view.action == 'add_note':
                return True
            return False

        # 5. Sales Agents and above can create customer profiles
        if request.method == 'POST':
            return True

        # 6. For PUT/PATCH/DELETE, the object-level check is performed in has_object_permission
        return True

    def has_object_permission(self, request, view, obj):
        # 1. Admins and Managers have full power
        if request.user.role in ['Admin', 'Manager'] or request.user.is_superuser:
            return True

        # 2. Support Agents have read-only object access (except adding notes)
        if request.user.role == 'Support Agent':
            if request.method in SAFE_METHODS or view.action == 'add_note':
                return True
            return False

        # 3. Sales Agents can modify/delete only if they created the record or are assigned to it
        if request.user.role == 'Sales Agent':
            is_owner = (obj.created_by == request.user or obj.assigned_to == request.user)
            if request.method in SAFE_METHODS:
                return True
            # Allow edit/delete only if owner
            return is_owner

        return False
