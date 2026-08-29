from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from tickets.models import Ticket, TicketComment, TicketHistory
from customers.models import Customer

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed the database with 5 mock support tickets and comments for CRM testing'

    def handle(self, *args, **options):
        try:
            admin_user = User.objects.get(email='admin@serviceflow.com')
            support_user = User.objects.get(email='support@serviceflow.com')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("Please run 'python manage.py seed_users' first to seed staff accounts."))
            return

        # Fetch our seeded customers to associate them with the tickets
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

        tickets_data = [
            {
                "subject": "Database connection timeouts on Wayne Corp Portal",
                "description": "Our developers are receiving timeout errors when trying to connect to the CRM syncing API endpoint. This blocks morning report processing.",
                "category": "Technical", "priority": "High", "status": "Open",
                "customer": cust_wayne, "assigned_to": support_user
            },
            {
                "subject": "Stark Tech Billing discrepancies for July invoice",
                "description": "The July invoice lists duplicate usage charges for server capacity. Please review and issue a credit note for $1,250.",
                "category": "Billing", "priority": "Urgent", "status": "In Progress",
                "customer": cust_stark, "assigned_to": support_user
            },
            {
                "subject": "Requesting feature for bulk PDF lead report exporter",
                "description": "We want an option in the CRM lead directory to select multiple leads and export them to a compiled PDF document in one click.",
                "category": "Feature Request", "priority": "Medium", "status": "Open",
                "customer": cust_bugle, "assigned_to": None
            },
            {
                "subject": "General inquiry on service flow maintenance hours",
                "description": "Can you provide the scheduled maintenance windows for Q3? We want to coordinate our automated testing pipelines accordingly.",
                "category": "General", "priority": "Low", "status": "Resolved",
                "customer": cust_piper, "assigned_to": support_user
            },
            {
                "subject": "Initech auditing dashboard doesn't load column fields",
                "description": "When opening the compliance dashboard, the table headers load but all customer record fields appear completely blank.",
                "category": "Technical", "priority": "High", "status": "Closed",
                "customer": cust_initech, "assigned_to": support_user
            }
        ]

        for idx, t_data in enumerate(tickets_data):
            ticket_exists = Ticket.objects.filter(subject=t_data["subject"]).exists()
            if not ticket_exists:
                ticket = Ticket.objects.create(
                    subject=t_data["subject"],
                    description=t_data["description"],
                    category=t_data["category"],
                    priority=t_data["priority"],
                    status=t_data["status"],
                    customer=t_data["customer"],
                    assigned_to=t_data["assigned_to"],
                    created_by=admin_user
                )
                self.stdout.write(self.style.SUCCESS(f"Successfully seeded ticket: {ticket.ticket_number}"))

                # Seed some comments/internal notes for the Wayne Corp ticket
                if ticket.subject.startswith("Database connection timeouts"):
                    TicketComment.objects.create(
                        ticket=ticket,
                        author=admin_user, # Represents client or creator
                        text="We are getting timeout errors when checking transactions at 9 AM EST.",
                        is_internal=False
                    )
                    TicketComment.objects.create(
                        ticket=ticket,
                        author=support_user,
                        text="Checking database log files for high CPU usage spike at 9 AM.",
                        is_internal=True # Staff internal note
                    )
                    TicketComment.objects.create(
                        ticket=ticket,
                        author=support_user,
                        text="Hello Bruce, we are checking the database server logs and will update you shortly.",
                        is_internal=False
                    )
                    
                    # Create initial status history entry
                    TicketHistory.objects.create(
                        ticket=ticket,
                        changed_by=support_user,
                        status_from="Open",
                        status_to="Open",
                        notes="Ticket registered and assigned to Support Agent."
                    )
                
                # Seed resolved ticket logs
                if ticket.status == "Resolved":
                    TicketHistory.objects.create(
                        ticket=ticket,
                        changed_by=support_user,
                        status_from="Open",
                        status_to="Resolved",
                        notes="Issues fixed and checked. Maintenance schedule shared."
                    )

            else:
                self.stdout.write(self.style.WARNING(f"Ticket for {t_data['subject']} already exists. Skipping."))

        self.stdout.write(self.style.SUCCESS("\nSeeding support ticket records complete. Total tickets in DB: " + str(Ticket.objects.count())))
