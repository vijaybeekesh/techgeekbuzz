from django.urls import path
from .views import *

urlpatterns=[
        path("", allStories, name="allstories"),
        path("<str:slug>/", story, name="story")
    ]
#something