from django.db import transaction
from django.db.models import Count, Q
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Attendance, Course, Department, Enrollment, Grade, Notification, Professor, Student, Timetable, User
from .permissions import AcademicRecordPermission, IsAdmin, IsAdminOrReadOnly
from .serializers import (AttendanceSerializer, CourseSerializer, DepartmentSerializer, EnrollmentSerializer,
                          GradeSerializer, NotificationSerializer, ProfessorSerializer, StudentSerializer,
                          TimetableSerializer, UserSerializer)


def is_admin(user):
    return user.role == User.Role.ADMIN


def owned_courses(user):
    return Course.objects.filter(assigned_professor__user=user)


def enrollment_exists(student_id, course_id):
    return Enrollment.objects.filter(student_id=student_id, course_id=course_id).exists()


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related("head_of_department").order_by("department_name")
    serializer_class = DepartmentSerializer
    permission_classes = [IsAdminOrReadOnly]


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related("user", "department").all()
    serializer_class = StudentSerializer
    permission_classes = [IsAdmin]
    search_fields = ["student_id", "first_name", "last_name", "user__email"]


class ProfessorViewSet(viewsets.ModelViewSet):
    queryset = Professor.objects.select_related("user", "department").all()
    serializer_class = ProfessorSerializer
    permission_classes = [IsAdmin]
    search_fields = ["professor_id", "first_name", "last_name", "user__email"]


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ["course_code", "course_name"]

    def get_queryset(self):
        queryset = Course.objects.select_related("department", "assigned_professor").annotate(enrollment_count=Count("enrollments")).order_by("course_code")
        user = self.request.user
        if is_admin(user):
            return queryset
        if user.role == User.Role.PROFESSOR:
            return queryset.filter(assigned_professor__user=user)
        return queryset.filter(enrollments__student__user=user).distinct()


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_permissions(self):
        if self.request.method in ("POST", "DELETE"):
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = Enrollment.objects.select_related("student", "course")
        user = self.request.user
        if is_admin(user):
            return queryset
        if user.role == User.Role.STUDENT:
            return queryset.filter(student__user=user)
        queryset = queryset.filter(course__in=owned_courses(user))
        if self.request.query_params.get("course"):
            queryset = queryset.filter(course_id=self.request.query_params["course"])
        return queryset

    def perform_create(self, serializer):
        student = serializer.validated_data["student"]
        course = serializer.validated_data["course"]
        if Enrollment.objects.filter(student=student, course=course).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"detail": "This student is already enrolled in the course."})
        serializer.save()


class AcademicRecordViewSet(viewsets.ModelViewSet):
    permission_classes = [AcademicRecordPermission]

    def get_queryset(self):
        queryset = self.queryset.select_related("course", "student", "student__user")
        user = self.request.user
        if is_admin(user):
            pass
        elif user.role == User.Role.PROFESSOR:
            queryset = queryset.filter(course__in=owned_courses(user))
        else:
            queryset = queryset.filter(student__user=user)
        course_id = self.request.query_params.get("course")
        student_id = self.request.query_params.get("student")
        date = self.request.query_params.get("date")
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if date:
            queryset = queryset.filter(date=date)
        return queryset

    def _check_write_access(self, course, student):
        if not enrollment_exists(student.pk, course.pk):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"student": "The student must be enrolled in this course."})
        user = self.request.user
        if not is_admin(user) and not owned_courses(user).filter(pk=course.pk).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You may only update records for your assigned courses.")

    def perform_create(self, serializer):
        self._check_write_access(serializer.validated_data["course"], serializer.validated_data["student"])
        serializer.save()

    def perform_update(self, serializer):
        self._check_write_access(serializer.validated_data.get("course", serializer.instance.course),
                                 serializer.validated_data.get("student", serializer.instance.student))
        serializer.save()


