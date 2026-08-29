from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from customers.models import Customer
from deals.models import Deal

User = get_user_model()

class DealModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='agent@test.com', password='Password123!', role='Sales Agent'
        )
        self.customer = Customer.objects.create(
            first_name='John', last_name='Doe', email='john@doe.com', phone='1234567890'
        )

    def test_deal_creation_successful(self):
        """Test creating a deal record is successful"""
        deal = Deal.objects.create(
            title='Test Deal Package',
            deal_value=5000.00,
            stage='New',
            customer=self.customer,
            created_by=self.user
        )
        self.assertEqual(deal.title, 'Test Deal Package')
        self.assertEqual(deal.deal_value, 5000.00)
        self.assertEqual(deal.stage, 'New')


class DealAPITests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_user(
            email='admin@sf.com', password='Password123!', role='Admin', is_staff=True
        )
        self.sales_agent_1 = User.objects.create_user(
            email='sales1@sf.com', password='Password123!', role='Sales Agent'
        )
        self.sales_agent_2 = User.objects.create_user(
            email='sales2@sf.com', password='Password123!', role='Sales Agent'
        )
        self.support_agent = User.objects.create_user(
            email='support@sf.com', password='Password123!', role='Support Agent'
        )
        self.customer_user = User.objects.create_user(
            email='client@sf.com', password='Password123!', role='Customer'
        )

        # Create customer
        self.customer = Customer.objects.create(
            first_name='Bruce', last_name='Wayne', email='bruce@wayne.com',
            phone='+1 555-1111', company_name='Wayne Enterprises'
        )

        # Create deals
        self.deal_1 = Deal.objects.create(
            title='Cloud Upgrade', deal_value=10000.00, stage='Proposal',
            customer=self.customer, assigned_to=self.sales_agent_1, created_by=self.admin
        )
        self.deal_2 = Deal.objects.create(
            title='Security Audit', deal_value=5000.00, stage='Negotiation',
            customer=self.customer, assigned_to=self.sales_agent_2, created_by=self.admin
        )
        self.deal_won = Deal.objects.create(
            title='License Purchase', deal_value=20000.00, stage='Won',
            customer=self.customer, assigned_to=self.sales_agent_1, created_by=self.admin
        )
        self.deal_lost = Deal.objects.create(
            title='Hardware Order', deal_value=10000.00, stage='Lost',
            customer=self.customer, assigned_to=self.sales_agent_1, created_by=self.admin
        )

    def test_deal_list_unauthenticated_fails(self):
        """Test unauthenticated request is blocked"""
        url = reverse('deal-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_role_blocked_from_deals(self):
        """Test Customer role gets 403 Forbidden"""
        self.client.force_authenticate(user=self.customer_user)
        url = reverse('deal-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_list_all_deals(self):
        """Test that Admin can retrieve all deals"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('deal-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # All 4 deals returned since deals list does not paginate
        self.assertEqual(len(response.data), 4)

    def test_deal_search_works(self):
        """Test searching deals by title or company"""
        self.client.force_authenticate(user=self.admin)
        url = f"{reverse('deal-list')}?search=Security"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['title'], 'Security Audit')

    def test_deal_filter_by_stage_works(self):
        """Test filtering deals by stage"""
        self.client.force_authenticate(user=self.admin)
        url = f"{reverse('deal-list')}?stage=Won"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['title'], 'License Purchase')

    def test_create_deal_negative_value_fails(self):
        """Test validating deal value cannot be negative"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('deal-list')
        data = {
            'title': 'Bad Deal',
            'deal_value': -100.00,
            'customer': self.customer.id
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('deal_value', response.data)

    def test_sales_agent_modify_permissions(self):
        """Test Sales Agent RBAC updates constraints on deals"""
        self.client.force_authenticate(user=self.sales_agent_1)
        url = reverse('deal-detail', kwargs={'pk': self.deal_1.id})
        
        # Sales Agent 1 edits deal 1 (assigned to them) -> Success
        data = {'title': 'Cloud Upgrade-Edit', 'deal_value': 12000.00, 'customer': self.customer.id, 'stage': 'Proposal'}
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Sales Agent 1 edits deal 2 (assigned to Agent 2) -> Fails 403
        url_2 = reverse('deal-detail', kwargs={'pk': self.deal_2.id})
        data_2 = {'title': 'Security Audit-Hack', 'deal_value': 5000.00, 'customer': self.customer.id, 'stage': 'Negotiation'}
        response_2 = self.client.put(url_2, data_2)
        self.assertEqual(response_2.status_code, status.HTTP_403_FORBIDDEN)

    def test_pipeline_statistics_calculations(self):
        """Test pipeline aggregates (Sum, Win Rate, Count per stage)"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('deal-get-pipeline-stats')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Total active pipeline value = deal_1 (10000) + deal_2 (5000) = 15000
        self.assertEqual(response.data['total_pipeline_value'], 15000.00)
        
        # Active deals count = 2
        self.assertEqual(response.data['active_deals_count'], 2)
        
        # Average deal size = (10k + 5k + 20k + 10k) / 4 = 11250.00
        self.assertEqual(response.data['average_deal_size'], 11250.0)
        
        # Win rate = Won (1) / (Won (1) + Lost (1)) = 50.0%
        self.assertEqual(response.data['win_rate'], 50.0)

        # Stage breakdown Won check
        self.assertEqual(response.data['stage_breakdown']['Won']['count'], 1)
        self.assertEqual(response.data['stage_breakdown']['Won']['value'], 20000.00)
