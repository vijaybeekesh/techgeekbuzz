from django.urls import path
from django.views.generic.base import RedirectView
from .views import *

urlpatterns=[
                # canonical, no trailing slash
                path('', posts, name = 'posts'),
                path('/category/<str:category>/', bycategory, name = 'postbycategory'),
                path('/author/<str:username>/', byuser, name="byuser"),
                path('/<slug>', postdetail, name="postdetail"),

                # trailing-slash variants redirect (301) to the canonical no-slash URL
                path('/', RedirectView.as_view(pattern_name='posts', permanent=True, query_string=True)),
                path('/<slug>/', RedirectView.as_view(pattern_name='postdetail', permanent=True, query_string=True)),
    ]