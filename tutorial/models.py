from django.db import models
from ckeditor_uploader.fields import RichTextUploadingField
from django.utils import timezone
from django.contrib import admin
from django.urls import reverse
from django.contrib.auth import  get_user_model
from django.utils.html import format_html
from django.utils.text import slugify
from django.utils import timezone
from django.urls import reverse


# Create your models here.
class Tutorial(models.Model):
    name = models.CharField(max_length= 100, unique=True, verbose_name="Tutorial Name")
    description = models.TextField(verbose_name="Tutorial Intro", blank=True, null=True)
    image = models.ImageField(upload_to="tutorial_image",blank=True, null=True, verbose_name="Tutorial Icon")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    @admin.display
    def tutorial_icon(self):
        if self.image:
            return format_html(
                '<img src={} style="width: 3rem; height:3rem; border-radius:50%; background-color:#006cff;"/>',
                self.image.url
            )
    
    def image_tag(self):
         return format_html('<img src="{}" height=40px style="background-color:#006cff;"/>'.format(self.image.url))
    image_tag.short_description =  f"Current Tutorial Icon"
    image_tag.allow_tags = True

    def __str__(self):
        return self.name
    
    def get_absolute_url(self):
        return reverse('tutorialintro', kwargs={'tutorial':self.name.lower().replace(" ", "-")})


#tutorial sub category
class TutorialCategory(models.Model):
    tutorial = models.ForeignKey(Tutorial, on_delete = models.CASCADE, related_name='tutorialcategory', verbose_name='Select Tutorial')
    category = models.CharField(max_length=200, verbose_name="Category Name")
    category_number = models.PositiveIntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"{self.tutorial.name} {self.category}"   
    class Meta:
        unique_together = ['tutorial', 'category', 'category_number']

#tutorial Examples
class TutorialExamples(models.Model):
    tutorial = models.ForeignKey(Tutorial, on_delete = models.CASCADE, related_name='tutorialExamples', verbose_name='Select Tutorial')
    exampletitle = models.CharField(max_length=200, verbose_name="Example Title")
    examplelink = models.CharField(max_length=200, verbose_name="Example Link")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"{self.tutorial.name} {self.exampletitle}"   
    class Meta:
        unique_together = ['tutorial', 'exampletitle', 'examplelink']

class TutorialArticle(models.Model):
    tutorial = models.ForeignKey(TutorialCategory, on_delete=models.CASCADE, related_name='tutorialarticle', verbose_name="Select Tutorial & Category", help_text="Select the Tutorial Name with the corresponding category")
    title = models.CharField(max_length= 200, unique=True)
    content = RichTextUploadingField(blank=True, null=True)
    date_posted = models.DateTimeField(auto_now_add=True)
    slug = models.SlugField(max_length=200,unique=True, verbose_name="URL", blank=True , null=True)
    featured_image = models.ImageField(upload_to='tutorial_images', blank=True, verbose_name='Tutorial Featured Image')
    status = models.CharField(max_length=7 , choices=[('draft', 'drafted'), ('publish', 'published')], default='draft')
    seoTitle = models.CharField(max_length=200, default="Unknown", blank=True, verbose_name="SEO Title")
    seoDescription = models.TextField(max_length=500, default="Unknown", blank=True, verbose_name='SEO Description')
    seoKeywords = models.CharField(max_length=200, default="Unknown", blank=True, verbose_name="SEO Keywords")
    tutorial_number = models.PositiveIntegerField()
    view_count = models.PositiveBigIntegerField(blank=True, null= True, default=1)
    paralinks = models.CharField(max_length=200, blank=True, null=True, verbose_name='Tutorial Old Slugs')
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, * args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)

        super(TutorialArticle, self).save(*args, **kwargs)
    
    @admin.display
    def featured_images(self):
        if self.featured_image:
            return format_html(
                '<img src={} style="width: 6rem; height:3rem;" />',
                self.featured_image.url
            )
   
    
    def tutorial_image_tag(self):
         return format_html('<img src="{}" height=200px />'.format(self.featured_image.url))

    tutorial_image_tag.short_description =  f"Current Featured Image"
    tutorial_image_tag.allow_tags = True

    class Meta:
        verbose_name_plural  = "Tutorial Articles"
        unique_together = ['tutorial', 'tutorial_number']
        ordering = ['-date_posted',]

    def __str__(self):
        return f"{self.tutorial} -> {self.title}"

    def get_absolute_url(self):
        tutorial = self.tutorial.tutorial.name.lower().replace(" ", "-")
        return reverse('tutorialdetail',kwargs={'tutorial':tutorial, 'slug':self.slug})

    
