from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from django.db import transaction
from .models import Lead
from .serializers import LeadSerializer
from .permissions import CanManageLead

class LeadPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class LeadViewSet(viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    pagination_class = LeadPagination
    permission_classes = (CanManageLead,)

    def get_queryset(self):
        queryset = Lead.objects.all()
        
        # Get query parameters
        search = self.request.query_params.get('search', None)
        status_filter = self.request.query_params.get('status', None)
        source_filter = self.request.query_params.get('source', None)
        priority_filter = self.request.query_params.get('priority', None)
        assigned_to_filter = self.request.query_params.get('assigned_to', None)
        ordering = self.request.query_params.get('ordering', '-created_at')

        # Search term filter
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(company_name__icontains=search)
            )

        # Filters
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if source_filter:
            queryset = queryset.filter(source=source_filter)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        if assigned_to_filter:
            queryset = queryset.filter(assigned_to_id=assigned_to_filter)

        # Ordering
        valid_orderings = ['created_at', '-created_at', 'follow_up_date', '-follow_up_date', 'priority', '-priority']
        if ordering in valid_orderings:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('-created_at')

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='convert')
    def convert_to_customer(self, request, pk=None):
        """
        Custom action to convert a lead into a customer record.
        - Creates a Customer copy.
        - Updates Lead state.
        - Logs initial timeline activities.
        """
        lead = self.get_object()

        if lead.is_converted:
            return Response(
                {"detail": "This lead has already been converted into a customer."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Import customer models locally to avoid circular dependencies
        from customers.models import Customer, CustomerHistory

        # Atomic transaction to ensure both lead update and customer creation succeed together
        with transaction.atomic():
            # 1. Create the Customer record
            customer = Customer.objects.create(
                first_name=lead.first_name,
                last_name=lead.last_name,
                email=lead.email,
                phone=lead.phone,
                company_name=lead.company_name,
                status='Active', # Defaults to Active Customer status
                address=lead.notes[:200] if lead.notes else '', # Prefill address space or note summary
                assigned_to=lead.assigned_to,
                created_by=request.user
            )

            # 2. Update Lead attributes
            lead.is_converted = True
            lead.status = 'Converted'
            lead.converted_customer = customer
            lead.save()

            # 3. Log History action
            CustomerHistory.objects.create(
                customer=customer,
                action_by=request.user,
                action=f"Customer profile created via lead conversion of {lead.email}"
            )

        return Response(
            {
                "detail": "Lead converted successfully",
                "customer_id": customer.id
            },
            status=status.HTTP_201_CREATED
        )
