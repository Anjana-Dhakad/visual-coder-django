from django.urls import path
from . import views

urlpatterns = [
    # Yahan par humne name='home' add kiya hai
    path('', views.index, name='home'), 
    path('flowchart-to-code/', views.flowchart_to_code_view, name='flowchart-to-code'),
]