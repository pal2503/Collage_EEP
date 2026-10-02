from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import (Attendance, Course, Department, Enrollment, Grade, Notification,
                    Professor, Student, Timetable, User)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "first_name", "last_name"]
        read_only_fields = ["id", "role"]


class DepartmentSerializer(serializers.ModelSerializer):
    head_name = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ["id", "department_code", "department_name", "head_of_department", "head_name"]

    def get_head_name(self, obj):
        return str(obj.head_of_department) if obj.head_of_department else None


class StudentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    account_email = serializers.EmailField(source="user.email", read_only=True)
    account_username = serializers.CharField(source="user.username", read_only=True)
    department_name = serializers.CharField(source="department.department_name", read_only=True)

    class Meta:
        model = Student
        fields = ["id", "user", "username", "email", "password", "account_email", "account_username",
                  "student_id", "first_name", "last_name", "department", "department_name", "enrollment_year"]
        read_only_fields = ["id", "user"]

    def validate_username(self, value):
        users = User.objects.filter(username=value)
        if self.instance:
            users = users.exclude(pk=self.instance.user_id)
        if users.exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        users = User.objects.filter(email=value)
        if self.instance:
            users = users.exclude(pk=self.instance.user_id)
        if users.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        username = validated_data.pop("username")
        email = validated_data.pop("email")
        password = validated_data.pop("password")
        user = User.objects.create_user(username=username, email=email, password=password, role=User.Role.STUDENT,
                                        first_name=validated_data["first_name"], last_name=validated_data["last_name"])
        return Student.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        username = validated_data.pop("username", None)
        email = validated_data.pop("email", None)
        password = validated_data.pop("password", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        user_fields = False
        if username is not None:
            instance.user.username = username
            user_fields = True
        if email is not None:
            instance.user.email = email
            user_fields = True
        if password:
            instance.user.set_password(password)
            user_fields = True
        instance.user.first_name = instance.first_name
        instance.user.last_name = instance.last_name
        instance.user.save()
        return instance


class ProfessorSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    account_email = serializers.EmailField(source="user.email", read_only=True)
    account_username = serializers.CharField(source="user.username", read_only=True)
    department_name = serializers.CharField(source="department.department_name", read_only=True)

    class Meta:
        model = Professor
        fields = ["id", "user", "username", "email", "password", "account_email", "account_username",
                  "professor_id", "first_name", "last_name", "department", "department_name", "designation"]
        read_only_fields = ["id", "user"]

    def validate_username(self, value):
        users = User.objects.filter(username=value)
        if self.instance:
            users = users.exclude(pk=self.instance.user_id)
        if users.exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        users = User.objects.filter(email=value)
        if self.instance:
            users = users.exclude(pk=self.instance.user_id)
        if users.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        username = validated_data.pop("username")
        email = validated_data.pop("email")
        password = validated_data.pop("password")
        user = User.objects.create_user(username=username, email=email, password=password, role=User.Role.PROFESSOR,
                                        first_name=validated_data["first_name"], last_name=validated_data["last_name"])
        return Professor.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        username = validated_data.pop("username", None)
        email = validated_data.pop("email", None)
        password = validated_data.pop("password", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if username is not None:
            instance.user.username = username
        if email is not None:
            instance.user.email = email
        if password:
            instance.user.set_password(password)
        instance.user.first_name = instance.first_name
        instance.user.last_name = instance.last_name
        instance.user.save()
        return instance


class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.department_name", read_only=True)
    professor_name = serializers.SerializerMethodField()
    enrollment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Course
        fields = ["id", "course_code", "course_name", "credits", "department", "department_name",
                  "assigned_professor", "professor_name", "enrollment_count"]

    def get_professor_name(self, obj):
        return str(obj.assigned_professor) if obj.assigned_professor else None


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_id = serializers.CharField(source="student.student_id", read_only=True)
    course_name = serializers.CharField(source="course.course_name", read_only=True)
    course_code = serializers.CharField(source="course.course_code", read_only=True)

    class Meta:
        model = Enrollment
        fields = ["id", "student", "student_name", "student_id", "course", "course_name", "course_code", "enrollment_date"]
        read_only_fields = ["id", "enrollment_date"]

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}"


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    course_name = serializers.CharField(source="course.course_name", read_only=True)

    class Meta:
        model = Attendance
        fields = ["id", "course", "course_name", "student", "student_name", "date", "status"]

    def validate(self, attrs):
        course = attrs.get("course", getattr(self.instance, "course", None))
        student = attrs.get("student", getattr(self.instance, "student", None))
        date = attrs.get("date", getattr(self.instance, "date", None))
        if course and student and date and not self.context.get("allow_existing", False):
            existing = Attendance.objects.filter(course=course, student=student, date=date)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError("Attendance is already recorded for this student, course, and date.")
        return attrs

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}"


class GradeSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    course_name = serializers.CharField(source="course.course_name", read_only=True)
    course_code = serializers.CharField(source="course.course_code", read_only=True)

    class Meta:
        model = Grade
        fields = ["id", "course", "course_name", "course_code", "student", "student_name",
                  "marks_obtained", "total_marks", "letter_grade"]

    def validate(self, attrs):
        obtained = attrs.get("marks_obtained", getattr(self.instance, "marks_obtained", None))
        total = attrs.get("total_marks", getattr(self.instance, "total_marks", None))
        if obtained is not None and total is not None and obtained > total:
            raise serializers.ValidationError({"marks_obtained": "Marks cannot exceed total marks."})
        course = attrs.get("course", getattr(self.instance, "course", None))
        student = attrs.get("student", getattr(self.instance, "student", None))
        if course and student:
            existing = Grade.objects.filter(course=course, student=student)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError("A grade already exists for this student and course.")
        return attrs

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}"


class TimetableSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.course_name", read_only=True)
    course_code = serializers.CharField(source="course.course_code", read_only=True)

    class Meta:
        model = Timetable
        fields = ["id", "course", "course_name", "course_code", "day_of_week", "time_slot", "room_number"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "title", "message", "target_role", "created_at"]
        read_only_fields = ["id", "created_at"]
