from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from django.core.exceptions import PermissionDenied
from customers.models import Customer
from .models import ServiceRequest, ServiceRequestComment, ServiceRequestHistory
from .serializers import ServiceRequestSerializer, ServiceRequestCommentSerializer, ServiceRequestHistorySerializer
from .permissions import CanManageServiceRequest

class ServiceRequestPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class ServiceRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceRequestSerializer
    pagination_class = ServiceRequestPagination
    permission_classes = (CanManageServiceRequest,)

    def get_queryset(self):
        user = self.request.user
        queryset = ServiceRequest.objects.all()

        # 1. Customer Role filter limits
        if user.role == 'Customer':
            queryset = queryset.filter(customer__email__iexact=user.email)

        # 2. Extract queries
        search = self.request.query_params.get('search', None)
        status_filter = self.request.query_params.get('status', None)
        priority_filter = self.request.query_params.get('priority', None)
        category_filter = self.request.query_params.get('category', None)
        assigned_to_filter = self.request.query_params.get('assigned_to', None)
        customer_filter = self.request.query_params.get('customer', None)
        ordering = self.request.query_params.get('ordering', '-created_at')

        # Search term filter
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search) |
                Q(resolution_details__icontains=search) |
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
        valid_orderings = ['created_at', '-created_at', 'due_date', '-due_date', 'priority', '-priority', 'status', '-status']
        if ordering in valid_orderings:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('-created_at')

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'Customer':
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
        old_res = instance.resolution_details
        new_res = serializer.validated_data.get('resolution_details', old_res)
        
        req = serializer.save()

        # Build custom change notes
        notes_list = []
        if old_status != new_status:
            notes_list.append(f"Status transitioned from {old_status} to {new_status}.")
        if old_res != new_res:
            notes_list.append(f"Resolution details updated: {new_res}")

        if notes_list:
            ServiceRequestHistory.objects.create(
                request=req,
                changed_by=self.request.user,
                status_from=old_status,
                status_to=new_status,
                notes=" ".join(notes_list)
            )

    # Comments Action Endpoint: GET /api/service-requests/<id>/comments/ and POST
    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def manage_comments(self, request, pk=None):
        req_obj = self.get_object()
        
        if request.method == 'GET':
            comments = req_obj.comments.all().order_by('created_at')
            serializer = ServiceRequestCommentSerializer(comments, many=True)
            return Response(serializer.data)
            
        elif request.method == 'POST':
            serializer = ServiceRequestCommentSerializer(data=request.data)
            if serializer.is_valid():
                comment = serializer.save(request=req_obj, author=request.user)
                return Response(ServiceRequestCommentSerializer(comment).data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # History Action Endpoint: GET /api/service-requests/<id>/history/
    @action(detail=True, methods=['get'], url_path='history')
    def get_history(self, request, pk=None):
        req_obj = self.get_object()
        history = req_obj.history.all().order_by('-changed_at')
        serializer = ServiceRequestHistorySerializer(history, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
