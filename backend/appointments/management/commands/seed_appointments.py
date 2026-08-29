from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta, time
from appointments.models import Appointment, AppointmentHistory
from customers.models import Customer

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed the database with 5 mock appointments for CRM testing'

    def handle(self, *args, **options):
        try:
            admin_user = User.objects.get(email='admin@serviceflow.com')
            sales_user = User.objects.get(email='sales@serviceflow.com')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("Please run 'python manage.py seed_users' first to seed staff accounts."))
            return

        # Fetch our seeded customers
        def get_customer_by_company(name):
            try:
                return Customer.objects.filter(company_name__icontains=name).first()
            except Customer.DoesNotExist:
                return None

        cust_wayne = get_customer_by_company("Wayne")
        cust_stark = get_customer_by_company("Stark")
        cust_piper = get_customer_by_company("Piper")
        cust_hogwarts = get_customer_by_company("Hogwarts")
        cust_vance = get_customer_by_company("Vance")

        # Fallback check
        if not cust_wayne:
            self.stdout.write(self.style.ERROR("Seeded customers not found. Please run 'python manage.py seed_customers' first."))
            return

        today = timezone.now().date()

        appts_data = [
            {
                "customer": cust_wayne, "date": today + timedelta(days=2), "time": time(10, 0),
                "purpose": "Review gate scanner security audit findings", "location": "Wayne Enterprises Boardroom",
                "status": "Scheduled", "notes": "Bruce Wayne requested printing paper copies of the report.",
                "assigned_to": sales_user
            },
            {
                "customer": cust_stark, "date": today + timedelta(days=1), "time": time(14, 30),
                "purpose": "Consultation on cloud database scaling options", "location": "Online (Google Meet)",
                "status": "Scheduled", "notes": "", "assigned_to": sales_user
            },
            {
                "customer": cust_piper, "date": today + timedelta(days=5), "time": time(11, 0),
                "purpose": "Q3 routing maintenance schedules kickoff", "location": "Client site - Palo Alto",
                "status": "Scheduled", "notes": "", "assigned_to": sales_user
            },
            {
                "customer": cust_vance, "date": today + timedelta(days=3), "time": time(9, 0),
                "purpose": "Evaluate logistics routing integrations", "location": "Main Office - Room 302",
                "status": "Scheduled", "notes": "", "assigned_to": sales_user
            },
            {
                "customer": cust_wayne, "date": today - timedelta(days=2), "time": time(16, 0),
                "purpose": "Portal architecture design consultation", "location": "Online (Zoom)",
                "status": "Completed", "notes": "Session completed. Discussed core database migration scripts.",
                "assigned_to": sales_user
            }
        ]

        for idx, a_data in enumerate(appts_data):
            appt_exists = Appointment.objects.filter(
                customer=a_data["customer"], date=a_data["date"], time=a_data["time"]
            ).exists()
            
            if not appt_exists:
                appt = Appointment.objects.create(
                    customer=a_data["customer"],
                    date=a_data["date"],
                    time=a_data["time"],
                    purpose=a_data["purpose"],
                    location=a_data["location"],
                    status=a_data["status"],
                    notes=a_data["notes"],
                    assigned_to=a_data["assigned_to"],
                    created_by=admin_user
                )
                self.stdout.write(self.style.SUCCESS(f"Successfully seeded appointment for {a_data['customer'].company_name}"))

                # Seed history log
                AppointmentHistory.objects.create(
                    appointment=appt,
                    changed_by=admin_user,
                    status_from="Scheduled",
                    status_to=a_data["status"],
                    notes=f"Meeting scheduled at {a_data['location']}."
                )
            else:
                self.stdout.write(self.style.WARNING(f"Appointment for {a_data['customer'].company_name} already exists. Skipping."))

        self.stdout.write(self.style.SUCCESS("\nSeeding appointment records complete. Total appointments in DB: " + str(Appointment.objects.count())))
