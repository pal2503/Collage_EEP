from getpass import getpass
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create an administrator account for the College ERP."

    def add_arguments(self, parser):
        parser.add_argument("--username")
        parser.add_argument("--email")

    def handle(self, *args, **options):
        User = get_user_model()
        username = options.get("username") or input("Username: ").strip()
        email = options.get("email") or input("Email: ").strip()
        if not username or not email:
            raise CommandError("Username and email are required.")
        if User.objects.filter(username=username).exists():
            raise CommandError("That username is already in use.")
        if User.objects.filter(email=email).exists():
            raise CommandError("That email address is already in use.")
        password = getpass("Password: ")
        confirmation = getpass("Password (again): ")
        if password != confirmation:
            raise CommandError("The passwords did not match.")
        if len(password) < 8:
            raise CommandError("Use a password with at least 8 characters.")
        User.objects.create_user(username=username, email=email, password=password, role=User.Role.ADMIN, is_staff=True)
        self.stdout.write(self.style.SUCCESS(f"Administrator '{username}' created."))
