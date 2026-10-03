from django.contrib import admin
from django.urls import include, path
from django.views.generic.base import RedirectView

urlpatterns = [
    path("", RedirectView.as_view(url="/api/", permanent=False), name="api-root"),
    path("django-admin/", admin.site.urls),
    path("api", include("erp.urls")),
    path("api/", include("erp.urls")),
]