class AttendanceViewSet(AcademicRecordViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer


class GradeViewSet(AcademicRecordViewSet):
    queryset = Grade.objects.all()
    serializer_class = GradeSerializer


class TimetableViewSet(viewsets.ModelViewSet):
    serializer_class = TimetableSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Timetable.objects.select_related("course")
        user = self.request.user
        if is_admin(user):
            return queryset
        if user.role == User.Role.PROFESSOR:
            return queryset.filter(course__in=owned_courses(user))
        queryset = queryset.filter(course__enrollments__student__user=user).distinct()
        if self.request.query_params.get("course"):
            queryset = queryset.filter(course_id=self.request.query_params["course"])
        return queryset


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Notification.objects.all()
        if is_admin(self.request.user):
            return queryset
        return queryset.filter(target_role__in=[Notification.TargetRole.ALL, self.request.user.role])


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payload = UserSerializer(request.user).data
        if request.user.role == User.Role.STUDENT:
            profile = getattr(request.user, "student_profile", None)
            payload["profile"] = StudentSerializer(profile).data if profile else None
        elif request.user.role == User.Role.PROFESSOR:
            profile = getattr(request.user, "professor_profile", None)
            payload["profile"] = ProfessorSerializer(profile).data if profile else None
        return Response(payload)


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if is_admin(user):
            return Response({"role": "ADMIN", "metrics": {
                "students": Student.objects.count(), "professors": Professor.objects.count(),
                "courses": Course.objects.count(), "departments": Department.objects.count(),
                "enrollments": Enrollment.objects.count(),
            }, "notices": NotificationSerializer(Notification.objects.all()[:5], many=True).data})
        if user.role == User.Role.PROFESSOR:
            profile = getattr(user, "professor_profile", None)
            courses = Course.objects.filter(assigned_professor=profile).annotate(enrollment_count=Count("enrollments")) if profile else Course.objects.none()
            return Response({"role": "PROFESSOR", "profile": ProfessorSerializer(profile).data if profile else None,
                             "courses": CourseSerializer(courses, many=True).data,
                             "notices": NotificationSerializer(Notification.objects.filter(target_role__in=["ALL", "PROFESSOR"])[:5], many=True).data})
        profile = getattr(user, "student_profile", None)
        if not profile:
            return Response({"role": "STUDENT", "profile": None, "courses": [], "grades": [], "attendance": [], "timetable": [], "notices": []})
        enrollment_qs = Enrollment.objects.filter(student=profile).select_related("course", "course__department", "course__assigned_professor")
        courses = Course.objects.filter(enrollments__student=profile).select_related("department", "assigned_professor").annotate(enrollment_count=Count("enrollments"))
        records = Attendance.objects.filter(student=profile)
        attendance_counts = {
            item["course_id"]: item for item in records.values("course_id").annotate(
                total=Count("id"), present=Count("id", filter=Q(status=Attendance.Status.PRESENT)))
        }
        attendance_summary = []
        for course in courses:
            counts = attendance_counts.get(course.id, {"total": 0, "present": 0})
            total = counts["total"]
            present = counts["present"]
            attendance_summary.append({"course_id": course.id, "course_code": course.course_code,
                                      "course_name": course.course_name, "present": present, "total": total,
                                      "percentage": round(100 * present / total, 1) if total else None})
        return Response({"role": "STUDENT", "profile": StudentSerializer(profile).data,
                         "courses": CourseSerializer(courses, many=True).data,
                         "grades": GradeSerializer(Grade.objects.filter(student=profile).select_related("course"), many=True).data,
                         "attendance": attendance_summary,
                         "attendance_history": AttendanceSerializer(records.select_related("course")[:50], many=True).data,
                         "timetable": TimetableSerializer(Timetable.objects.filter(course__in=enrollment_qs.values("course_id")).select_related("course"), many=True).data,
                         "notices": NotificationSerializer(Notification.objects.filter(target_role__in=["ALL", "STUDENT"])[:10], many=True).data})


class BulkAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        if request.user.role not in (User.Role.ADMIN, User.Role.PROFESSOR):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only administrators and assigned professors can record attendance.")
        course_id = request.data.get("course")
        attendance_date = parse_date(request.data.get("date", ""))
        records = request.data.get("records", [])
        try:
            course = Course.objects.get(pk=course_id)
        except (Course.DoesNotExist, TypeError, ValueError):
            return Response({"course": "A valid course is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not attendance_date or not isinstance(records, list):
            return Response({"detail": "Provide a valid date and records array."}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.role == User.Role.PROFESSOR and not owned_courses(request.user).filter(pk=course.pk).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You may only record attendance for your assigned courses.")
        serializer = AttendanceSerializer(data=[{"course": course.pk, "student": item.get("student"), "date": attendance_date,
                               "status": item.get("status")} for item in records], many=True,
                          context={"allow_existing": True})
        serializer.is_valid(raise_exception=True)
        for item in serializer.validated_data:
            if not enrollment_exists(item["student"].pk, course.pk):
                return Response({"student": "Every student must be enrolled in the selected course."}, status=status.HTTP_400_BAD_REQUEST)
        saved = []
        for item in serializer.validated_data:
            record, _ = Attendance.objects.update_or_create(course=course, student=item["student"], date=attendance_date,
                                                             defaults={"status": item["status"]})
            saved.append(record)
        return Response(AttendanceSerializer(saved, many=True).data, status=status.HTTP_200_OK)
