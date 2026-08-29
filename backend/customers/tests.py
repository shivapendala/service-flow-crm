from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from customers.models import Customer, CustomerHistory

User = get_user_model()

class CustomerModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='agent@test.com',
            password='Password123!',
            role='Sales Agent'
        )

    def test_customer_creation_signals_history(self):
        """Test that creating a customer is successful"""
        customer = Customer.objects.create(
            first_name='Clark',
            last_name='Kent',
            email='ckent@dailyplanet.com',
            phone='+1 555-9876',
            company_name='Daily Planet',
            company_website='https://www.dailyplanet.com',
            status='Lead',
            created_by=self.user
        )
        self.assertEqual(customer.first_name, 'Clark')
        self.assertEqual(customer.email, 'ckent@dailyplanet.com')
        self.assertEqual(str(customer), 'Clark Kent (Daily Planet)')


class CustomerAPITests(APITestCase):
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

        # Create customers
        self.cust_1 = Customer.objects.create(
            first_name='Bruce', last_name='Wayne', email='bruce@wayne.com',
            phone='+1 555-1111', company_name='Wayne Enterprises', status='Active',
            assigned_to=self.sales_agent_1, created_by=self.admin
        )
        CustomerHistory.objects.create(customer=self.cust_1, action_by=self.admin, action='Customer created')

        self.cust_2 = Customer.objects.create(
            first_name='Tony', last_name='Stark', email='tony@stark.com',
            phone='+1 555-2222', company_name='Stark Industries', status='Active',
            assigned_to=self.sales_agent_2, created_by=self.admin
        )
        CustomerHistory.objects.create(customer=self.cust_2, action_by=self.admin, action='Customer created')

    def test_customer_list_unauthenticated_fails(self):
        """Test that unauthenticated requests are blocked"""
        url = reverse('customer-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_role_blocked_entirely(self):
        """Test that a user with 'Customer' role gets 403 Forbidden"""
        self.client.force_authenticate(user=self.customer_user)
        url = reverse('customer-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_all_customers(self):
        """Test that Admin can see all customers"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('customer-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Seeded customers count + database seeded customer counts (since they persist in test runs sometimes, but at least our setUp ones)
        self.assertGreaterEqual(response.data['count'], 2)

    def test_customer_search_works(self):
        """Test that searching by name or company works correctly"""
        self.client.force_authenticate(user=self.admin)
        url = f"{reverse('customer-list')}?search=Wayne"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['email'], 'bruce@wayne.com')

    def test_customer_filter_by_status_works(self):
        """Test filtering customer list by status"""
        # Set one to inactive
        self.cust_2.status = 'Inactive'
        self.cust_2.save()
        
        self.client.force_authenticate(user=self.admin)
        url = f"{reverse('customer-list')}?status=Inactive"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['email'], 'tony@stark.com')

    def test_customer_create_validations(self):
        """Test inputs validation on creation (duplicate email, bad phone)"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('customer-list')
        
        # Duplicate email
        data = {
            'first_name': 'Another', 'last_name': 'Wayne',
            'email': 'bruce@wayne.com', 'phone': '1234567890'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

        # Bad phone (less than 7 digits)
        data = {
            'first_name': 'Short', 'last_name': 'Phone',
            'email': 'shortphone@test.com', 'phone': '123'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone', response.data)

    def test_sales_agent_create_and_modify_assigned(self):
        """Test Sales Agent RBAC controls: can edit assigned, blocked from others"""
        # Sales Agent 1 edits customer 1 (assigned to them)
        self.client.force_authenticate(user=self.sales_agent_1)
        url = reverse('customer-detail', kwargs={'pk': self.cust_1.id})
        data = {'first_name': 'Bruce-Edited', 'last_name': 'Wayne', 'email': 'bruce@wayne.com'}
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Sales Agent 1 tries to edit customer 2 (assigned to Sales Agent 2)
        url_2 = reverse('customer-detail', kwargs={'pk': self.cust_2.id})
        data_2 = {'first_name': 'Tony-Hack', 'last_name': 'Stark', 'email': 'tony@stark.com'}
        response_2 = self.client.put(url_2, data_2)
        self.assertEqual(response_2.status_code, status.HTTP_403_FORBIDDEN)

    def test_support_agent_cannot_edit_or_delete(self):
        """Test Support Agent cannot perform write operations, but can read"""
        self.client.force_authenticate(user=self.support_agent)
        url = reverse('customer-detail', kwargs={'pk': self.cust_1.id})
        
        # Get details (Safe Method) -> Should be successful
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Edit (PUT) -> Should fail with 403
        response = self.client.put(url, {'first_name': 'Fail', 'last_name': 'Edit', 'email': 'bruce@wayne.com'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Delete (DELETE) -> Should fail with 403
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_support_agent_can_add_note_to_timeline(self):
        """Test that support agents can log notes to customer timelines"""
        self.client.force_authenticate(user=self.support_agent)
        url = reverse('customer-add-note', kwargs={'pk': self.cust_1.id})
        response = self.client.post(url, {'note': 'Called customer to verify account details'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['action'], 'Activity note added')
        self.assertEqual(response.data['note'], 'Called customer to verify account details')

    def test_customer_history_logs_changes(self):
        """Test that updating customer fields logs chronological actions"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('customer-detail', kwargs={'pk': self.cust_1.id})
        
        # Change status
        self.client.patch(url, {'status': 'Churned'})
        
        # Fetch history
        history_url = reverse('customer-get-history', kwargs={'pk': self.cust_1.id})
        response = self.client.get(history_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # First history log should check the status update
        self.assertEqual(response.data[0]['action'], "Status updated from 'Active' to 'Churned'")
        self.assertEqual(response.data[0]['action_by_details']['email'], 'admin@sf.com')
