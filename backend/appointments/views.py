from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from django.core.exceptions import PermissionDenied
from customers.models import Customer
from .models import Appointment, AppointmentHistory
from .serializers import AppointmentSerializer, AppointmentHistorySerializer
from .permissions import CanManageAppointment

class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = (CanManageAppointment,)
    pagination_class = None # Load all appointments for calendar views

    def get_queryset(self):
        user = self.request.user
        queryset = Appointment.objects.all()

        # 1. Customer Role filter limits
        if user.role == 'Customer':
            queryset = queryset.filter(customer__email__iexact=user.email)

        # 2. Extract queries
        search = self.request.query_params.get('search', None)
        status_filter = self.request.query_params.get('status', None)
        assigned_to_filter = self.request.query_params.get('assigned_to', None)
        customer_filter = self.request.query_params.get('customer', None)
        date_filter = self.request.query_params.get('date', None)
        ordering = self.request.query_params.get('ordering', 'date')

        # Search term filter
        if search:
            queryset = queryset.filter(
                Q(purpose__icontains=search) |
                Q(location__icontains=search) |
                Q(notes__icontains=search) |
                Q(customer__first_name__icontains=search) |
                Q(customer__last_name__icontains=search) |
                Q(customer__company_name__icontains=search)
            )

        # Filters
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if assigned_to_filter:
            queryset = queryset.filter(assigned_to_id=assigned_to_filter)
        if customer_filter:
            queryset = queryset.filter(customer_id=customer_filter)
        if date_filter:
            queryset = queryset.filter(date=date_filter)

        # Ordering
        valid_orderings = ['date', '-date', 'time', '-time', 'created_at', '-created_at']
        if ordering in valid_orderings:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('date', 'time')

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
        old_date = instance.date
        new_date = serializer.validated_data.get('date', old_date)
        old_time = instance.time
        new_time = serializer.validated_data.get('time', old_time)
        old_loc = instance.location
        new_loc = serializer.validated_data.get('location', old_loc)
        
        appt = serializer.save()

        # Build custom change notes
        notes_list = []
        if old_status != new_status:
            notes_list.append(f"Status transitioned from {old_status} to {new_status}.")
        if old_date != new_date or old_time != new_time:
            notes_list.append(f"Rescheduled from {old_date} {old_time} to {new_date} {new_time}.")
        if old_loc != new_loc:
            notes_list.append(f"Location modified: {new_loc}")

        if notes_list:
            AppointmentHistory.objects.create(
                appointment=appt,
                changed_by=self.request.user,
                status_from=old_status,
                status_to=new_status,
                notes=" ".join(notes_list)
            )

    # History Action Endpoint: GET /api/appointments/<id>/history/
    @action(detail=True, methods=['get'], url_path='history')
    def get_history(self, request, pk=None):
        appt_obj = self.get_object()
        history = appt_obj.history.all().order_by('-changed_at')
        serializer = AppointmentHistorySerializer(history, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # Upcoming Action Endpoint: GET /api/appointments/upcoming/
    @action(detail=False, methods=['get'], url_path='upcoming')
    def get_upcoming(self, request):
        user = request.user
        today = timezone.now().date()
        
        queryset = Appointment.objects.filter(date__gte=today, status='Scheduled')
        if user.role == 'Customer':
            queryset = queryset.filter(customer__email__iexact=user.email)

        queryset = queryset.order_by('date', 'time')
        serializer = AppointmentSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
