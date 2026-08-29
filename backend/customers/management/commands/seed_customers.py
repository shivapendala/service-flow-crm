from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from customers.models import Customer, CustomerHistory

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed the database with 12 mock customers for CRM testing'

    def handle(self, *args, **options):
        # Retrieve the seeded Admin and Sales Agent users to assign ownership/management
        try:
            admin_user = User.objects.get(email='admin@serviceflow.com')
            sales_user = User.objects.get(email='sales@serviceflow.com')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("Please run 'python manage.py seed_users' first to seed staff accounts."))
            return

        customers_data = [
            {
                "first_name": "Thomas", "last_name": "Anderson",
                "email": "neo@metacortex.com", "phone": "+1 555-0101",
                "company_name": "Metacortex", "company_website": "https://www.metacortex.com",
                "status": "Lead", "address": "Room 101, Adams Street, Chicago"
            },
            {
                "first_name": "Bruce", "last_name": "Wayne",
                "email": "bruce@waynecorp.com", "phone": "+1 555-1939",
                "company_name": "Wayne Enterprises", "company_website": "https://www.wayneenterprises.com",
                "status": "Active", "address": "Wayne Manor, Gotham City"
            },
            {
                "first_name": "Tony", "last_name": "Stark",
                "email": "tony@starkindustries.com", "phone": "+1 555-1963",
                "company_name": "Stark Industries", "company_website": "https://www.starkindustries.com",
                "status": "Active", "address": "10880 El Medio St, Malibu, CA"
            },
            {
                "first_name": "Peter", "last_name": "Parker",
                "email": "peter.parker@dailybugle.net", "phone": "+1 555-1962",
                "company_name": "Daily Bugle", "company_website": "https://www.dailybugle.net",
                "status": "Active", "address": "20 Ingram St, Forest Hills, Queens, NY"
            },
            {
                "first_name": "Clark", "last_name": "Kent",
                "email": "ckent@dailyplanet.com", "phone": "+1 555-1938",
                "company_name": "Daily Planet", "company_website": "https://www.dailyplanet.com",
                "status": "Lead", "address": "344 Clinton St, Apt 3D, Metropolis"
            },
            {
                "first_name": "Gavin", "last_name": "Belson",
                "email": "gbelson@hooli.xyz", "phone": "+1 555-2014",
                "company_name": "Hooli", "company_website": "https://www.hooli.xyz",
                "status": "Churned", "address": "Hooli Campus, Mountain View, CA"
            },
            {
                "first_name": "Richard", "last_name": "Hendricks",
                "email": "richard@piedpiper.com", "phone": "+1 555-2015",
                "company_name": "Pied Piper", "company_website": "https://www.piedpiper.com",
                "status": "Active", "address": "El Camino Real, Palo Alto, CA"
            },
            {
                "first_name": "Miles", "last_name": "Dyson",
                "email": "mdyson@cyberdyne.net", "phone": "+1 555-1991",
                "company_name": "Cyberdyne Systems", "company_website": "https://www.cyberdyne.net",
                "status": "Inactive", "address": "18111 Nordhoff St, Northridge, CA"
            },
            {
                "first_name": "Eldon", "last_name": "Tyrell",
                "email": "tyrell@tyrellcorp.com", "phone": "+1 555-1982",
                "company_name": "Tyrell Corporation", "company_website": "https://www.tyrellcorp.com",
                "status": "Inactive", "address": "Tyrell Pyramid, Los Angeles"
            },
            {
                "first_name": "Peter", "last_name": "Gibbons",
                "email": "peter@initech.com", "phone": "+1 555-1999",
                "company_name": "Initech", "company_website": "https://www.initech.com",
                "status": "Active", "address": "4120 Freemont Ave, Austin, TX"
            },
            {
                "first_name": "Sarah", "last_name": "Connor",
                "email": "sconnor@resistance.net", "phone": "+1 555-1984",
                "company_name": "Vance Refrigeration", "company_website": "https://www.vance.com",
                "status": "Lead", "address": "P.O. Box 923, Mojave Desert, CA"
            },
            {
                "first_name": "Arthur", "last_name": "Dent",
                "email": "adent@galaxy.org", "phone": "+1 555-1979",
                "company_name": "Megadodo Publications", "company_website": "https://www.megadodo.com",
                "status": "Churned", "address": "Cottington, West Country, UK"
            }
        ]

        for idx, c_data in enumerate(customers_data):
            # Check if customer already exists
            customer_exists = Customer.objects.filter(email=c_data["email"]).exists()
            if not customer_exists:
                # Alternate assignments slightly for testing filters (some unassigned, some assigned to Sarah Miller)
                assigned_agent = sales_user if idx % 3 != 0 else None
                
                customer = Customer.objects.create(
                    first_name=c_data["first_name"],
                    last_name=c_data["last_name"],
                    email=c_data["email"],
                    phone=c_data["phone"],
                    company_name=c_data["company_name"],
                    company_website=c_data["company_website"],
                    status=c_data["status"],
                    address=c_data["address"],
                    assigned_to=assigned_agent,
                    created_by=admin_user
                )

                # Log history entry
                CustomerHistory.objects.create(
                    customer=customer,
                    action_by=admin_user,
                    action="Customer profile created via database seed"
                )
                
                if assigned_agent:
                    CustomerHistory.objects.create(
                        customer=customer,
                        action_by=admin_user,
                        action=f"Assigned agent set to {assigned_agent.first_name} {assigned_agent.last_name}"
                    )

                self.stdout.write(self.style.SUCCESS(f"Successfully seeded customer: {customer.first_name} {customer.last_name}"))
            else:
                self.stdout.write(self.style.WARNING(f"Customer {c_data['email']} already exists. Skipping."))

        self.stdout.write(self.style.SUCCESS("\nSeeding customer records complete. Total customers in DB: " + str(Customer.objects.count())))
