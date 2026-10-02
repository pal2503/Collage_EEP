from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (AttendanceViewSet, BulkAttendanceView, CourseViewSet, CurrentUserView,
                    DashboardView, DepartmentViewSet, EnrollmentViewSet, GradeViewSet,
                    NotificationViewSet, ProfessorViewSet, StudentViewSet, TimetableViewSet)

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("students", StudentViewSet, basename="student")
router.register("professors", ProfessorViewSet, basename="professor")
router.register("courses", CourseViewSet, basename="course")
router.register("enrollments", EnrollmentViewSet, basename="enrollment")
router.register("attendance", AttendanceViewSet, basename="attendance")
router.register("grades", GradeViewSet, basename="grade")
router.register("timetable", TimetableViewSet, basename="timetable")
router.register("notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", CurrentUserView.as_view(), name="current_user"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("attendance/bulk/", BulkAttendanceView.as_view(), name="attendance_bulk"),
    path("", include(router.urls)),
]
