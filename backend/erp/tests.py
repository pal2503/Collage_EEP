from django.conf import settings
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from .models import Course, Department, User


class ProductionHostConfigTests(TestCase):
    def test_render_host_is_allowed_and_trusted(self):
        self.assertIn("collage-eep.onrender.com", settings.ALLOWED_HOSTS)
        self.assertIn("https://collage-eep.onrender.com", getattr(settings, "CSRF_TRUSTED_ORIGINS", []))


class RoleAccessTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(department_code="SCI", department_name="Science")
        self.admin = User.objects.create_user(username="admin", email="admin@example.test", password="secure-pass-123", role=User.Role.ADMIN)
        self.student = User.objects.create_user(username="student", email="student@example.test", password="secure-pass-123", role=User.Role.STUDENT)

    def test_student_cannot_create_department(self):
        client = APIClient()
        client.force_authenticate(self.student)
        response = client.post("/api/departments/", {"department_code": "ART", "department_name": "Arts"})
        self.assertEqual(response.status_code, 403)

    def test_admin_can_create_department(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        response = client.post("/api/departments/", {"department_code": "ART", "department_name": "Arts"})
        self.assertEqual(response.status_code, 201)

    def test_student_can_read_catalog_but_not_student_directory(self):
        Course.objects.create(course_code="SCI101", course_name="Foundations", credits=3, department=self.department)
        client = APIClient()
        client.force_authenticate(self.student)
        self.assertEqual(client.get("/api/departments/").status_code, 200)
        self.assertEqual(client.get("/api/courses/").status_code, 200)
        self.assertEqual(client.get("/api/students/").status_code, 403)

    def test_admin_catalog_serializes_unassigned_professor(self):
        Course.objects.create(course_code="SCI101", course_name="Foundations", credits=3, department=self.department)
        client = APIClient()
        client.force_authenticate(self.admin)
        response = client.get("/api/courses/")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["results"][0]["professor_name"])
