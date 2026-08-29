from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from communications.models import CommunicationLog
from customers.models import Customer
from leads.models import Lead

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed the database with 5 mock communication logs for CRM testing'

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

        now_time = timezone.now()

        logs_data = [
            {
                "contact_type": "Call", "subject": "Initial call regarding gate scanner issue",
                "content": "Bruce Wayne called to report that the access gate RFID reader has failed completely. Scheduled Sarah to go on-site.",
                "interaction_date": now_time - timedelta(days=2), "customer": cust_wayne,
                "lead": None, "logged_by": sales_user
            },
            {
                "contact_type": "Email", "subject": "Sent proposal draft for cloud scaling",
                "content": "Emailed Tony Stark the proposal and pricing breakdown for our database capacity expansion. Awaiting feedback.",
                "interaction_date": now_time - timedelta(days=3), "customer": cust_stark,
                "lead": None, "logged_by": sales_user
            },
            {
                "contact_type": "Meeting", "subject": "Educational portal features demo",
                "content": "Conducted a screen-share demonstration of our media network router integrations for Hogwarts portal with Harry Potter.",
                "interaction_date": now_time - timedelta(days=1), "customer": None,
                "lead": lead_potter, "logged_by": sales_user
            },
            {
                "contact_type": "Note", "subject": "Wayne Enterprises gate clearance instructions",
                "content": "Security desk clearance requires presenting a government photo ID and listing ticket number REQ-1001.",
                "interaction_date": now_time, "customer": cust_wayne,
                "lead": None, "logged_by": sales_user
            },
            {
                "contact_type": "Follow-up", "subject": "Dwight Schrute logistics scheduling callback",
                "content": "Called Dwight back to discuss the refrigerator routing pipeline logs. Confirmed meeting on Monday.",
                "interaction_date": now_time - timedelta(days=4), "customer": cust_vance,
                "lead": None, "logged_by": sales_user
            }
        ]

        for idx, l_data in enumerate(logs_data):
            log_exists = CommunicationLog.objects.filter(
                subject=l_data["subject"], contact_type=l_data["contact_type"]
            ).exists()
            
            if not log_exists:
                CommunicationLog.objects.create(
                    contact_type=l_data["contact_type"],
                    subject=l_data["subject"],
                    content=l_data["content"],
                    interaction_date=l_data["interaction_date"],
                    customer=l_data["customer"],
                    lead=l_data["lead"],
                    logged_by=l_data["logged_by"]
                )
                self.stdout.write(self.style.SUCCESS(f"Successfully seeded communication log: {l_data['subject']}"))
            else:
                self.stdout.write(self.style.WARNING(f"Communication log '{l_data['subject']}' already exists. Skipping."))

        self.stdout.write(self.style.SUCCESS("\nSeeding communication records complete. Total logs in DB: " + str(CommunicationLog.objects.count())))
