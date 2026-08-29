from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from tasks.models import Task
from customers.models import Customer
from leads.models import Lead

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed the database with 5 mock tasks for Follow-up testing'

    def handle(self, *args, **options):
        try:
            admin_user = User.objects.get(email='admin@serviceflow.com')
            sales_user = User.objects.get(email='sales@serviceflow.com')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("Please run 'python manage.py seed_users' first to seed staff accounts."))
            return

        # Fetch our seeded customers & leads
        def get_customer_by_company(name):
            try:
                return Customer.objects.filter(company_name__icontains=name).first()
            except Customer.DoesNotExist:
                return None

        def get_lead_by_email(email):
            try:
                return Lead.objects.filter(email=email).first()
            except Lead.DoesNotExist:
                return None

        cust_wayne = get_customer_by_company("Wayne")
        cust_stark = get_customer_by_company("Stark")
        cust_piper = get_customer_by_company("Piper")
        cust_vance = get_customer_by_company("Vance")
        lead_potter = get_lead_by_email("hpotter@hogwarts.edu")

        # Fallback check
        if not cust_wayne:
            self.stdout.write(self.style.ERROR("Seeded customers not found. Please run 'python manage.py seed_customers' first."))
            return

        today = timezone.now().date()
        now_time = timezone.now()

        tasks_data = [
            {
                "title": "Call Bruce Wayne to confirm RFID gate repair schedule",
                "description": "Ensure the technician checks the internal wall junction box during the check-up.",
                "priority": "High", "status": "Pending", "due_date": today + timedelta(days=2),
                "reminder_time": now_time + timedelta(days=1), "customer": cust_wayne,
                "lead": None, "assigned_to": sales_user
            },
            {
                "title": "Prepare Stark Tech capacity audit metrics report",
                "description": "Compile server check usage capacity log reports for July usage billing checks.",
                "priority": "High", "status": "Pending", "due_date": today + timedelta(days=1),
                "reminder_time": now_time + timedelta(hours=12), "customer": cust_stark,
                "lead": None, "assigned_to": sales_user
            },
            {
                "title": "Review Hogwarts educational portal proposal notes",
                "description": "Evaluate wizard portal configurations requested by Harry Potter on their lead card.",
                "priority": "Medium", "status": "Pending", "due_date": today + timedelta(days=4),
                "reminder_time": now_time + timedelta(days=2), "customer": None,
                "lead": lead_potter, "assigned_to": sales_user
            },
            {
                "title": "Coordinate Q3 service maintenance windows with Pied Piper",
                "description": "Send schedule timings list to coordinating technicians.",
                "priority": "Low", "status": "Completed", "due_date": today - timedelta(days=2),
                "reminder_time": None, "customer": cust_piper,
                "lead": None, "assigned_to": sales_user
            },
            {
                "title": "Check Vance Refrigeration logistics routing stats",
                "description": "Ensure routing pipelines are won and finalized in deals directory.",
                "priority": "High", "status": "Completed", "due_date": today - timedelta(days=5),
                "reminder_time": None, "customer": cust_vance,
                "lead": None, "assigned_to": sales_user
            }
        ]

        for idx, t_data in enumerate(tasks_data):
            task_exists = Task.objects.filter(title=t_data["title"]).exists()
            if not task_exists:
                Task.objects.create(
                    title=t_data["title"],
                    description=t_data["description"],
                    priority=t_data["priority"],
                    status=t_data["status"],
                    due_date=t_data["due_date"],
                    reminder_time=t_data["reminder_time"],
                    customer=t_data["customer"],
                    lead=t_data["lead"],
                    assigned_to=t_data["assigned_to"],
                    created_by=admin_user
                )
                self.stdout.write(self.style.SUCCESS(f"Successfully seeded task: {t_data['title']}"))
            else:
                self.stdout.write(self.style.WARNING(f"Task '{t_data['title']}' already exists. Skipping."))

        self.stdout.write(self.style.SUCCESS("\nSeeding task records complete. Total tasks in DB: " + str(Task.objects.count())))
