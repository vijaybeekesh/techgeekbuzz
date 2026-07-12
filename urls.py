from django.urls import path
from .views import *
from .apiview import *

urlpatterns =[
                path("", communityView, name="community"),
                path("create/", createPostview, name= 'create-post'),
                path("edit/<str:slug>/",editPost ,name="editpost"),
                path('delete/<int:id>/', deletePost,name="deletepost"),
                path("post/<str:slug>/",postView, name="postview" ),
                path("deletecomment/<int:id>/", deleteComment, name ="deletecomment"),
                path('user/<str:username>/',communityUserProfile, name="communityuserprofile"),
                path('edit-profile/', updateUserProfile, name="update-profile"),
            ]


urlpatterns+=[
    path('api/loadposts/', loadposts, name="loadpostsapi"),
] 