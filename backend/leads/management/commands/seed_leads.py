from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from leads.models import Lead

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed the database with 12 mock leads for CRM testing'

    def handle(self, *args, **options):
        try:
            admin_user = User.objects.get(email='admin@serviceflow.com')
            sales_user = User.objects.get(email='sales@serviceflow.com')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("Please run 'python manage.py seed_users' first to seed staff accounts."))
            return

        today = timezone.now().date()

        leads_data = [
            {
                "first_name": "Luke", "last_name": "Skywalker", "email": "luke@jedi.org",
                "phone": "+1 555-9001", "company_name": "Jedi Order",
                "source": "Referral", "status": "New", "priority": "High",
                "follow_up_date": today + timedelta(days=2), "notes": "Interested in enterprise training."
            },
            {
                "first_name": "Ellen", "last_name": "Ripley", "email": "ripley@weyland.corp",
                "phone": "+1 555-2179", "company_name": "Weyland-Yutani Corp",
                "source": "Partner", "status": "Contacted", "priority": "High",
                "follow_up_date": today + timedelta(days=1), "notes": "Requires hazard containment systems."
            },
            {
                "first_name": "Marty", "last_name": "McFly", "email": "marty@delorean.io",
                "phone": "+1 555-1985", "company_name": "Hill Valley Tech",
                "source": "Website", "status": "Qualified", "priority": "Medium",
                "follow_up_date": today + timedelta(days=5), "notes": "Looking into time optimization tools."
            },
            {
                "first_name": "Frodo", "last_name": "Baggins", "email": "frodo@shire.me",
                "phone": "+1 555-3000", "company_name": "Bag End Collectibles",
                "source": "Referral", "status": "Proposal Sent", "priority": "High",
                "follow_up_date": today + timedelta(days=3), "notes": "Sending proposal for secure logistics."
            },
            {
                "first_name": "Sherlock", "last_name": "Holmes", "email": "holmes@bakerst.co.uk",
                "phone": "+1 555-2210", "company_name": "Consulting Detective Ltd",
                "source": "Partner", "status": "New", "priority": "Medium",
                "follow_up_date": today + timedelta(days=4), "notes": "Wants custom database search integrations."
            },
            {
                "first_name": "Walter", "last_name": "White", "email": "heisenberg@graymatter.net",
                "phone": "+1 555-5050", "company_name": "A1A Carwash",
                "source": "Cold Reach", "status": "Contacted", "priority": "Low",
                "follow_up_date": today + timedelta(days=7), "notes": "Evaluating payroll systems."
            },
            {
                "first_name": "James", "last_name": "Bond", "email": "007@mi6.gov.uk",
                "phone": "+1 555-0070", "company_name": "Universal Exports",
                "source": "Other", "status": "Proposal Sent", "priority": "High",
                "follow_up_date": today + timedelta(days=1), "notes": "Extremely high priority security review."
            },
            {
                "first_name": "Harry", "last_name": "Potter", "email": "hpotter@hogwarts.edu",
                "phone": "+1 555-9340", "company_name": "Hogwarts School",
                "source": "Website", "status": "Qualified", "priority": "Medium",
                "follow_up_date": today + timedelta(days=6), "notes": "Interested in educational CRM portals."
            },
            {
                "first_name": "Tony", "last_name": "Soprano", "email": "tony@badabing.com",
                "phone": "+1 555-2001", "company_name": "Sartoriale Waste Mgmt",
                "source": "Referral", "status": "Qualified", "priority": "Medium",
                "follow_up_date": today + timedelta(days=10), "notes": "Wants to trace logistics pipelines."
            },
            {
                "first_name": "Arthur", "last_name": "Dent", "email": "arthur@hitchhike.space",
                "phone": "+1 555-4242", "company_name": "Megadodo Publications",
                "source": "Other", "status": "New", "priority": "Low",
                "follow_up_date": today + timedelta(days=14), "notes": "Needs guide/documentation portals."
            },
            {
                "first_name": "Sarah", "last_name": "Connor", "email": "sarah@cyberdyne.info",
                "phone": "+1 555-1997", "company_name": "Tech-Com Systems",
                "source": "Cold Reach", "status": "New", "priority": "High",
                "follow_up_date": today + timedelta(days=3), "notes": "Urgent lead on security firewall."
            },
            {
                "first_name": "Neo", "last_name": "One", "email": "neo@zion.net",
                "phone": "+1 555-0101", "company_name": "Nebuchadnezzar",
                "source": "Website", "status": "New", "priority": "High",
                "follow_up_date": today + timedelta(days=8), "notes": "Interested in network monitoring systems."
            }
        ]

        for idx, l_data in enumerate(leads_data):
            lead_exists = Lead.objects.filter(email=l_data["email"]).exists()
            if not lead_exists:
                assigned_agent = sales_user if idx % 3 != 0 else None
                
                Lead.objects.create(
                    first_name=l_data["first_name"],
                    last_name=l_data["last_name"],
                    email=l_data["email"],
                    phone=l_data["phone"],
                    company_name=l_data["company_name"],
                    source=l_data["source"],
                    status=l_data["status"],
                    priority=l_data["priority"],
                    follow_up_date=l_data["follow_up_date"],
                    notes=l_data["notes"],
                    assigned_to=assigned_agent,
                    created_by=admin_user
                )
                self.stdout.write(self.style.SUCCESS(f"Successfully seeded lead: {l_data['first_name']} {l_data['last_name']}"))
            else:
                self.stdout.write(self.style.WARNING(f"Lead {l_data['email']} already exists. Skipping."))

        self.stdout.write(self.style.SUCCESS("\nSeeding lead records complete. Total leads in DB: " + str(Lead.objects.count())))
