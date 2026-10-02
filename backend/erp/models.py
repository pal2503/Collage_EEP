from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrator"
        PROFESSOR = "PROFESSOR", "Professor"
        STUDENT = "STUDENT", "Student"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=12, choices=Role.choices, default=Role.STUDENT)

    def __str__(self):
        return self.get_full_name() or self.username


class Department(models.Model):
    department_code = models.CharField(max_length=12, unique=True)
    department_name = models.CharField(max_length=120)
    head_of_department = models.ForeignKey("Professor", null=True, blank=True, on_delete=models.SET_NULL, related_name="headed_departments")

    def __str__(self):
        return f"{self.department_code} — {self.department_name}"


class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    student_id = models.CharField(max_length=24, unique=True)
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="students")
    enrollment_year = models.PositiveSmallIntegerField(validators=[MinValueValidator(1900), MaxValueValidator(2200)])

    def __str__(self):
        return f"{self.student_id} — {self.first_name} {self.last_name}"


class Professor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="professor_profile")
    professor_id = models.CharField(max_length=24, unique=True)
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="professors")
    designation = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Course(models.Model):
    course_code = models.CharField(max_length=16, unique=True)
    course_name = models.CharField(max_length=140)
    credits = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="courses")
    assigned_professor = models.ForeignKey(Professor, null=True, blank=True, on_delete=models.SET_NULL, related_name="courses")

    def __str__(self):
        return f"{self.course_code} — {self.course_name}"


class Enrollment(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    enrollment_date = models.DateField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["student", "course"], name="unique_student_course_enrollment")]


class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="attendance_records")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField()
    status = models.CharField(max_length=7, choices=Status.choices)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["course", "student", "date"], name="unique_attendance_per_day")]
        ordering = ["-date", "student__last_name"]


class Grade(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="grades")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="grades")
    marks_obtained = models.DecimalField(max_digits=7, decimal_places=2, validators=[MinValueValidator(0)])
    total_marks = models.DecimalField(max_digits=7, decimal_places=2, validators=[MinValueValidator(0.01)])
    letter_grade = models.CharField(max_length=2, choices=[(x, x) for x in ("A", "B", "C", "D", "F")])

    class Meta:
        constraints = [models.UniqueConstraint(fields=["course", "student"], name="unique_grade_per_course_student")]


class Timetable(models.Model):
    class Day(models.TextChoices):
        MONDAY = "MONDAY", "Monday"
        TUESDAY = "TUESDAY", "Tuesday"
        WEDNESDAY = "WEDNESDAY", "Wednesday"
        THURSDAY = "THURSDAY", "Thursday"
        FRIDAY = "FRIDAY", "Friday"
        SATURDAY = "SATURDAY", "Saturday"
        SUNDAY = "SUNDAY", "Sunday"

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="timetable_entries")
    day_of_week = models.CharField(max_length=9, choices=Day.choices)
    time_slot = models.CharField(max_length=40)
    room_number = models.CharField(max_length=24)


class Notification(models.Model):
    class TargetRole(models.TextChoices):
        ALL = "ALL", "Everyone"
        STUDENT = "STUDENT", "Students"
        PROFESSOR = "PROFESSOR", "Professors"

    title = models.CharField(max_length=180)
    message = models.TextField()
    target_role = models.CharField(max_length=10, choices=TargetRole.choices, default=TargetRole.ALL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
