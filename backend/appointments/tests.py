from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta, time
from rest_framework import status
from rest_framework.test import APITestCase
from customers.models import Customer
from appointments.models import Appointment, AppointmentHistory

User = get_user_model()

class AppointmentModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='sales@test.com', password='Password123!', role='Sales Agent'
        )
        self.customer = Customer.objects.create(
            first_name='John', last_name='Doe', email='john@doe.com', phone='1234567890'
        )

    def test_appointment_creation_successful(self):
        """Test creating an appointment record is successful"""
        appt = Appointment.objects.create(
            customer=self.customer,
            date=timezone.now().date() + timedelta(days=1),
            time=time(10, 0),
            purpose='Review scope',
            location='Online',
            status='Scheduled',
            created_by=self.user
        )
        self.assertEqual(appt.purpose, 'Review scope')
        self.assertEqual(appt.status, 'Scheduled')


class AppointmentAPITests(APITestCase):
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

        # Create appointments
        self.appt_1 = Appointment.objects.create(
            customer=self.customer_contact_1, date=timezone.now().date() + timedelta(days=2), time=time(10, 0),
            purpose='Wayne scanner review', location='Wayne Boardroom', status='Scheduled',
            assigned_to=self.support_agent, created_by=self.admin
        )
        self.appt_2 = Appointment.objects.create(
            customer=self.customer_contact_2, date=timezone.now().date() + timedelta(days=1), time=time(14, 0),
            purpose='Planet cooling audit', location='Daily Planet', status='Scheduled',
            assigned_to=self.support_agent, created_by=self.admin
        )

    def test_list_unauthenticated_fails(self):
        """Test unauthenticated request is blocked"""
        url = reverse('appointment-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_role_visibility_limits(self):
        """Test Customer role can only retrieve appointments linked to their email"""
        self.client.force_authenticate(user=self.customer_user_1)
        url = reverse('appointment-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return ONLY appointment 1
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['purpose'], 'Wayne scanner review')

        # Accessing another customer's appointment detail directly fails with 404
        url_detail_2 = reverse('appointment-detail', kwargs={'pk': self.appt_2.id})
        response_detail_2 = self.client.get(url_detail_2)
        self.assertEqual(response_detail_2.status_code, status.HTTP_404_NOT_FOUND)

    def test_support_agent_can_retrieve_all_appointments(self):
        """Test Support Agent can list all appointments in database"""
        self.client.force_authenticate(user=self.support_agent)
        url = reverse('appointment-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_appointment_search_works(self):
        """Test searching appointments by purpose or location"""
        self.client.force_authenticate(user=self.support_agent)
        url = f"{reverse('appointment-list')}?search=cooling"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['purpose'], 'Planet cooling audit')

    def test_validate_date_in_past_fails(self):
        """Test validation error when appointment date is scheduled in the past"""
        self.client.force_authenticate(user=self.support_agent)
        url = reverse('appointment-list')
        data = {
            'customer': self.customer_contact_1.id,
            'date': timezone.now().date() - timedelta(days=1), # Yesterday
            'time': '10:00:00',
            'purpose': 'Invalid past meeting'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('date', response.data)

    def test_customer_can_cancel_own_appointment(self):
        """Test customer can self-cancel their appointment but cannot edit other fields"""
        self.client.force_authenticate(user=self.customer_user_1)
        url = reverse('appointment-detail', kwargs={'pk': self.appt_1.id})
        
        # Self-cancel -> Success
        data = {'status': 'Cancelled'}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.appt_1.refresh_from_db()
        self.assertEqual(self.appt_1.status, 'Cancelled')

        # Edit location -> Forbidden 403
        data_edit = {'location': 'Wayne Manor'}
        response_edit = self.client.patch(url, data_edit)
        self.assertEqual(response_edit.status_code, status.HTTP_403_FORBIDDEN)

    def test_reschedule_logs_history(self):
        """Test changing status, date, or location writes history logs"""
        self.client.force_authenticate(user=self.support_agent)
        url = reverse('appointment-detail', kwargs={'pk': self.appt_2.id})
        
        new_date = timezone.now().date() + timedelta(days=5)
        data = {
            'customer': self.customer_contact_2.id,
            'date': new_date,
            'time': self.appt_2.time,
            'purpose': self.appt_2.purpose,
            'location': 'New Office Location',
            'status': 'Scheduled'
        }
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check history timeline
        history_url = reverse('appointment-get-history', kwargs={'pk': self.appt_2.id})
        history_response = self.client.get(history_url)
        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(history_response.data), 1)
        self.assertIn('Rescheduled', history_response.data[0]['notes'])
        self.assertIn('Location modified', history_response.data[0]['notes'])
