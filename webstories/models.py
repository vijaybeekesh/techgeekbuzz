from email.policy import default
from django.db import models
from django.utils.text import slugify
from django.utils import timezone
from django.utils.html import format_html
from django.urls import reverse


from PIL import Image

 
# Create your models here.
class WebStory(models.Model):
    title = models.CharField(max_length= 200,blank=True,null=True, unique=True)
    date_posted = models.DateTimeField(auto_now_add=True)
    post_url = models.CharField(max_length =200, blank=True,verbose_name = "Post Link", null=True)
    slug = models.SlugField(max_length=200,unique=True, verbose_name="URL", blank=True , null=True, help_text="Please enter the url for the webstory eg python-story ")
    status = models.CharField(max_length=7 , choices=[('draft', 'drafted'), ('publish', 'published')], default='draft')
    seoTitle = models.CharField(max_length=200, default="Unknown", blank=True,null=True ,verbose_name="SEO Title")
    seoDescription = models.TextField(max_length=1000, default="Unknown", blank=True,null=True, verbose_name='SEO Description')
    seoKeywords = models.CharField(max_length=200, default="Unknown", blank=True,null=True, verbose_name="SEO Keywords")
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, * args, **kwargs):
        if not self.slug:
            self.slug= slugify(self.title)
        super().save( * args, **kwargs)
    
    def __str__(self):
        return f'{self.title} {self.date_posted}'

    def get_absolute_url(self):
        return  reverse('story',kwargs={'slug':self.slug})


class Story(models.Model):
    post = models.ForeignKey(WebStory, on_delete=models.CASCADE, related_name="story", null=True, blank=True)  
    title = models.CharField(max_length=200,blank=True,null=True)
    description = models.TextField(blank=True,null=True)
    coverimage = models.ImageField(upload_to='story_images', blank=True, verbose_name='Cover Image')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def image_tag(self):
         return format_html('<img src="{}" height=200px />'.format(self.coverimage.url))
    
    image_tag.short_description =  f"Image"
    image_tag.allow_tags = True

    def save(self, * args, **kwargs):
        super().save( * args, **kwargs)
        img= Image.open(self.coverimage.path)

        if img.height>1280 or img.width >720:
            output_size= (720,1280)
            img.thumbnail(output_size)
            img.save(self.coverimage.path)

    def __str__(self):
        return f"{self.title} {self.id}"