from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from authentication.models import UserProfile, PasswordResetToken

User = get_user_model()

class ModelTests(TestCase):
    def test_create_user_with_email_successful(self):
        """Test creating a new user with an email is successful"""
        email = 'test@example.com'
        password = 'TestPassword123!'
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name='Test',
            last_name='User'
        )
        self.assertEqual(user.email, email)
        self.assertTrue(user.check_password(password))
        self.assertEqual(user.role, 'Customer') # Default role
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_create_superuser_successful(self):
        """Test creating a new superuser is successful"""
        email = 'admin@example.com'
        password = 'AdminPassword123!'
        superuser = User.objects.create_superuser(
            email=email,
            password=password
        )
        self.assertEqual(superuser.email, email)
        self.assertEqual(superuser.role, 'Admin')
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)

    def test_user_profile_signal_creates_profile(self):
        """Test that a UserProfile is automatically created via post_save signal"""
        user = User.objects.create_user(
            email='signal@example.com',
            password='Password123!'
        )
        # Check if profile exists and is linked
        self.assertTrue(UserProfile.objects.filter(user=user).exists())
        self.assertEqual(user.profile.user, user)


class AuthAPITests(APITestCase):
    def setUp(self):
        # Create test users with different roles
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='AdminPassword123!',
            role='Admin',
            is_staff=True
        )
        self.manager_user = User.objects.create_user(
            email='manager@test.com',
            password='ManagerPassword123!',
            role='Manager',
            is_staff=True
        )
        self.support_user = User.objects.create_user(
            email='support@test.com',
            password='SupportPassword123!',
            role='Support Agent'
        )
        self.customer_user = User.objects.create_user(
            email='customer@test.com',
            password='CustomerPassword123!',
            role='Customer'
        )

    def test_register_user_successful(self):
        """Test registering a new customer account is successful"""
        url = reverse('register')
        data = {
            'email': 'newuser@example.com',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'NewPassword123!',
            'password_confirm': 'NewPassword123!'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='newuser@example.com').exists())
        user = User.objects.get(email='newuser@example.com')
        self.assertEqual(user.role, 'Customer') # Public registration must enforce Customer role

    def test_register_password_mismatch(self):
        """Test registering fails if passwords don't match"""
        url = reverse('register')
        data = {
            'email': 'mismatch@example.com',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'Password123!',
            'password_confirm': 'DifferentPassword123!'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_login_successful(self):
        """Test logging in returns JWT access and refresh tokens"""
        url = reverse('token_obtain_pair')
        data = {
            'email': 'customer@test.com',
            'password': 'CustomerPassword123!'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_incorrect_credentials(self):
        """Test login fails with incorrect password"""
        url = reverse('token_obtain_pair')
        data = {
            'email': 'customer@test.com',
            'password': 'WrongPassword123!'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_profile_authenticated(self):
        """Test fetching logged in user profile is successful"""
        self.client.force_authenticate(user=self.customer_user)
        url = reverse('user_profile')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'customer@test.com')
        self.assertEqual(response.data['role'], 'Customer')

    def test_update_profile_authenticated(self):
        """Test updating user profile details is successful"""
        self.client.force_authenticate(user=self.customer_user)
        url = reverse('user_profile')
        data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'phone_number': '123-456-7890',
            'bio': 'Test bio information',
            'address': '123 Main St'
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Reload user and check changes
        self.customer_user.refresh_from_db()
        self.assertEqual(self.customer_user.first_name, 'John')
        self.assertEqual(self.customer_user.last_name, 'Doe')
        self.assertEqual(self.customer_user.profile.phone_number, '123-456-7890')
        self.assertEqual(self.customer_user.profile.bio, 'Test bio information')

    def test_get_profile_unauthenticated_fails(self):
        """Test unauthenticated profile access fails with 401"""
        url = reverse('user_profile')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RoleBasedAccessTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@rbac.com',
            password='Password123!',
            role='Admin',
            is_staff=True
        )
        self.manager = User.objects.create_user(
            email='manager@rbac.com',
            password='Password123!',
            role='Manager',
            is_staff=True
        )
        self.customer = User.objects.create_user(
            email='customer@rbac.com',
            password='Password123!',
            role='Customer'
        )

    def test_admin_can_access_user_list(self):
        """Test that Admin can access the user list management API"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('user-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_manager_can_access_user_list(self):
        """Test that Manager can access the user list management API"""
        self.client.force_authenticate(user=self.manager)
        url = reverse('user-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_customer_cannot_access_user_list(self):
        """Test that Customer cannot access the user list management API"""
        self.client.force_authenticate(user=self.customer)
        url = reverse('user-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_user_with_role(self):
        """Test that Admin can create a new user with a specific role"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('user-list')
        data = {
            'email': 'new_support@rbac.com',
            'first_name': 'Support',
            'last_name': 'Agent',
            'role': 'Support Agent',
            'password': 'AgentPassword123!'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(email='new_support@rbac.com')
        self.assertEqual(new_user.role, 'Support Agent')
