from django.urls import path 
from .views import *
urlpatterns = [
    path("", roadmaps, name="roadmaps"),
    path("<str:slug>/", roadmap_detail, name="roadmap_detail"),
    ]