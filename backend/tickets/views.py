from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from django.core.exceptions import PermissionDenied
from customers.models import Customer
from .models import Ticket, TicketComment, TicketHistory
from .serializers import TicketSerializer, TicketCommentSerializer, TicketHistorySerializer
from .permissions import CanManageTicket

class TicketPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    pagination_class = TicketPagination
    permission_classes = (CanManageTicket,)

    def get_queryset(self):
        user = self.request.user
        queryset = Ticket.objects.all()

        # 1. Customer Role constraint (view only their own tickets)
        if user.role == 'Customer':
            queryset = queryset.filter(customer__email__iexact=user.email)

        # 2. Extract filter params
        search = self.request.query_params.get('search', None)
        status_filter = self.request.query_params.get('status', None)
        priority_filter = self.request.query_params.get('priority', None)
        category_filter = self.request.query_params.get('category', None)
        assigned_to_filter = self.request.query_params.get('assigned_to', None)
        customer_filter = self.request.query_params.get('customer', None)
        ordering = self.request.query_params.get('ordering', '-created_at')

        # Search term filter (ticket number, subject, description, customer contact details)
        if search:
            queryset = queryset.filter(
                Q(ticket_number__icontains=search) |
                Q(subject__icontains=search) |
                Q(description__icontains=search) |
                Q(customer__first_name__icontains=search) |
                Q(customer__last_name__icontains=search) |
                Q(customer__company_name__icontains=search)
            )

        # Filters
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        if assigned_to_filter:
            queryset = queryset.filter(assigned_to_id=assigned_to_filter)
        if customer_filter:
            queryset = queryset.filter(customer_id=customer_filter)

        # Ordering
        valid_orderings = ['created_at', '-created_at', 'priority', '-priority', 'status', '-status']
        if ordering in valid_orderings:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('-created_at')

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        
        if user.role == 'Customer':
            # Check if Customer contact profile exists for this email
            try:
                customer_contact = Customer.objects.get(email__iexact=user.email)
            except Customer.DoesNotExist:
                raise PermissionDenied("Your Customer contact profile could not be found. Please contact support.")
            
            serializer.save(customer=customer_contact, created_by=user)
        else:
            serializer.save(created_by=user)

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        new_status = serializer.validated_data.get('status', old_status)
        
        ticket = serializer.save()

        # Automatically log status transition history
        if old_status != new_status:
            TicketHistory.objects.create(
                ticket=ticket,
                changed_by=self.request.user,
                status_from=old_status,
                status_to=new_status,
                notes=f"Ticket status transitioned from {old_status} to {new_status}."
            )

    # Comments Action Endpoint: GET /api/tickets/<id>/comments/ and POST
    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def manage_comments(self, request, pk=None):
        ticket = self.get_object() # Triggers CanManageTicket check

        if request.method == 'GET':
            comments = ticket.comments.all().order_by('created_at')
            
            # Hide internal comments from Customer roles
            if request.user.role == 'Customer':
                comments = comments.filter(is_internal=False)
                
            serializer = TicketCommentSerializer(comments, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            serializer = TicketCommentSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                comment = serializer.save(ticket=ticket, author=request.user)
                return Response(TicketCommentSerializer(comment).data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # History Action Endpoint: GET /api/tickets/<id>/history/
    @action(detail=True, methods=['get'], url_path='history')
    def get_history(self, request, pk=None):
        ticket = self.get_object() # Triggers CanManageTicket check
        history = ticket.history.all().order_by('-changed_at')
        serializer = TicketHistorySerializer(history, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
