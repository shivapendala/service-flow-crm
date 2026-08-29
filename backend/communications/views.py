from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from .models import CommunicationLog
from .serializers import CommunicationLogSerializer
from .permissions import CanManageCommunication

class CommunicationLogPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class CommunicationLogViewSet(viewsets.ModelViewSet):
    serializer_class = CommunicationLogSerializer
    permission_classes = (CanManageCommunication,)
    pagination_class = CommunicationLogPagination

    def get_queryset(self):
        user = self.request.user
        queryset = CommunicationLog.objects.all()

        # 1. Customer Role filter limits
        if user.role == 'Customer':
            queryset = queryset.filter(customer__email__iexact=user.email)

        # 2. Extract queries
        search = self.request.query_params.get('search', None)
        contact_type = self.request.query_params.get('contact_type', None)
        customer_filter = self.request.query_params.get('customer', None)
        lead_filter = self.request.query_params.get('lead', None)
        deal_filter = self.request.query_params.get('deal', None)
        ticket_filter = self.request.query_params.get('ticket', None)
        logged_by_filter = self.request.query_params.get('logged_by', None)
        
        ordering = self.request.query_params.get('ordering', '-interaction_date')

        # Search term filter
        if search:
            queryset = queryset.filter(
                Q(subject__icontains=search) |
                Q(content__icontains=search) |
                Q(customer__first_name__icontains=search) |
                Q(customer__last_name__icontains=search) |
                Q(lead__first_name__icontains=search) |
                Q(lead__last_name__icontains=search)
            )

        # Filters
        if contact_type:
            queryset = queryset.filter(contact_type=contact_type)
        if customer_filter:
            queryset = queryset.filter(customer_id=customer_filter)
        if lead_filter:
            queryset = queryset.filter(lead_id=lead_filter)
        if deal_filter:
            queryset = queryset.filter(deal_id=deal_filter)
        if ticket_filter:
            queryset = queryset.filter(ticket_id=ticket_filter)
        if logged_by_filter:
            queryset = queryset.filter(logged_by_id=logged_by_filter)

        # Ordering
        valid_orderings = ['interaction_date', '-interaction_date', 'created_at', '-created_at']
        if ordering in valid_orderings:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('-interaction_date')

        return queryset

    def perform_create(self, serializer):
        serializer.save(logged_by=self.request.user)
