"""tgbwebsite URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.0/topics/http/urls/
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
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .feed import LatestPostsFeed

from django.contrib.auth.decorators import login_required

from ckeditor_uploader.views import upload,browse
from django.views.decorators.cache import never_cache


# sitemap
from django.views.generic import TemplateView
from django.contrib.sitemaps import views
from .sitemaps import *

from .views import *

sitemaps = {
    'static': StaticSitemap,
    'blogs': BlogsSitemap,
    'tutorials': TutorialSitemap,
    'articles': TutorialArticleSitemap,
    'author': StaticAuthorSitemap,
    'webstories':WebStoriesSitemap,
    'tools': StaticToolsSitemap,
    'roadmap': RoadmapSitemap,
}

urlpatterns = [

    path('', homepage, name ="index"),
    path('admin-knows-the-url/', admin.site.urls),
    # sitemaps
    # path('sitemap.xml', sitemap, {'sitemaps': sitemaps}),
    path('sitemap.xml', views.index, {'sitemaps': sitemaps}),
    path('sitemap-<section>.xml', views.sitemap, {'sitemaps': sitemaps},name='django.contrib.sitemaps.views.sitemap'),
    path('robots.txt', TemplateView.as_view(template_name="layouts/robots.txt", content_type='text/plain')),
    path('ads.txt', TemplateView.as_view(template_name="layouts/ads.txt", content_type='text/plain')),
    path('advertise-with-us', advertise, name="advertise"),
    path('about', aboutus, name ="about"),
    path('privacy', privacy, name ="privacy"),
    path('term-and-condition', term_condition, name="term-and-condition"),
    path('write-for-us', write_for_us, name="writeforus"),
    path('requirements-for-guest-blog-article',guest_article_requirements, name= "guestarticlerequirements"),
    

    # blog 
    path('blog', include('blog.urls')),
    #tutorials 
    path('tutorial/', include('tutorial.urls')),
    path('roadmap/',include('roadmap.urls')),
    path('tools', include('tool.urls')),
    path('webstories/',include('webstories.urls')),
    # Search
    path('query/', search, name="search"),
    path('subscribe/',subscribe, name ="subscribe"),

    
    path('blog/feed/rss/', LatestPostsFeed(), name="blogfeed"),
    path("latest/posts/",latestposts, name="latestposts"),
    
]+ static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns+=path('ckeditor', include('ckeditor_uploader.urls')),
urlpatterns+= path('ckeditor/upload/', login_required(upload), name='ckeditor_upload'),
urlpatterns += path("ckeditor/browse/",never_cache(login_required(browse)),name="ckeditor_browse",),
urlpatterns+=path('<str:old_url>/', redirect_old, name ="redirect_old"),