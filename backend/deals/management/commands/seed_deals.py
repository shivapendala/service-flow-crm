from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from deals.models import Deal
from customers.models import Customer

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed the database with 10 mock deals for Sales Pipeline testing'

    def handle(self, *args, **options):
        try:
            admin_user = User.objects.get(email='admin@serviceflow.com')
            sales_user = User.objects.get(email='sales@serviceflow.com')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("Please run 'python manage.py seed_users' first to seed staff accounts."))
            return

        today = timezone.now().date()

        # Fetch our seeded customers to associate them with the deals
        def get_customer_by_company(name):
            try:
                return Customer.objects.filter(company_name__icontains=name).first()
            except Customer.DoesNotExist:
                return None

        cust_wayne = get_customer_by_company("Wayne")
        cust_stark = get_customer_by_company("Stark")
        cust_meta = get_customer_by_company("Metacortex")
        cust_bugle = get_customer_by_company("Bugle")
        cust_hooli = get_customer_by_company("Hooli")
        cust_piper = get_customer_by_company("Piper")
        cust_cyberdyne = get_customer_by_company("Cyberdyne")
        cust_tyrell = get_customer_by_company("Tyrell")
        cust_initech = get_customer_by_company("Initech")
        cust_vance = get_customer_by_company("Vance")

        # Fallback check
        if not cust_wayne:
            self.stdout.write(self.style.ERROR("Seeded customers not found. Please run 'python manage.py seed_customers' first."))
            return

        deals_data = [
            {
                "title": "Wayne Corp Enterprise Portal Upgrade", "value": "12500.00",
                "stage": "Proposal", "close_date": today + timedelta(days=20),
                "customer": cust_wayne, "assigned_to": sales_user
            },
            {
                "title": "Stark Tech Security Cloud Migration", "value": "45000.00",
                "stage": "Negotiation", "close_date": today + timedelta(days=10),
                "customer": cust_stark, "assigned_to": sales_user
            },
            {
                "title": "Metacortex Local Network Firewall Integration", "value": "8000.00",
                "stage": "New", "close_date": today + timedelta(days=45),
                "customer": cust_meta, "assigned_to": None
            },
            {
                "title": "Daily Bugle Headless CMS Migration", "value": "5500.00",
                "stage": "Contacted", "close_date": today + timedelta(days=30),
                "customer": cust_bugle, "assigned_to": sales_user
            },
            {
                "title": "Hooli Enterprise Server Virtualization", "value": "35000.00",
                "stage": "Lost", "close_date": today - timedelta(days=5),
                "customer": cust_hooli, "assigned_to": sales_user
            },
            {
                "title": "Pied Piper Core Storage Cluster", "value": "18500.00",
                "stage": "Won", "close_date": today - timedelta(days=2),
                "customer": cust_piper, "assigned_to": sales_user
            },
            {
                "title": "Cyberdyne Neural Network GPU Cluster", "value": "95000.00",
                "stage": "Negotiation", "close_date": today + timedelta(days=15),
                "customer": cust_cyberdyne, "assigned_to": None
            },
            {
                "title": "Tyrell Android Core Systems Supply", "value": "150000.00",
                "stage": "Proposal", "close_date": today + timedelta(days=60),
                "customer": cust_tyrell, "assigned_to": sales_user
            },
            {
                "title": "Initech Internal Database Compliance Audit", "value": "3200.00",
                "stage": "Qualified", "close_date": today + timedelta(days=25),
                "customer": cust_initech, "assigned_to": sales_user
            },
            {
                "title": "Vance Refrigeration Logistics Routing Portal", "value": "22000.00",
                "stage": "Won", "close_date": today - timedelta(days=12),
                "customer": cust_vance, "assigned_to": sales_user
            }
        ]

        for idx, d_data in enumerate(deals_data):
            deal_exists = Deal.objects.filter(title=d_data["title"]).exists()
            if not deal_exists:
                Deal.objects.create(
                    title=d_data["title"],
                    deal_value=d_data["value"],
                    stage=d_data["stage"],
                    expected_close_date=d_data["close_date"],
                    customer=d_data["customer"],
                    assigned_to=d_data["assigned_to"],
                    created_by=admin_user
                )
                self.stdout.write(self.style.SUCCESS(f"Successfully seeded deal: {d_data['title']}"))
            else:
                self.stdout.write(self.style.WARNING(f"Deal {d_data['title']} already exists. Skipping."))

        self.stdout.write(self.style.SUCCESS("\nSeeding deal records complete. Total deals in DB: " + str(Deal.objects.count())))
