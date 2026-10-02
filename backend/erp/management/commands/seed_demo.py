from decimal import Decimal
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from erp.models import (
    Attendance,
    Course,
    Department,
    Enrollment,
    Grade,
    Notification,
    Professor,
    Student,
    Timetable,
    User,
)


class Command(BaseCommand):
    help = 'Create default demo records for the College ERP system.'

    @transaction.atomic
    def handle(self, *args, **options):
        UserModel = get_user_model()
        today = date.today()

        default_departments = [
            {'department_code': 'CSE', 'department_name': 'Computer Science and Engineering'},
            {'department_code': 'EEE', 'department_name': 'Electrical and Electronics Engineering'},
            {'department_code': 'BBA', 'department_name': 'Business Administration'},
        ]

        department_map = {}
        for item in default_departments:
            department, _ = Department.objects.get_or_create(
                department_code=item['department_code'],
                defaults={'department_name': item['department_name']},
            )
            department_map[item['department_code']] = department

        professor_defs = [
            {'username': 'drsmith', 'email': 'drsmith@northstar.edu', 'first_name': 'Rita', 'last_name': 'Smith', 'department': 'CSE', 'professor_id': 'P-1001', 'designation': 'Associate Professor'},
            {'username': 'profjones', 'email': 'profjones@northstar.edu', 'first_name': 'Daniel', 'last_name': 'Jones', 'department': 'EEE', 'professor_id': 'P-1002', 'designation': 'Senior Lecturer'},
            {'username': 'proffarmer', 'email': 'proffarmer@northstar.edu', 'first_name': 'Olivia', 'last_name': 'Farmer', 'department': 'BBA', 'professor_id': 'P-1003', 'designation': 'Professor'},
        ]

        professor_map = {}
        for professor_data in professor_defs:
            user, _ = UserModel.objects.get_or_create(
                username=professor_data['username'],
                defaults={
                    'email': professor_data['email'],
                    'first_name': professor_data['first_name'],
                    'last_name': professor_data['last_name'],
                    'role': UserModel.Role.PROFESSOR,
                    'is_active': True,
                },
            )
            if not user.email:
                user.email = professor_data['email']
            user.first_name = professor_data['first_name']
            user.last_name = professor_data['last_name']
            user.role = UserModel.Role.PROFESSOR
            user.is_active = True
            user.save(update_fields=['email', 'first_name', 'last_name', 'role', 'is_active'])

            professor, _ = Professor.objects.get_or_create(
                user=user,
                defaults={
                    'professor_id': professor_data['professor_id'],
                    'first_name': professor_data['first_name'],
                    'last_name': professor_data['last_name'],
                    'department': department_map[professor_data['department']],
                    'designation': professor_data['designation'],
                },
            )
            professor.first_name = professor_data['first_name']
            professor.last_name = professor_data['last_name']
            professor.department = department_map[professor_data['department']]
            professor.designation = professor_data['designation']
            professor.professor_id = professor_data['professor_id']
            professor.save()
            professor_map[professor_data['username']] = professor

        dept_head_candidates = {
            'CSE': professor_map['drsmith'],
            'EEE': professor_map['profjones'],
            'BBA': professor_map['proffarmer'],
        }
        for code, professor in dept_head_candidates.items():
            department = department_map[code]
            department.head_of_department = professor
            department.save(update_fields=['head_of_department'])

        student_defs = [
            {'username': 'studentali', 'email': 'ali@northstar.edu', 'first_name': 'Ali', 'last_name': 'Rahman', 'department': 'CSE', 'student_id': 'S-2001', 'enrollment_year': 2024},
            {'username': 'studentmaya', 'email': 'maya@northstar.edu', 'first_name': 'Maya', 'last_name': 'Chen', 'department': 'CSE', 'student_id': 'S-2002', 'enrollment_year': 2024},
            {'username': 'studentjohn', 'email': 'john@northstar.edu', 'first_name': 'John', 'last_name': 'Miller', 'department': 'EEE', 'student_id': 'S-2003', 'enrollment_year': 2023},
            {'username': 'studentmeera', 'email': 'meera@northstar.edu', 'first_name': 'Meera', 'last_name': 'Patel', 'department': 'BBA', 'student_id': 'S-2004', 'enrollment_year': 2025},
        ]

        student_map = {}
        for student_data in student_defs:
            user, _ = UserModel.objects.get_or_create(
                username=student_data['username'],
                defaults={
                    'email': student_data['email'],
                    'first_name': student_data['first_name'],
                    'last_name': student_data['last_name'],
                    'role': UserModel.Role.STUDENT,
                    'is_active': True,
                },
            )
            if not user.email:
                user.email = student_data['email']
            user.first_name = student_data['first_name']
            user.last_name = student_data['last_name']
            user.role = UserModel.Role.STUDENT
            user.is_active = True
            user.save(update_fields=['email', 'first_name', 'last_name', 'role', 'is_active'])

            student, _ = Student.objects.get_or_create(
                user=user,
                defaults={
                    'student_id': student_data['student_id'],
                    'first_name': student_data['first_name'],
                    'last_name': student_data['last_name'],
                    'department': department_map[student_data['department']],
                    'enrollment_year': student_data['enrollment_year'],
                },
            )
            student.first_name = student_data['first_name']
            student.last_name = student_data['last_name']
            student.department = department_map[student_data['department']]
            student.enrollment_year = student_data['enrollment_year']
            student.student_id = student_data['student_id']
            student.save()
            student_map[student_data['username']] = student

        course_defs = [
            {'course_code': 'CS101', 'course_name': 'Introduction to Programming', 'credits': 3, 'department': 'CSE', 'assigned_professor': 'drsmith'},
            {'course_code': 'CS201', 'course_name': 'Data Structures', 'credits': 4, 'department': 'CSE', 'assigned_professor': 'drsmith'},
            {'course_code': 'EE101', 'course_name': 'Circuit Analysis', 'credits': 3, 'department': 'EEE', 'assigned_professor': 'profjones'},
            {'course_code': 'BA101', 'course_name': 'Principles of Management', 'credits': 2, 'department': 'BBA', 'assigned_professor': 'proffarmer'},
        ]

        course_map = {}
        for course_data in course_defs:
            course, _ = Course.objects.get_or_create(
                course_code=course_data['course_code'],
                defaults={
                    'course_name': course_data['course_name'],
                    'credits': course_data['credits'],
                    'department': department_map[course_data['department']],
                    'assigned_professor': professor_map[course_data['assigned_professor']],
                },
            )
            course.course_name = course_data['course_name']
            course.credits = course_data['credits']
            course.department = department_map[course_data['department']]
            course.assigned_professor = professor_map[course_data['assigned_professor']]
            course.save()
            course_map[course_data['course_code']] = course

        enrollment_pairs = [
            ('S-2001', 'CS101'),
            ('S-2002', 'CS101'),
            ('S-2003', 'EE101'),
            ('S-2004', 'BA101'),
            ('S-2001', 'CS201'),
            ('S-2002', 'CS201'),
        ]
        for student_id, course_code in enrollment_pairs:
            student = Student.objects.get(student_id=student_id)
            course = Course.objects.get(course_code=course_code)
            Enrollment.objects.get_or_create(student=student, course=course)

        grade_entries = [
            ('S-2001', 'CS101', Decimal('91.00'), Decimal('100.00'), 'A'),
            ('S-2002', 'CS101', Decimal('86.00'), Decimal('100.00'), 'A'),
            ('S-2003', 'EE101', Decimal('78.00'), Decimal('100.00'), 'B'),
            ('S-2004', 'BA101', Decimal('92.00'), Decimal('100.00'), 'A'),
            ('S-2001', 'CS201', Decimal('88.00'), Decimal('100.00'), 'A'),
            ('S-2002', 'CS201', Decimal('80.00'), Decimal('100.00'), 'B'),
        ]
        for student_id, course_code, marks, total, letter in grade_entries:
            student = Student.objects.get(student_id=student_id)
            course = Course.objects.get(course_code=course_code)
            Grade.objects.update_or_create(
                course=course,
                student=student,
                defaults={'marks_obtained': marks, 'total_marks': total, 'letter_grade': letter},
            )

        timetable_defs = [
            ('CS101', 'MONDAY', '09:00-10:30', 'C-204'),
            ('CS101', 'WEDNESDAY', '09:00-10:30', 'C-204'),
            ('CS201', 'TUESDAY', '11:00-12:30', 'C-305'),
            ('EE101', 'THURSDAY', '10:00-11:30', 'E-112'),
            ('BA101', 'FRIDAY', '14:00-15:30', 'B-201'),
        ]
        for course_code, day, slot, room in timetable_defs:
            course = Course.objects.get(course_code=course_code)
            Timetable.objects.get_or_create(course=course, day_of_week=day, time_slot=slot, room_number=room)

        attendance_statuses = ['PRESENT', 'PRESENT', 'ABSENT', 'PRESENT', 'PRESENT']
        for course_code, enrolled_students in [
            ('CS101', [Student.objects.get(student_id='S-2001'), Student.objects.get(student_id='S-2002')]),
            ('CS201', [Student.objects.get(student_id='S-2001'), Student.objects.get(student_id='S-2002')]),
            ('EE101', [Student.objects.get(student_id='S-2003')]),
            ('BA101', [Student.objects.get(student_id='S-2004')]),
        ]:
            course = Course.objects.get(course_code=course_code)
            for idx, student in enumerate(enrolled_students):
                for offset in range(4):
                    record_date = today - timedelta(days=offset + 1)
                    Attendance.objects.get_or_create(
                        course=course,
                        student=student,
                        date=record_date,
                        defaults={'status': attendance_statuses[idx % len(attendance_statuses)]},
                    )

        notifications = [
            { 'title': 'Welcome Week Orientation', 'message': 'All students are invited to the campus orientation program on Friday at 10:00 AM in the main auditorium.', 'target_role': 'ALL' },
            { 'title': 'Midterm Exam Schedule', 'message': 'The midterm timetable is now available for departments and students on the portal.', 'target_role': 'STUDENT' },
            { 'title': 'Faculty Meeting', 'message': 'All faculty members are requested to attend the academic planning meeting this Wednesday.', 'target_role': 'PROFESSOR' },
        ]
        for payload in notifications:
            Notification.objects.get_or_create(
                title=payload['title'],
                defaults={'message': payload['message'], 'target_role': payload['target_role']},
            )

        count = (
            Department.objects.count()
            + Professor.objects.count()
            + Student.objects.count()
            + Course.objects.count()
            + Enrollment.objects.count()
            + Attendance.objects.count()
            + Grade.objects.count()
            + Timetable.objects.count()
            + Notification.objects.count()
        )

        self.stdout.write(self.style.SUCCESS(f'Demo ERP data created successfully. Total sample records: {count}'))
