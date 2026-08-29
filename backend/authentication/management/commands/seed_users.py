from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from authentication.models import UserProfile

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed the database with default users for all CRM roles'

    def handle(self, *args, **options):
        # User details to seed
        users_to_seed = [
            {
                "email": "admin@serviceflow.com",
                "first_name": "Alice",
                "last_name": "Smith",
                "role": "Admin",
                "is_staff": True,
                "is_superuser": True,
                "bio": "System Administrator for ServiceFlow CRM. Manages platform security and user settings.",
                "department": "IT Operations"
            },
            {
                "email": "manager@serviceflow.com",
                "first_name": "Bob",
                "last_name": "Jones",
                "role": "Manager",
                "is_staff": True,
                "bio": "Support and Sales operations manager. Oversees agent allocations and escalations.",
                "department": "Customer Success Management"
            },
            {
                "email": "support@serviceflow.com",
                "first_name": "Charlie",
                "last_name": "Brown",
                "role": "Support Agent",
                "is_staff": False,
                "bio": "Customer support agent resolving technical issues and customer billing inquiries.",
                "department": "Helpdesk Tier 1"
            },
            {
                "email": "sales@serviceflow.com",
                "first_name": "Sarah",
                "last_name": "Miller",
                "role": "Sales Agent",
                "is_staff": False,
                "bio": "Sales agent managing business relations and high-value lead pipelines.",
                "department": "Enterprise Sales"
            },
            {
                "email": "customer@serviceflow.com",
                "first_name": "John",
                "last_name": "Doe",
                "role": "Customer",
                "is_staff": False,
                "bio": "Enterprise client using ServiceFlow CRM.",
                "department": "Apex Corporation"
            }
        ]

        default_password = "CRMUserPass123!"

        for user_data in users_to_seed:
            email = user_data["email"]
            first_name = user_data["first_name"]
            last_name = user_data["last_name"]
            role = user_data["role"]
            is_staff = user_data.get("is_staff", False)
            is_superuser = user_data.get("is_superuser", False)
            
            # Check if user already exists
            user_exists = User.objects.filter(email=email).exists()
            if not user_exists:
                user = User.objects.create_user(
                    email=email,
                    password=default_password,
                    first_name=first_name,
                    last_name=last_name,
                    role=role,
                    is_staff=is_staff,
                    is_superuser=is_superuser
                )
                
                # Get the auto-created profile via signals and populate details
                profile = user.profile
                profile.bio = user_data["bio"]
                profile.department = user_data["department"]
                profile.phone_number = "+1 555-0199"
                profile.address = "123 Business Way, Suite 100"
                profile.avatar_url = f"https://api.dicebear.com/7.x/adventurer/svg?seed={first_name}"
                profile.save()
                
                self.stdout.write(self.style.SUCCESS(f"Successfully created {role} user: {email}"))
            else:
                self.stdout.write(self.style.WARNING(f"User {email} already exists. Skipping."))
                
        self.stdout.write(self.style.SUCCESS("\nSeeding complete. Use password 'CRMUserPass123!' for all seeded users."))
