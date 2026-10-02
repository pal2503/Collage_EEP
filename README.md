# Northstar College ERP

A full-stack academic management application with role-scoped administrator, professor, and student portals. The backend uses Django REST Framework and JWT authentication; the responsive React 19 frontend is built with Vite, Tailwind CSS, and Lucide icons.

## Requirements

- Python 3.10+
- Node.js 20+
- npm
- PostgreSQL is optional; SQLite is used by default.

## Backend setup (PowerShell)

From the repository root:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
Copy-Item .env.example .env
Set-Location backend
py manage.py makemigrations erp
py manage.py migrate
py manage.py create_admin --username campusadmin --email admin@example.edu
py manage.py runserver
```

The administrator command securely prompts for a password. Do not use a real account password in a command-line argument. The API is served at `http://127.0.0.1:8000/api/`; the Django admin site is at `/django-admin/`.

## Frontend setup

In a second terminal at the repository root:

```powershell
Set-Location frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). Set `VITE_API_URL` in `frontend/.env.local` if the API runs elsewhere. The root `.env` controls Django; set a long random `DJANGO_SECRET_KEY` before deployment. For PostgreSQL, set `DATABASE_URL` to a PostgreSQL connection URL.

## Main capabilities

- JWT login, refresh, current-user lookup, and role-protected frontend routes.
- Admin CRUD for students, professors, courses, departments, and course enrollments, plus academic structure metrics.
- Professor course rosters, daily bulk attendance entry, and per-course grade management.
- Student profile and course overview, course grades, attendance summaries/history, schedules, and role-targeted notices.
- Role- and ownership-scoped API querysets; unauthorized writes return 403 and unauthenticated requests return 401.

## API overview

- `POST /api/auth/token/` and `POST /api/auth/token/refresh/`
- `GET /api/auth/me/` and `GET /api/dashboard/`
- REST resources: `/api/departments/`, `/api/students/`, `/api/professors/`, `/api/courses/`, `/api/enrollments/`, `/api/attendance/`, `/api/grades/`, `/api/timetable/`, `/api/notifications/`
- `POST /api/attendance/bulk/` records or updates a course register for one date.

The default database is SQLite. To use PostgreSQL, configure `DATABASE_URL`, then run migrations. Create a fresh initial migration with `py manage.py makemigrations erp` after activating the backend environment; generated migrations should be committed with schema changes.

## Tests and production notes

Run backend tests with `py manage.py test erp` from `backend/`; run the frontend production build with `npm run build` from `frontend/`. Before production, set `DJANGO_DEBUG=False`, configure a secure secret, allowed hosts, HTTPS, and `CORS_ALLOWED_ORIGINS`, and use PostgreSQL plus a production static-file strategy. No default/demo credentials are included.


<!-- 
AI Solutions - Student and Staff performance reports, Exam Genie for question paper preparation, Carrer Guru for Student Carrer guidence
Student Admission & Enrollment Management
Course & Subject Allocation
Faculty Scheduling & Workload Management
Attendance Management (Online & Offline)
Exam Scheduling, Evaluation & Grade Management
Online Fee Collection & Financial Accounting
Library, Hostel, and Transport Automation
Accreditation Reports (NAAC, NBA, AICTE, UGC)
Placement & Internship Management
Inventory Stock Management
Management of - Purchase request, Purchase Order, Work Order
Event Management
Health care Management
Mess Management Software
Mobile App for Students, Faculty, and Parents -->