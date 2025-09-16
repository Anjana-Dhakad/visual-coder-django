"""
URL configuration for visual_coder_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
"""
URL configuration for visual_coder_backend project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    # 1. Admin Panel ka URL
    path('admin/', admin.site.urls),

    # 2. API ka URL
    # Yeh line Django ko batati hai ki agar URL '/api/' se shuru hota hai,
    # toh request ko 'api.urls' file ke paas bhej do.
    path('api/', include('api.urls')),

    # 3. Flowchart to Code page
    path('flowchart-to-code/', TemplateView.as_view(template_name='flowchart-to-code.html'), name='flowchart_to_code'),

    # 4. React App ka URL (Catch-all)
    # Yeh line sabse aakhir mein aati hai.
    # Iska matlab hai ki agar URL upar kisi se match nahi hota,
    # toh use React app (index.html) ke paas bhej do.
    re_path(r'^.*', TemplateView.as_view(template_name='index.html')),
]