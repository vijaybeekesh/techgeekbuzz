from django.db import models
# Create your models here.
from django.utils import timezone
from PIL import Image
from ckeditor_uploader.fields import RichTextUploadingField
import datetime
from django.contrib import admin
from django.urls import reverse
from django.contrib.auth import  get_user_model
from django.utils.html import format_html
from django.utils.text import slugify
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
import time

user = get_user_model()

# Create your models here.
class CommunityUserProfile(models.Model):
    desig = [('author', 'author'), ('editor','editor'), ('subscriber', 'subscriber'), ('user', 'user')]
    user = models.OneToOneField(user, on_delete=models.CASCADE, related_name="community_profile", verbose_name="User",help_text="Select the User")
    profile_picture = models.ImageField(upload_to='community_profile_pictures', blank=True, verbose_name='Profile Picture')
    display_name = models.CharField(max_length=200, blank=True, null=True, help_text="Display Name")
    designation = models.CharField(max_length=20, choices=desig, blank=True, null=True, verbose_name="Role", help_text="Select The role")
    show_email = models.BooleanField(default=True, help_text="Show email on the profile page")
    bio = models.TextField(max_length=350, blank=True, null=True, verbose_name="Bio")
    linkedin = models.CharField(max_length=200, blank=True, null=True)
    instagram = models.CharField(max_length=200, blank=True, null=True)
    facebook = models.CharField(max_length=200, blank=True, null=True)
    twitter= models.CharField(max_length=200, blank=True, null=True)
    github= models.CharField(max_length=200, blank=True, null=True)
    stackoverflow= models.CharField(max_length=200, blank=True, null=True)
    website= models.CharField(max_length=200, blank=True, null=True)
    skills = models.TextField(max_length=350, blank=True, null=True)
    location = models.CharField(max_length=200,blank=True, null=True)
    work = models.CharField(max_length=200, null=True, blank=True, help_text="Work at")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # def get_absolute_url(self):
    #     return reverse('byuser',kwargs={'username':self.user})

    def __str__(self):
        return f"{self.user.username} Profile" 
    
    class Meta:
        verbose_name_plural  = "Community Users Profile"
    
    def save(self, * args, **kwargs):
        super().save( * args, **kwargs)
        if self.profile_picture:
            img= Image.open(self.profile_picture.path)

            if img.height>60 or img.width >60:
                output_size= (200,200)
                img.thumbnail(output_size)
                img.save(self.profile_picture.path)
    
    def image_tag(self):
         return format_html('<img src="{}" height=60px />'.format(self.profile_picture.url))
    image_tag.short_description =  f"Current Profile Picture"
    image_tag.allow_tags = True


class Tags(models.Model):
    tag_name = models.CharField(max_length=200)
    tag_url = models.SlugField(unique=True)
    tag_description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.tag_name

class CommunityPost(models.Model):
    title = models.CharField(max_length= 200, unique=True)
    content = RichTextUploadingField(config_name="community_editor")
    date_posted = models.DateTimeField(auto_now_add=True)
    tags = models.ManyToManyField(Tags, blank=True, help_text="You can only tag 5 Tags")
    author = models.ForeignKey(user, on_delete= models.SET_NULL,blank=True, null=True, related_name='community_posts')
    slug = models.SlugField(max_length=200,unique=True, verbose_name="URL", blank=True , null=True, help_text="Please enter the url for the blog eg python-introduction ")
    featured_image = models.ImageField(upload_to='community_post_images', blank=True, verbose_name='Featured Image')  
    status = models.CharField(max_length=7 , choices=[('draft', 'drafted'), ('publish', 'published')], default='draft')
    seoTitle = models.CharField(max_length=200, default="Unknown", blank=True,null=True ,verbose_name="SEO Title")
    seoDescription = models.TextField(max_length=1000, default="Unknown", blank=True,null=True, verbose_name='SEO Description')
    seoKeywords = models.CharField(max_length=200, default="Unknown", blank=True,null=True, verbose_name="SEO Keywords")
    view_count= models.PositiveIntegerField(default=0)
    post_updated = models.DateTimeField(auto_now=True)

    def get_absolute_url(self):
        return reverse('postview',kwargs={'slug':self.slug})

    def __str__(self):
        return self.title
    
    def save(self, * args, **kwargs):
        
        super(CommunityPost, self).save(*args, **kwargs)
        if self.featured_image:
            img= Image.open(self.featured_image.path)
            if img.height>500 or img.width >800:
                output_size= (800,500)
                img.thumbnail(output_size)
                img.save(self.featured_image.path)
        if not self.slug:
            self.slug = slugify(self.title[:180]) + f"-{self.id}"
            super(CommunityPost, self).save(*args, **kwargs)
    
    @admin.display
    def featured_images(self):
        if self.featured_image:
            return format_html(
                '<img src={} style="width: 6rem; height:3rem;" />',
                self.featured_image.url
            )
    
    def image_tag(self):
         return format_html('<img src="{}" height=200px />'.format(self.featured_image.url))
    image_tag.short_description =  f"Current Featured Image"
    image_tag.allow_tags = True

    class Meta:
        verbose_name_plural  = "All Community Posts"
        ordering = ['-date_posted']


    # def save(self, * args, **kwargs):
    #     super().save( * args, **kwargs)
    #     img= Image.open(self.image.path)

    #     if img.height>730 or img.width >1095:
    #         output_size= (1095,730)
    #         img.thumbnail(output_size)
    #         img.save(self.image.path)



#Comments on every post
class Comment(models.Model):
    user = models.ForeignKey(user, on_delete=models.CASCADE, related_name='user_community_comments', blank=True, null=True)
    post = models.ForeignKey(CommunityPost,on_delete = models.CASCADE, related_name='comments')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, related_name= "reply", blank=True, null=True)
    date_posted = models.DateTimeField(auto_now_add=True)
    comment =  RichTextUploadingField(config_name="comment_editor")
    approved_comment = models.BooleanField(default=False)

    def approve(self):
        self.approved_comment= True
        self.save()

    # def get_absolute_url(self):
    #     return reverse('postdetail',kwargs={'slug':self.post.slug})


    @admin.display
    def posts(self):
        return f"{self.post}"

    class Meta:
        verbose_name_plural  = "All Comments"
        ordering = ['-date_posted']

    def __str__(self):
        return f'{self.comment[:30]} by {self.user}'