from django.urls import path, include
from .views import *
from .api.views import *
urlpatterns = [
    path("", tools, name = "tools"),
    path("/broken-links-checker", brokenlinkschecker, name="broken-links-checker"),
    path('/password-generator', passwordgenerator, name ="password-generator"),
    path('/xml-to-json', xmltojson, name ="xmltojson"),

    # apis urls
    path("/api/broken-links-checker/",brokenlinkschecker_api, name="broken-links-checker-api"),
]