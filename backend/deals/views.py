from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Sum, Avg
from django.db.models.functions import Coalesce
from decimal import Decimal
from .models import Deal
from .serializers import DealSerializer
from .permissions import CanManageDeal

class DealViewSet(viewsets.ModelViewSet):
    serializer_class = DealSerializer
    permission_classes = (CanManageDeal,)
    pagination_class = None # Disable pagination to load all pipeline cards into Kanban columns

    def get_queryset(self):
        queryset = Deal.objects.all()
        
        # Get query parameters
        search = self.request.query_params.get('search', None)
        stage_filter = self.request.query_params.get('stage', None)
        assigned_to_filter = self.request.query_params.get('assigned_to', None)
        ordering = self.request.query_params.get('ordering', 'created_at')

        # Search term filter (title, customer name, company name)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(customer__first_name__icontains=search) |
                Q(customer__last_name__icontains=search) |
                Q(customer__company_name__icontains=search)
            )

        # Filters
        if stage_filter:
            queryset = queryset.filter(stage=stage_filter)
        if assigned_to_filter:
            queryset = queryset.filter(assigned_to_id=assigned_to_filter)

        # Ordering
        valid_orderings = ['created_at', '-created_at', 'deal_value', '-deal_value', 'expected_close_date', '-expected_close_date']
        if ordering in valid_orderings:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('created_at')

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='stats')
    def get_pipeline_stats(self, request):
        """
        Calculates real-time aggregation metrics for the Sales Pipeline dashboard:
        - Total open pipeline value (excluding Won / Lost).
        - Average deal size.
        - Conversion Win Rate.
        - Total count & value per stage.
        """
        all_deals = Deal.objects.all()
        
        # Open stages are everything except 'Won' and 'Lost'
        open_deals = all_deals.exclude(stage__in=['Won', 'Lost'])
        
        # Total pipeline value
        pipeline_value = open_deals.aggregate(total=Coalesce(Sum('deal_value'), Decimal('0.00')))['total']
        
        # Average deal size
        avg_deal_size = all_deals.aggregate(average=Coalesce(Avg('deal_value'), Decimal('0.00')))['average']
        
        # Win Rate calculations (Won / (Won + Lost))
        won_count = all_deals.filter(stage='Won').count()
        lost_count = all_deals.filter(stage='Lost').count()
        total_closed = won_count + lost_count
        win_rate = (won_count / total_closed * 100) if total_closed > 0 else 0
        
        # Stage metrics breakdown
        stage_breakdown = {}
        for stage_code, stage_label in Deal.STAGE_CHOICES:
            stage_deals = all_deals.filter(stage=stage_code)
            stage_sum = stage_deals.aggregate(total=Coalesce(Sum('deal_value'), Decimal('0.00')))['total']
            stage_breakdown[stage_code] = {
                "count": stage_deals.count(),
                "value": float(stage_sum)
            }

        data = {
            "total_pipeline_value": float(pipeline_value),
            "average_deal_size": float(avg_deal_size),
            "win_rate": round(win_rate, 1),
            "active_deals_count": open_deals.count(),
            "stage_breakdown": stage_breakdown
        }
        
        return Response(data, status=status.HTTP_200_OK)
