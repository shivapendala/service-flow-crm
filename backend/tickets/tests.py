from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from customers.models import Customer
from tickets.models import Ticket, TicketComment, TicketHistory

User = get_user_model()

class TicketModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='support@test.com', password='Password123!', role='Support Agent'
        )
        self.customer = Customer.objects.create(
            first_name='John', last_name='Doe', email='john@doe.com', phone='1234567890'
        )

    def test_ticket_number_generation(self):
        """Test Ticket creation auto-generates sequential ticket numbers"""
        t1 = Ticket.objects.create(
            customer=self.customer, subject='Help 1', description='Problem 1', created_by=self.user
        )
        t2 = Ticket.objects.create(
            customer=self.customer, subject='Help 2', description='Problem 2', created_by=self.user
        )
        self.assertEqual(t1.ticket_number, 'TIC-1001')
        self.assertEqual(t2.ticket_number, 'TIC-1002')


class TicketAPITests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_user(
            email='admin@sf.com', password='Password123!', role='Admin', is_staff=True
        )
        self.support_agent = User.objects.create_user(
            email='support@sf.com', password='Password123!', role='Support Agent'
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

        # Create tickets
        self.ticket_1 = Ticket.objects.create(
            customer=self.customer_contact_1, subject='Wayne connection times', description='DB timeouts',
            category='Technical', priority='High', status='Open',
            assigned_to=self.support_agent, created_by=self.admin
        )
        self.ticket_2 = Ticket.objects.create(
            customer=self.customer_contact_2, subject='Clark subscription inquiry', description='General issue',
            category='Billing', priority='Low', status='In Progress',
            assigned_to=self.support_agent, created_by=self.admin
        )

        # Comments
        self.comment_public = TicketComment.objects.create(
            ticket=self.ticket_1, author=self.support_agent, text='We are working on this.', is_internal=False
        )
        self.comment_internal = TicketComment.objects.create(
            ticket=self.ticket_1, author=self.support_agent, text='DB CPU spiked to 100%. Internal review.', is_internal=True
        )

    def test_support_agent_can_retrieve_all_tickets(self):
        """Test Support Agent can list all helpdesk tickets"""
        self.client.force_authenticate(user=self.support_agent)
        url = reverse('ticket-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_customer_role_visibility_limits(self):
        """Test Customer role can only retrieve tickets linked to their email"""
        self.client.force_authenticate(user=self.customer_user_1)
        url = reverse('ticket-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return ONLY ticket 1
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['ticket_number'], self.ticket_1.ticket_number)

        # Accessing another customer's ticket detail directly fails with 404/403
        url_detail_2 = reverse('ticket-detail', kwargs={'pk': self.ticket_2.id})
        response_detail_2 = self.client.get(url_detail_2)
        self.assertEqual(response_detail_2.status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_internal_comment_exclusions(self):
        """Test internal comments are completely hidden from Customer users"""
        # Support Agent GET comments -> Returns 2 (public + internal)
        self.client.force_authenticate(user=self.support_agent)
        url = reverse('ticket-manage-comments', kwargs={'pk': self.ticket_1.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        # Customer GET comments -> Returns 1 (public only, internal note filtered)
        self.client.force_authenticate(user=self.customer_user_1)
        response_cust = self.client.get(url)
        self.assertEqual(response_cust.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_cust.data), 1)
        self.assertEqual(response_cust.data[0]['text'], 'We are working on this.')

    def test_customer_cannot_post_internal_note(self):
        """Test validating Customers cannot flag comments as internal"""
        self.client.force_authenticate(user=self.customer_user_1)
        url = reverse('ticket-manage-comments', kwargs={'pk': self.ticket_1.id})
        data = {'text': 'Try hacking internal note.', 'is_internal': True}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('is_internal', response.data)

    def test_ticket_status_change_logs_history(self):
        """Test that updating status creates a TicketHistory log entry"""
        self.client.force_authenticate(user=self.support_agent)
        url = reverse('ticket-detail', kwargs={'pk': self.ticket_1.id})
        data = {
            'status': 'Resolved',
            'subject': self.ticket_1.subject,
            'description': self.ticket_1.description,
            'customer': self.customer_contact_1.id
        }
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check history endpoint returns status transition log
        history_url = reverse('ticket-get-history', kwargs={'pk': self.ticket_1.id})
        history_response = self.client.get(history_url)
        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(history_response.data), 1)
        self.assertEqual(history_response.data[0]['status_from'], 'Open')
        self.assertEqual(history_response.data[0]['status_to'], 'Resolved')
