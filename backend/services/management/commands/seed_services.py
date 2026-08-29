from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from services.models import ServiceRequest, ServiceRequestComment, ServiceRequestHistory
from customers.models import Customer

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed the database with 5 mock service requests for CRM testing'

    def handle(self, *args, **options):
        try:
            admin_user = User.objects.get(email='admin@serviceflow.com')
            sales_user = User.objects.get(email='sales@serviceflow.com')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("Please run 'python manage.py seed_users' first to seed staff accounts."))
            return

        # Fetch our seeded customers to associate them with the service requests
        def get_customer_by_company(name):
            try:
                return Customer.objects.filter(company_name__icontains=name).first()
            except Customer.DoesNotExist:
                return None

        cust_wayne = get_customer_by_company("Wayne")
        cust_stark = get_customer_by_company("Stark")
        cust_bugle = get_customer_by_company("Bugle")
        cust_piper = get_customer_by_company("Piper")
        cust_initech = get_customer_by_company("Initech")

        # Fallback check
        if not cust_wayne:
            self.stdout.write(self.style.ERROR("Seeded customers not found. Please run 'python manage.py seed_customers' first."))
            return

        today = timezone.now().date()

        requests_data = [
            {
                "customer": cust_wayne, "category": "Repair", "priority": "High", "status": "Scheduled",
                "due_date": today + timedelta(days=5),
                "description": "Wayne Enterprises main gate access scanner is failing to read RFID credentials. Requires diagnostic repair.",
                "resolution_details": "", "assigned_to": sales_user
            },
            {
                "customer": cust_stark, "category": "Maintenance", "priority": "Urgent", "status": "In Progress",
                "due_date": today + timedelta(days=2),
                "description": "Annual database capacity check and server maintenance. Critical operation.",
                "resolution_details": "", "assigned_to": sales_user
            },
            {
                "customer": cust_bugle, "category": "Installation", "priority": "Medium", "status": "Pending",
                "due_date": today + timedelta(days=7),
                "description": "Installation of 3 new high-speed media network routers on the 4th floor editors room.",
                "resolution_details": "", "assigned_to": None
            },
            {
                "customer": cust_piper, "category": "Consultation", "priority": "Low", "status": "Completed",
                "due_date": today - timedelta(days=1),
                "description": "Consulting call to design cloud file synchronization pipeline structures.",
                "resolution_details": "Completed consultation call on August 28th. Provided pipeline schemas and structured endpoints.",
                "assigned_to": sales_user
            },
            {
                "customer": cust_initech, "category": "Maintenance", "priority": "High", "status": "Cancelled",
                "due_date": today + timedelta(days=10),
                "description": "Routine server room cooling system check-up.",
                "resolution_details": "Cancelled by client due to office migration schedule.",
                "assigned_to": sales_user
            }
        ]

        for idx, r_data in enumerate(requests_data):
            req_exists = ServiceRequest.objects.filter(description=r_data["description"]).exists()
            if not req_exists:
                req = ServiceRequest.objects.create(
                    customer=r_data["customer"],
                    category=r_data["category"],
                    priority=r_data["priority"],
                    status=r_data["status"],
                    due_date=r_data["due_date"],
                    description=r_data["description"],
                    resolution_details=r_data["resolution_details"],
                    assigned_to=r_data["assigned_to"],
                    created_by=admin_user
                )
                self.stdout.write(self.style.SUCCESS(f"Successfully seeded service request for {r_data['customer'].company_name}"))

                # Seed comment for the Wayne request
                if req.category == "Repair":
                    ServiceRequestComment.objects.create(
                        request=req,
                        author=admin_user,
                        text="Please make sure the technician checks the wiring inside the wall junction box as well."
                    )
                    
                    ServiceRequestHistory.objects.create(
                        request=req,
                        changed_by=admin_user,
                        status_from="Pending",
                        status_to="Scheduled",
                        notes="Service request logged and scheduled for dispatch."
                    )

            else:
                self.stdout.write(self.style.WARNING(f"Service request for {r_data['customer'].company_name} already exists. Skipping."))

        self.stdout.write(self.style.SUCCESS("\nSeeding service request records complete. Total requests in DB: " + str(ServiceRequest.objects.count())))
