from django.urls import path
from .views import *

urlpatterns=[
                path('', posts, name = 'posts'),
                path('<slug>/', postdetail, name="postdetail"),
                path('category/<str:category>/', bycategory, name = 'postbycategory'),
                path('author/<str:username>/', byuser, name="byuser")
    ]

#something