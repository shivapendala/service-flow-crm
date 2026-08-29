from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from leads.models import Lead
from customers.models import Customer, CustomerHistory

User = get_user_model()

class LeadModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='agent@test.com', password='Password123!', role='Sales Agent'
        )

    def test_lead_creation_successful(self):
        """Test creating a lead record is successful"""
        lead = Lead.objects.create(
            first_name='Luke', last_name='Skywalker', email='luke@jedi.org',
            phone='+1 555-9001', company_name='Jedi Order',
            source='Referral', status='New', priority='High',
            created_by=self.user
        )
        self.assertEqual(lead.first_name, 'Luke')
        self.assertEqual(lead.email, 'luke@jedi.org')
        self.assertEqual(lead.status, 'New')


class LeadAPITests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_user(
            email='admin@sf.com', password='Password123!', role='Admin', is_staff=True
        )
        self.manager = User.objects.create_user(
            email='manager@sf.com', password='Password123!', role='Manager', is_staff=True
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

        # Create leads
        self.lead_1 = Lead.objects.create(
            first_name='Luke', last_name='Skywalker', email='luke@jedi.org',
            phone='+1 555-9001', company_name='Jedi Order',
            source='Referral', status='New', priority='High',
            assigned_to=self.sales_agent_1, created_by=self.admin
        )

        self.lead_2 = Lead.objects.create(
            first_name='Ellen', last_name='Ripley', email='ripley@weyland.corp',
            phone='+1 555-2179', company_name='Weyland-Yutani',
            source='Partner', status='Contacted', priority='High',
            assigned_to=self.sales_agent_2, created_by=self.admin
        )

    def test_lead_list_unauthenticated_fails(self):
        """Test unauthenticated request fails"""
        url = reverse('lead-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_role_blocked_from_leads(self):
        """Test Customer role is blocked from leads APIs"""
        self.client.force_authenticate(user=self.customer_user)
        url = reverse('lead-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_list_all_leads(self):
        """Test that Admin can list leads"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('lead-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 2)

    def test_lead_search_works(self):
        """Test searching lead by name/company"""
        self.client.force_authenticate(user=self.admin)
        url = f"{reverse('lead-list')}?search=Ripley"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['email'], 'ripley@weyland.corp')

    def test_lead_filter_by_status_and_source_works(self):
        """Test filtering by status and source"""
        self.client.force_authenticate(user=self.admin)
        
        # Filter by status
        url = f"{reverse('lead-list')}?status=Contacted"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['email'], 'ripley@weyland.corp')

        # Filter by source
        url = f"{reverse('lead-list')}?source=Referral"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['email'], 'luke@jedi.org')

    def test_sales_agent_can_modify_assigned(self):
        """Test Sales Agent RBAC controls on leads"""
        self.client.force_authenticate(user=self.sales_agent_1)
        url = reverse('lead-detail', kwargs={'pk': self.lead_1.id})
        data = {'first_name': 'Luke-Edited', 'last_name': 'Skywalker', 'email': 'luke@jedi.org'}
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Try editing lead 2 (assigned to Agent 2) -> Should fail
        url_2 = reverse('lead-detail', kwargs={'pk': self.lead_2.id})
        data_2 = {'first_name': 'Ellen-Hack', 'last_name': 'Ripley', 'email': 'ripley@weyland.corp'}
        response_2 = self.client.put(url_2, data_2)
        self.assertEqual(response_2.status_code, status.HTTP_403_FORBIDDEN)

    def test_support_agent_cannot_edit_lead(self):
        """Test Support Agent gets 403 on edits"""
        self.client.force_authenticate(user=self.support_agent)
        url = reverse('lead-detail', kwargs={'pk': self.lead_1.id})
        
        # Read is allowed
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Edit fails
        response = self.client.put(url, {'first_name': 'Luke', 'last_name': 'Skywalker', 'email': 'luke@jedi.org'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lead_conversion_workflow(self):
        """Test lead conversion converts to Customer and logs history logs"""
        self.client.force_authenticate(user=self.sales_agent_1)
        url = reverse('lead-convert-to-customer', kwargs={'pk': self.lead_1.id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('customer_id', response.data)
        
        customer_id = response.data['customer_id']
        
        # Verify Customer record exists in database
        self.assertTrue(Customer.objects.filter(id=customer_id).exists())
        customer = Customer.objects.get(id=customer_id)
        self.assertEqual(customer.email, 'luke@jedi.org')
        self.assertEqual(customer.first_name, 'Luke')
        self.assertEqual(customer.assigned_to, self.sales_agent_1)
        
        # Verify Lead state is updated
        self.lead_1.refresh_from_db()
        self.assertTrue(self.lead_1.is_converted)
        self.assertEqual(self.lead_1.status, 'Converted')
        self.assertEqual(self.lead_1.converted_customer, customer)

        # Verify Customer history timeline note is created
        self.assertTrue(CustomerHistory.objects.filter(customer=customer).exists())
        history_entry = CustomerHistory.objects.filter(customer=customer).first()
        self.assertEqual(history_entry.action, "Customer profile created via lead conversion of luke@jedi.org")

        # Verify converting already converted lead returns 400 Bad Request
        response_dup = self.client.post(url)
        self.assertEqual(response_dup.status_code, status.HTTP_400_BAD_REQUEST)
