from django.db import models
from django.contrib.auth import get_user_model
from PIL import Image
from django.utils import timezone
from django.utils.html import format_html
from django.urls import reverse



user = get_user_model()
# Create your models here.
class UserProfile(models.Model):
    desig = [('author', 'author'), ('editor','editor'), ('subscriber', 'subscriber')]
    user = models.OneToOneField(user, on_delete=models.CASCADE, related_name="profile", verbose_name="User",help_text="Select the User")
    profile_picture = models.ImageField(upload_to='profile_pictures', blank=True, verbose_name='Profile Picture')
    designation = models.CharField(max_length=20, choices=desig, blank=True, null=True, verbose_name="Role", help_text="Select The role")
    bio = models.TextField(blank=True, null=True, verbose_name="Users Bio")
    linkedin = models.CharField(max_length=200, blank=True, null=True)
    instagram = models.CharField(max_length=200, blank=True, null=True)
    facebook = models.CharField(max_length=200, blank=True, null=True)
    twitter= models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_absolute_url(self):
        return reverse('byuser',kwargs={'username':self.user})

    def __str__(self):
        return f"{self.user.username} Profile" 
    
    class Meta:
        verbose_name_plural  = "Users Profile"
    
    def save(self, * args, **kwargs):
        super().save( * args, **kwargs)
        if self.profile_picture:
            img= Image.open(self.profile_picture.path)

            if img.height>60 or img.width >60:
                output_size= (80,80)
                img.thumbnail(output_size)
                img.save(self.profile_picture.path)
    
    def image_tag(self):
         return format_html('<img src="{}" height=60px />'.format(self.profile_picture.url))
    image_tag.short_description =  f"Current Profile Picture"
    image_tag.allow_tags = True

class Subscriber(models.Model):
    user_email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user_email}"