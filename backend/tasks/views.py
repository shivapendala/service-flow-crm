from rest_framework import viewsets
from django.db.models import Q
from .models import Task
from .serializers import TaskSerializer
from .permissions import CanManageTask

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = (CanManageTask,)
    pagination_class = None # Disable pagination to load all scheduled tasks on calendar

    def get_queryset(self):
        queryset = Task.objects.all()
        
        # Get query parameters
        search = self.request.query_params.get('search', None)
        status_filter = self.request.query_params.get('status', None)
        priority_filter = self.request.query_params.get('priority', None)
        assigned_to_filter = self.request.query_params.get('assigned_to', None)
        
        # Entity-based filters
        customer_filter = self.request.query_params.get('customer', None)
        lead_filter = self.request.query_params.get('lead', None)
        deal_filter = self.request.query_params.get('deal', None)
        ticket_filter = self.request.query_params.get('ticket', None)
        
        ordering = self.request.query_params.get('ordering', 'due_date')

        # Search term filter
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )

        # Filters
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        if assigned_to_filter:
            queryset = queryset.filter(assigned_to_id=assigned_to_filter)
            
        # Optional links filters
        if customer_filter:
            queryset = queryset.filter(customer_id=customer_filter)
        if lead_filter:
            queryset = queryset.filter(lead_id=lead_filter)
        if deal_filter:
            queryset = queryset.filter(deal_id=deal_filter)
        if ticket_filter:
            queryset = queryset.filter(ticket_id=ticket_filter)

        # Ordering
        valid_orderings = ['due_date', '-due_date', 'priority', '-priority', 'created_at', '-created_at']
        if ordering in valid_orderings:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('due_date')

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
