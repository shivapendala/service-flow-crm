from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    """
    Allows access only to Admin users (or django superusers).
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'Admin' or request.user.is_superuser)
        )

class IsManager(BasePermission):
    """
    Allows access to Admin and Manager users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role in ['Admin', 'Manager'] or request.user.is_superuser)
        )

class IsSupportAgent(BasePermission):
    """
    Allows access to Admin, Manager, and Support Agent users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role in ['Admin', 'Manager', 'Support Agent'] or request.user.is_superuser)
        )

class IsSalesAgent(BasePermission):
    """
    Allows access to Admin, Manager, and Sales Agent users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role in ['Admin', 'Manager', 'Sales Agent'] or request.user.is_superuser)
        )

class IsCustomer(BasePermission):
    """
    Allows access only to Customer users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'Customer'
        )
