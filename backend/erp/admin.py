from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Attendance, Course, Department, Enrollment, Grade, Notification, Professor, Student, Timetable, User

admin.site.register(User, UserAdmin)
admin.site.register([Department, Student, Professor, Course, Enrollment, Attendance, Grade, Timetable, Notification])
