from django.urls import path
from .views import *
urlpatterns = [
                path('<str:tutorial>/', tutorialintro, name="tutorialintro" ),
                path("<str:tutorial>/<str:slug>/", tutorialdetail, name='tutorialdetail'),
            ]