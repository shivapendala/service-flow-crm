from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APITestCase
from customers.models import Customer
from tasks.models import Task

User = get_user_model()

class TaskModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='sales@test.com', password='Password123!', role='Sales Agent'
        )

    def test_task_creation_successful(self):
        """Test creating a task record is successful"""
        task = Task.objects.create(
            title='Follow up call',
            priority='High',
            status='Pending',
            due_date=timezone.now().date() + timedelta(days=1),
            created_by=self.user
        )
        self.assertEqual(task.title, 'Follow up call')
        self.assertEqual(task.priority, 'High')
        self.assertEqual(task.status, 'Pending')


class TaskAPITests(APITestCase):
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
        self.customer_user = User.objects.create_user(
            email='client@sf.com', password='Password123!', role='Customer'
        )

        self.customer = Customer.objects.create(
            first_name='Bruce', last_name='Wayne', email='bruce@wayne.corp', phone='1111111111'
        )

        # Create tasks
        self.task_1 = Task.objects.create(
            title='Prepare proposal review', priority='High', status='Pending',
            due_date=timezone.now().date() + timedelta(days=2),
            customer=self.customer, assigned_to=self.sales_agent_1, created_by=self.admin
        )
        self.task_2 = Task.objects.create(
            title='Check database backup logs', priority='Low', status='Completed',
            due_date=timezone.now().date() + timedelta(days=1),
            assigned_to=self.sales_agent_2, created_by=self.admin
        )

    def test_task_list_unauthenticated_fails(self):
        """Test unauthenticated request is blocked"""
        url = reverse('task-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_role_blocked_from_tasks(self):
        """Test Customer role gets 403 Forbidden"""
        self.client.force_authenticate(user=self.customer_user)
        url = reverse('task-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_list_all_tasks(self):
        """Test that Admin can retrieve all tasks without pagination"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('task-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return both tasks
        self.assertEqual(len(response.data), 2)

    def test_task_search_works(self):
        """Test searching tasks by title"""
        self.client.force_authenticate(user=self.admin)
        url = f"{reverse('task-list')}?search=database"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['title'], 'Check database backup logs')

    def test_task_filter_by_status_and_priority_works(self):
        """Test filtering by status and priority"""
        self.client.force_authenticate(user=self.admin)
        
        # Filter by status
        url = f"{reverse('task-list')}?status=Pending"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['title'], 'Prepare proposal review')

    def test_validate_reminder_after_due_date_fails(self):
        """Test validation error when reminder time is after due date"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('task-list')
        data = {
            'title': 'Bad Schedule Task',
            'due_date': timezone.now().date(),
            'reminder_time': timezone.now() + timedelta(days=2) # 2 days after due date
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('reminder_time', response.data)

    def test_sales_agent_modify_permissions(self):
        """Test Sales Agent RBAC updates constraints on tasks"""
        self.client.force_authenticate(user=self.sales_agent_1)
        url = reverse('task-detail', kwargs={'pk': self.task_1.id})
        
        # Sales Agent 1 edits task 1 (assigned to them) -> Success
        data = {
            'title': 'Prepare proposal review-Edited',
            'due_date': self.task_1.due_date,
            'status': 'Completed'
        }
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Sales Agent 1 edits task 2 (assigned to Agent 2) -> Fails 403
        url_2 = reverse('task-detail', kwargs={'pk': self.task_2.id})
        data_2 = {
            'title': 'Check database backup logs-Hack',
            'due_date': self.task_2.due_date,
            'status': 'Pending'
        }
        response_2 = self.client.put(url_2, data_2)
        self.assertEqual(response_2.status_code, status.HTTP_403_FORBIDDEN)
