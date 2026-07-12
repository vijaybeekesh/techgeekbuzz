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

def validate_tags(value):
    for i in '!"#$%&\'()*+-./:;<=>?@[\\]^_`{|}~':
        if i in value:
            raise ValidationError(
            (f'The tag should not contain any special chracter (except comma ,)'),
            params={'value': value},
        )

User = get_user_model()

#all categories
class Category(models.Model):
    category_name = models.CharField(max_length=200, unique=True)
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category_name']


    def __str__(self):
        return self.category_name


#All posts
class Post(models.Model):
    title = models.CharField(max_length= 200, unique=True)
    content = RichTextUploadingField(blank=True, null=True)
    date_posted = models.DateTimeField(auto_now_add=True)
    author = models.ForeignKey(User, on_delete= models.SET_NULL,blank=True, null=True, related_name='posts')
    slug = models.SlugField(max_length=200,unique=True, verbose_name="URL", blank=True , null=True, help_text="Please enter the url for the blog eg python-introduction ")
    featured_image = models.ImageField(upload_to='new_post_images', blank=True, verbose_name='Featured Image')
    tags = models.CharField(max_length=200,
                            blank=True, 
                            null=True, 
                            help_text="The tags should be in this format tag1, tag2, tag3,",
                            validators=[validate_tags])    
    category = models.ManyToManyField(Category,default="Uncategorized", related_name='posts', blank=True)
    status = models.CharField(max_length=7 , choices=[('draft', 'drafted'), ('publish', 'published')], default='draft')
    seoTitle = models.CharField(max_length=200, default="Unknown", blank=True,null=True ,verbose_name="SEO Title")
    seoDescription = models.TextField(max_length=1000, default="Unknown", blank=True,null=True, verbose_name='SEO Description')
    seoKeywords = models.CharField(max_length=200, default="Unknown", blank=True,null=True, verbose_name="SEO Keywords")
    # view_count= models.PositiveIntegerField(default=0)
    paralinks = models.TextField(blank=True, null=True, verbose_name='Post old Slugs')
    post_updated = models.DateTimeField(auto_now=True)

    def get_absolute_url(self):
        return reverse('postdetail',kwargs={'slug':self.slug})

    def __str__(self):
        return self.title
    
    def save(self, * args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        
        if self.pk is not None:
            original = Post.objects.get(pk=self.pk)
            if self.paralinks:
                if not original.slug in self.paralinks:
                    self.paralinks += f" {original.slug}"
            if not self.paralinks:
                self.paralinks = f"{original.slug}"
        
        if self.tags:
            self.tags = self.tags.split(',')
            self.tags = list(map(lambda x: x.lower().strip(),self.tags))
            self.tags = ",".join(self.tags)

        if not self.paralinks:
            if self.slug:
                self.paralinks =self.slug
            else:
                self.paralinks =slugify(self.title)

        if self.paralinks:
            if self.slug not in self.paralinks:
                self.paralinks += f" {self.slug}"

        super(Post, self).save(*args, **kwargs)
    
    @admin.display
    def featured_images(self):
        if self.featured_image:
            return format_html(
                '<img src={} style="width: 6rem; height:3rem;" />',
                self.featured_image.url
            )
    @admin.display
    def categories(self):
        if self.category:
            return format_html( " ".join([category.category_name for category in self.category.all()]))
    
    def image_tag(self):
         return format_html('<img src="{}" height=200px />'.format(self.featured_image.url))
    image_tag.short_description =  f"Current Featured Image"
    image_tag.allow_tags = True

    class Meta:
        verbose_name_plural  = "All Posts"
        ordering = ['-date_posted']


    # def save(self, * args, **kwargs):
    #     super().save( * args, **kwargs)
    #     img= Image.open(self.image.path)

    #     if img.height>730 or img.width >1095:
    #         output_size= (1095,730)
    #         img.thumbnail(output_size)
    #         img.save(self.image.path)


class BlogStats(models.Model):
    blog = models.OneToOneField(Post, on_delete=models.CASCADE, related_name="stats")
    views = models.PositiveIntegerField(default=0)
    likes = models.PositiveIntegerField(default=0)
    shares = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "blog_stats"

    def __str__(self):
        return f"Stats for {self.blog.title}"

    def increment_views(self):
        self.views = models.F("views") + 1
        self.save(update_fields=["views"])
        self.refresh_from_db(fields=["views"])  # make sure latest value is loaded
        return self.views

    def increment_likes(self):
        self.likes = models.F("likes") + 1
        self.save(update_fields=["likes"])
        self.refresh_from_db(fields=["likes"])
        return self.likes

    def increment_shares(self):
        self.shares = models.F("shares") + 1
        self.save(update_fields=["shares"])
        self.refresh_from_db(fields=["shares"])
        return self.shares

#Comments on every post
class Comment(models.Model):
    authorize_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_comments', blank=True, null=True)
    post = models.ForeignKey(Post,on_delete = models.CASCADE, related_name='comments')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, related_name= "reply", blank=True, null=True)
    email = models.EmailField(blank = True, null =True)
    name = models.CharField(max_length=200)
    date_posted = models.DateTimeField(auto_now_add=True)
    message = models.TextField()
    approved_comment = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def approve(self):
        self.approved_comment= True
        self.save()

    def get_absolute_url(self):
        return reverse('postdetail',kwargs={'slug':self.post.slug})


    @admin.display
    def posts(self):
        return f"{self.post}"

    class Meta:
        verbose_name_plural  = "All Comments"
        ordering = ['-date_posted']

    def __str__(self):
        return f'{self.message[:30]} by {self.name}'


class Faq(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="faqs", null=True, blank=True)  
    question = models.CharField(max_length=200)
    answer = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"question {self.id}"