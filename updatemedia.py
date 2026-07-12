import os
from datetime import datetime
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgbwebsite.settings')

import django
django.setup()
from blog.models import Post
from tutorial.models import TutorialArticle

posts = TutorialArticle.objects.all()

for post in posts:
    post.content = post.content.replace(r"https://www.techgeekbuzz.com/wp-content/", r"/media/post_images/")
    post.save()