from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import UserProfile, PasswordResetToken
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    UserCreateSerializer,
    UserProfileSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer
)
from .permissions import IsAdmin, IsManager

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer


class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserProfileSerializer

    def get_object(self):
        # Return the profile linked to the logged in user
        return self.request.user.profile

    def retrieve(self, request, *args, **kwargs):
        # We want to return user details AND profile details together
        user_serializer = UserSerializer(request.user)
        return Response(user_serializer.data)

    def update(self, request, *args, **kwargs):
        # Update user fields (first_name, last_name) and profile fields
        user = request.user
        
        # Parse first_name and last_name if present in request
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        
        user_updated = False
        if first_name is not None:
            user.first_name = first_name
            user_updated = True
        if last_name is not None:
            user.last_name = last_name
            user_updated = True
            
        if user_updated:
            user.save()
            
        # Standard profile update
        return super().update(request, *args, **kwargs)


class PasswordResetRequestView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = serializer.context.get('user')
            
            if user:
                # Invalidate active previous tokens
                PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
                
                # Create new token
                reset_token = PasswordResetToken.objects.create(user=user)
                
                # Format a reset link (simulating SMTP dispatch)
                reset_link = f"http://localhost:5173/reset-password?token={reset_token.token}"
                print("\n" + "="*50)
                print(f"PASSWORD RESET REQUEST FOR USER: {user.email}")
                print(f"TOKEN: {reset_token.token}")
                print(f"RESET LINK: {reset_link}")
                print("="*50 + "\n")
                
                return Response(
                    {"detail": "If your email is registered, you will receive a password reset token.", "token": str(reset_token.token)},
                    status=status.HTTP_200_OK
                )
            
            # Security: return 200 even if user doesn't exist
            return Response(
                {"detail": "If your email is registered, you will receive a password reset token."},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            reset_token = serializer.context.get('reset_token')
            user = reset_token.user
            password = serializer.validated_data['password']
            
            # Set new password
            user.set_password(password)
            user.save()
            
            # Mark token as used
            reset_token.is_used = True
            reset_token.save()
            
            return Response(
                {"detail": "Password has been reset successfully. You can now log in."},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for listing, creating, retrieving, updating and deleting users.
    Restricted to Admins and Managers.
    """
    queryset = User.objects.all().order_by('-created_at')
    permission_classes = (IsManager,)

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer


class DashboardDataView(APIView):
    """
    Returns role-specific metrics to test RBAC and demonstrate customized access.
    """
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        role = request.user.role
        email = request.user.email
        
        # Seed some mock statistics based on the role to make the dashboard dynamic
        if role == 'Admin':
            data = {
                "message": f"Welcome to the Admin Portal, {email}",
                "role": "Admin",
                "stats": {
                    "total_users": User.objects.count(),
                    "admin_count": User.objects.filter(role='Admin').count(),
                    "manager_count": User.objects.filter(role='Manager').count(),
                    "support_agent_count": User.objects.filter(role='Support Agent').count(),
                    "sales_agent_count": User.objects.filter(role='Sales Agent').count(),
                    "customer_count": User.objects.filter(role='Customer').count(),
                },
                "system_status": {
                    "database": "Connected (SQLite)",
                    "server_time": timezone.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "debug_mode": True
                }
            }
        elif role == 'Manager':
            data = {
                "message": f"Welcome to the Manager Operations Panel, {email}",
                "role": "Manager",
                "stats": {
                    "total_active_agents": User.objects.filter(role__in=['Support Agent', 'Sales Agent']).count(),
                    "departments": ["Customer Support", "Enterprise Sales", "Inbound Marketing"],
                    "active_projects": 4
                },
                "recent_actions": [
                    {"time": "10 mins ago", "action": "Assigned new leads to Sales Agent"},
                    {"time": "1 hr ago", "action": "Resolved escalation ticket #4092"},
                    {"time": "Yesterday", "action": "Updated Shift timings for Support Agents"}
                ]
            }
        elif role == 'Support Agent':
            data = {
                "message": f"Welcome to the Agent Helpdesk, {email}",
                "role": "Support Agent",
                "stats": {
                    "assigned_tickets": 12,
                    "pending_tickets": 4,
                    "avg_resolution_time": "1.8 hours",
                    "customer_rating": "4.8/5"
                },
                "queue": [
                    {"id": "TKT-101", "subject": "Cannot login to client portal", "priority": "High"},
                    {"id": "TKT-103", "subject": "Billing issue with monthly plan", "priority": "Medium"},
                    {"id": "TKT-104", "subject": "Feature request: Dark mode toggle", "priority": "Low"}
                ]
            }
        elif role == 'Sales Agent':
            data = {
                "message": f"Welcome to the Sales Pipeline, {email}",
                "role": "Sales Agent",
                "stats": {
                    "monthly_sales_target": "$50,000",
                    "current_pipeline_value": "$32,500",
                    "deals_in_progress": 8,
                    "conversion_rate": "24%"
                },
                "leads": [
                    {"name": "Apex Corp", "value": "$12,000", "stage": "Proposal Sent"},
                    {"name": "Starlight Industries", "value": "$8,500", "stage": "Qualified Lead"},
                    {"name": "Nova Tech", "value": "$4,000", "stage": "Contacted"}
                ]
            }
        else: # Customer
            data = {
                "message": f"Welcome back to your Support Portal, {email}",
                "role": "Customer",
                "stats": {
                    "my_open_tickets": 1,
                    "resolved_tickets": 3,
                    "active_subscriptions": "ServiceFlow Pro (Enterprise)"
                },
                "my_tickets": [
                    {"id": "TKT-095", "subject": "Requesting invoice for July 2026", "status": "Resolved"},
                    {"id": "TKT-101", "subject": "Cannot login to client portal", "status": "In Progress"}
                ]
            }
            
        return Response(data, status=status.HTTP_200_OK)
