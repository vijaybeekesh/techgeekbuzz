from django.contrib.syndication.views import Feed
from django.urls import reverse_lazy
from blog.models import Post

class LatestPostsFeed(Feed):
    title = "Techgeekbuzz Blogs Site news"
    link = "/latest/posts/"
    description="The latest blog posts on the Techgeekbuzz.com"
    feed_copyright = 'Copyright (c) 2022, TechGeekBuzz'

    def items(self):
        return Post.objects.order_by("-date_posted")[:20]
    
    def item_title(self, item):
        return item.seoTitle if item.seoTitle else item.title
    
    def item_description(self, item):
        return item.seoDescription if item.seoDescription else item.content[:30]
    
    def item_pubdate(self, item):
        return item.date_posted
    
    def item_updateddate(self, item):
        return item.post_updated