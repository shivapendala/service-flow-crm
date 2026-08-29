from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APITestCase
from customers.models import Customer
from communications.models import CommunicationLog

User = get_user_model()

class CommunicationLogModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='sales@test.com', password='Password123!', role='Sales Agent'
        )
        self.customer = Customer.objects.create(
            first_name='John', last_name='Doe', email='john@doe.com', phone='1234567890'
        )

    def test_log_creation_successful(self):
        """Test creating a communication log is successful"""
        log = CommunicationLog.objects.create(
            contact_type='Call',
            subject='Onboarding call',
            content='Explained routing software details.',
            customer=self.customer,
            logged_by=self.user
        )
        self.assertEqual(log.contact_type, 'Call')
        self.assertEqual(log.subject, 'Onboarding call')


class CommunicationLogAPITests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_user(
            email='admin@sf.com', password='Password123!', role='Admin', is_staff=True
        )
        self.sales_agent = User.objects.create_user(
            email='sales@sf.com', password='Password123!', role='Sales Agent'
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

        # Create logs
        self.log_1 = CommunicationLog.objects.create(
            contact_type='Call', subject='Gate scanner check-in', content='Discussion on scanner wiring details.',
            customer=self.customer_contact_1, logged_by=self.sales_agent, interaction_date=timezone.now()
        )
        self.log_2 = CommunicationLog.objects.create(
            contact_type='Email', subject='Cooling audit logs', content='Tony Stark requested cooling audit report schedules.',
            customer=self.customer_contact_2, logged_by=self.sales_agent, interaction_date=timezone.now() - timedelta(days=1)
        )

    def test_list_unauthenticated_fails(self):
        """Test unauthenticated request is blocked"""
        url = reverse('communicationlog-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_role_visibility_limits(self):
        """Test Customer role can only retrieve communication logs linked to their email"""
        self.client.force_authenticate(user=self.customer_user_1)
        url = reverse('communicationlog-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return ONLY log 1
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['subject'], 'Gate scanner check-in')

        # Accessing another customer's log details directly returns 404
        url_detail_2 = reverse('communicationlog-detail', kwargs={'pk': self.log_2.id})
        response_detail_2 = self.client.get(url_detail_2)
        self.assertEqual(response_detail_2.status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_cannot_post_log(self):
        """Test customer role is blocked from logging communications"""
        self.client.force_authenticate(user=self.customer_user_1)
        url = reverse('communicationlog-list')
        data = {
            'contact_type': 'Call',
            'subject': 'Malicious client call',
            'content': 'Attempt to log interaction',
            'customer': self.customer_contact_1.id
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_sales_agent_can_retrieve_all_logs(self):
        """Test staff sales agent can retrieve all logs"""
        self.client.force_authenticate(user=self.sales_agent)
        url = reverse('communicationlog-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_log_search_works(self):
        """Test searching logs by content text"""
        self.client.force_authenticate(user=self.sales_agent)
        url = f"{reverse('communicationlog-list')}?search=wiring"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['subject'], 'Gate scanner check-in')

    def test_log_filter_by_type_works(self):
        """Test filtering by contact type works"""
        self.client.force_authenticate(user=self.sales_agent)
        url = f"{reverse('communicationlog-list')}?contact_type=Email"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['subject'], 'Cooling audit logs')
