from bs4 import BeautifulSoup
import os
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgbwebsite.settings')

import django
django.setup()
from blog.models import Post, Category
from tutorial.models import TutorialArticle
from django.contrib.auth.models import User

with open('NewAllPostDataWithStatus.xml', 'r',  encoding="utf8") as f:
    data = f.read()

soup = BeautifulSoup(data, 'xml')

datas = soup.find_all('post')

for index, data in enumerate(datas):
    title= content=status=slug=date=image_url= tags =seo_title=seo_description=Permalink=None
    tutorial = TutorialArticle.objects.filter(title=title)
    if tutorial:
        continue
    if data.find('Title').string:
        title = data.find('Title').string
    if data.find('Content').string:
        content =data.find('Content').string
    if data.find('Status').string:
        status = data.find('Status').string
    if data.find('Slug').string:
        slug= data.find('Slug').string
    if data.find('Date').string:
        date = data.find('Date').string
        date = datetime.strptime(date, '%Y-%m-%d')
    if data.find('ImageFeatured').string:
        image_url = data.find('ImageFeatured').string.replace(r"https://www.techgeekbuzz.com/wp-content/", r"post_images/")
    if data.find('Categories').string:
        categories = data.find('Categories').string.replace('|','>').split('>')
    if data.find('Tags').string:
        tags = data.find('Tags').string.replace('|','>').split('>')
        tags = ", ".join(tags)
    if data.find('_yoast_wpseo_title').string:
        seo_title = data.find('_yoast_wpseo_title').string
    if  data.find('_yoast_wpseo_metadesc').string:
        seo_description = data.find('_yoast_wpseo_metadesc').string.replace('|','>')
    if  data.find('Permalink').string:
        paralink =  data.find('Permalink').string
    
    if data.find('AuthorUsername').string:
        user = data.find('AuthorUsername').string
        user = User.objects.filter(username=user).first()
    else:
        user = User.objects.all()[0]
    post = Post(title=title,
                content= content,
                date_posted=date,
                author= user,
                slug= slug,
                featured_image= image_url,
                tags= tags,
                status= status,
                seoTitle= seo_title,
                seoDescription = seo_description,
                paralinks= paralink
                )
    post.save()

    


    for category in categories:
        cat = Category.objects.get_or_create(category_name=category)[0]
        post.category.add(cat)
    
    print("Complete -->",index,"out of ", len(datas), title)