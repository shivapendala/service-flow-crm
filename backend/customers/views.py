from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from .models import Customer, CustomerHistory
from .serializers import CustomerSerializer, CustomerHistorySerializer
from .permissions import CanManageCustomer

class CustomerPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    pagination_class = CustomerPagination
    permission_classes = (CanManageCustomer,)

    def get_queryset(self):
        queryset = Customer.objects.all()
        
        # Get query parameters
        search = self.request.query_params.get('search', None)
        status_filter = self.request.query_params.get('status', None)
        assigned_to_filter = self.request.query_params.get('assigned_to', None)
        ordering = self.request.query_params.get('ordering', '-created_at')

        # Filter by search term (first_name, last_name, email, company_name)
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(company_name__icontains=search)
            )

        # Filter by status
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by assigned agent
        if assigned_to_filter:
            queryset = queryset.filter(assigned_to_id=assigned_to_filter)

        # Apply ordering
        valid_orderings = ['created_at', '-created_at', 'last_name', '-last_name', 'company_name', '-company_name']
        if ordering in valid_orderings:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('-created_at')

        return queryset

    def perform_create(self, serializer):
        customer = serializer.save(created_by=self.request.user)
        
        # Log initial creation history
        CustomerHistory.objects.create(
            customer=customer,
            action_by=self.request.user,
            action="Customer profile created"
        )

    def perform_update(self, serializer):
        # Fetch unchanged data for comparison
        old_instance = self.get_object()
        old_status = old_instance.status
        old_assigned = old_instance.assigned_to
        
        # Save updates
        customer = serializer.save()
        
        # Identify changes to log in history
        new_status = customer.status
        new_assigned = customer.assigned_to
        
        history_logs = []
        
        if old_status != new_status:
            history_logs.append(f"Status updated from '{old_status}' to '{new_status}'")
            
        if old_assigned != new_assigned:
            old_name = f"{old_assigned.first_name} {old_assigned.last_name}" if old_assigned else "Unassigned"
            new_name = f"{new_assigned.first_name} {new_assigned.last_name}" if new_assigned else "Unassigned"
            history_logs.append(f"Assigned agent updated from '{old_name}' to '{new_name}'")
            
        if not history_logs:
            history_logs.append("Contact details updated")
            
        # Write history entries
        for log_action in history_logs:
            CustomerHistory.objects.create(
                customer=customer,
                action_by=self.request.user,
                action=log_action
            )

    @action(detail=True, methods=['get'], url_path='history')
    def get_history(self, request, pk=None):
        """
        Custom detail action to return a customer's history logs.
        """
        customer = self.get_object()
        history = customer.history.all().order_by('-timestamp')
        serializer = CustomerHistorySerializer(history, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='add-note')
    def add_note(self, request, pk=None):
        """
        Custom detail action to append an activity note to the history timeline.
        """
        customer = self.get_object()
        note_text = request.data.get('note', '').strip()
        
        if not note_text:
            return Response(
                {"note": "Note content cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        history_entry = CustomerHistory.objects.create(
            customer=customer,
            action_by=request.user,
            action="Activity note added",
            note=note_text
        )
        
        serializer = CustomerHistorySerializer(history_entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
