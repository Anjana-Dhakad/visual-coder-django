from django.urls import path
from . import views

urlpatterns = [
    # Jab koi http://.../api/generate-flowchart/ par request karega,
    # toh views.generate_flowchart function chalega.
    path('generate-flowchart/', views.generate_flowchart, name='generate_flowchart'),
]