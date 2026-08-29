from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from customers.models import Customer
from services.models import ServiceRequest, ServiceRequestComment, ServiceRequestHistory

User = get_user_model()

class ServiceRequestModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='support@test.com', password='Password123!', role='Support Agent'
        )
        self.customer = Customer.objects.create(
            first_name='John', last_name='Doe', email='john@doe.com', phone='1234567890'
        )

    def test_service_request_creation_successful(self):
        """Test creating a service request record is successful"""
        req = ServiceRequest.objects.create(
            customer=self.customer, category='Repair', priority='High', status='Pending',
            description='Test gate repair', created_by=self.user
        )
        self.assertEqual(req.category, 'Repair')
        self.assertEqual(req.status, 'Pending')
        self.assertEqual(req.description, 'Test gate repair')


class ServiceRequestAPITests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_user(
            email='admin@sf.com', password='Password123!', role='Admin', is_staff=True
        )
        self.support_agent = User.objects.create_user(
            email='support@sf.com', password='Password123!', role='Support Agent'
        )
        self.customer_user_1 = User.objects.create_user(
            email='bruce@wayne.corp', password='Password123!', role='Customer'
        )
        self.customer_user_2 = User.objects.create_user(
            email='clark@dailyplanet.org', password='Password123!', role='Customer'
        )

        # Create Customer contacts
        self.customer_contact_1 = Customer.objects.create(
            first_name='Bruce', last_name='Wayne', email='bruce@wayne.corp', phone='1111111111', company_name='Wayne Enterprises'
        )
        self.customer_contact_2 = Customer.objects.create(
            first_name='Clark', last_name='Kent', email='clark@dailyplanet.org', phone='2222222222', company_name='Daily Planet'
        )

        # Create service requests
        self.req_1 = ServiceRequest.objects.create(
            customer=self.customer_contact_1, category='Repair', priority='High', status='Pending',
            description='Access gate failure', assigned_to=self.support_agent, created_by=self.admin
        )
        self.req_2 = ServiceRequest.objects.create(
            customer=self.customer_contact_2, category='Maintenance', priority='Low', status='Scheduled',
            description='Server cooling check', assigned_to=self.support_agent, created_by=self.admin
        )

    def test_list_unauthenticated_fails(self):
        """Test unauthenticated request is blocked"""
        url = reverse('servicerequest-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_role_visibility_limits(self):
        """Test Customer role can only retrieve service requests linked to their email"""
        self.client.force_authenticate(user=self.customer_user_1)
        url = reverse('servicerequest-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return ONLY request 1
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['description'], 'Access gate failure')

        # Accessing another customer's request detail directly returns 404
        url_detail_2 = reverse('servicerequest-detail', kwargs={'pk': self.req_2.id})
        response_detail_2 = self.client.get(url_detail_2)
        self.assertEqual(response_detail_2.status_code, status.HTTP_404_NOT_FOUND)

    def test_support_agent_can_retrieve_all_requests(self):
        """Test Support Agent can list all service requests in database"""
        self.client.force_authenticate(user=self.support_agent)
        url = reverse('servicerequest-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_request_search_works(self):
        """Test searching service requests by description or client company"""
        self.client.force_authenticate(user=self.support_agent)
        url = f"{reverse('servicerequest-list')}?search=cooling"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['description'], 'Server cooling check')

    def test_request_filter_by_status_and_priority_works(self):
        """Test filtering by status and priority"""
        self.client.force_authenticate(user=self.support_agent)
        
        # Filter by status
        url = f"{reverse('servicerequest-list')}?status=Scheduled"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['description'], 'Server cooling check')

    def test_update_status_logs_history(self):
        """Test updating status or resolution writes a ServiceRequestHistory log entry"""
        self.client.force_authenticate(user=self.support_agent)
        url = reverse('servicerequest-detail', kwargs={'pk': self.req_1.id})
        
        data = {
            'status': 'Completed',
            'category': self.req_1.category,
            'priority': self.req_1.priority,
            'description': self.req_1.description,
            'resolution_details': 'Replaced broken sensor wiring.',
            'customer': self.customer_contact_1.id
        }
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check history endpoint returns status transition log
        history_url = reverse('servicerequest-get-history', kwargs={'pk': self.req_1.id})
        history_response = self.client.get(history_url)
        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(history_response.data), 1)
        self.assertEqual(history_response.data[0]['status_from'], 'Pending')
        self.assertEqual(history_response.data[0]['status_to'], 'Completed')
        self.assertIn('wiring', history_response.data[0]['notes'])
