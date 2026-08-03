from django.contrib.sitemaps import Sitemap
from django.shortcuts import reverse
from blog.models import *
from tutorial.models import *
from users.models import *
from roadmap.models import *
from webstories.models import *
from django.contrib.auth.models import User

# homepage sitemap
class StaticSitemap(Sitemap):
    def items(self):
        return ['index','about','term-and-condition','privacy','advertise','tools']
    def location(self, item):
        return reverse(item)

# author profile sitemap
class StaticAuthorSitemap(Sitemap):
    def items(self):
        all_user = UserProfile.objects.all()
        posts = Post.objects.filter(status='publish')
        post_data = [post.author for post in posts]
        user_list = [i.user for i in all_user]
        matched_user = [user for user in user_list if user in post_data]
        users = UserProfile.objects.filter(user__in=matched_user)
        return users
    def lastmod(self, obj):
        return obj.updated_at

# blog stitemaps
class BlogsSitemap(Sitemap):
    changefreq = "always"
    priority = 1.0
    def items(self):
        return Post.objects.all().filter(status='publish')
    def lastmod(self, obj):
        return obj.post_updated

# Tutorial stitemaps
class TutorialSitemap(Sitemap):
    def items(self):
        return Tutorial.objects.all()
    def lastmod(self, obj):
        return obj.updated_at

# Tutorial Article
# blog stitemaps
class TutorialArticleSitemap(Sitemap):
    def items(self):
        return TutorialArticle.objects.all().filter(status='publish')
    def lastmod(self, obj):
        return obj.updated_at

# Roadmap stitemaps
class RoadmapSitemap(Sitemap):
    def items(self):
        return RoadMap.objects.all()
    def lastmod(self, obj):
        return obj.updated_at

# tools roadmap
class StaticToolsSitemap(Sitemap):
    def items(self):
        return ['broken-links-checker','password-generator','xmltojson','gst-calculator','markdown-to-html']
    def location(self, item):
        return reverse(item)

# stories sitemap
class StaticWebstoriesSitemap(Sitemap):
    def items(self):
        return ['allstories']
    def location(self, item):
        return reverse(item)

class StaticSitemapForWebstories(Sitemap):
    def items(self):
        return ['webstories']
    def location(self, item):
        return reverse(item)

class WebStoriesSitemap(Sitemap):
    changefreq = "always"
    priority = 1.0

    def items(self):
        return WebStory.objects.all().filter(status='publish')
    def lastmod(self, obj):
        return obj.date_posted