from django.contrib import admin
from django.urls import path, include
from api import views as api_views  # api/views.py se saare views import karein

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Yeh aapke API endpoints ke liye hai, jaise /api/generate-flowchart/
    path('api/', include('api.urls')), 
    
    # Yeh NAYA path hai homepage ke liye. 
    # Khali path ('') ka matlab hai root URL.
    path('', api_views.index, name='homepage'), 

    path('code-to-flowchart/', api_views.code_to_flowchart_view, name='code_to_flowchart'),

    path('flowchart-to-code/', api_views.flowchart_to_code_view, name='flowchart_to_code'),
]