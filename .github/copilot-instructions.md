# Workspace instructions

- This repository contains a Django REST Framework API in `backend/` and a React 19/Vite frontend in `frontend/`.
- Keep API role and ownership checks in backend permissions/querysets; frontend route guards are usability controls, not security boundaries.
- Use Django ORM models and serializers for schema/API changes. Generate and commit migrations with `python manage.py makemigrations`.
- Use React function components, hooks, Axios via `src/services/api.js`, and Lucide icons. Keep pages responsive and consistent with the dark glass UI.
- Validate changes with `python manage.py test erp` and `npm run build` when dependencies are installed.
- Setup, run, API, and production guidance is maintained in `README.md`.
