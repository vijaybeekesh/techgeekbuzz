from django.db import models
from django.utils import timezone
from ckeditor_uploader.fields import RichTextUploadingField
from django.utils.html import format_html
from django.contrib import admin
from django.urls import reverse

# Create your models here.

class RoadMap(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    roadmap_url = models.SlugField(unique=True)
    image = models.ImageField(upload_to="roadmap_icons",blank=True, null=True, verbose_name="Roadmap Icon")
    total_likes = models.PositiveIntegerField(default=38)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @admin.display
    def roadmap_icon(self):
        if self.image:
            return format_html(
                '<img src={} style="width: 3rem; height:3rem; border-radius:50%; background-color:#006cff;"/>',
                self.image.url
            )
    
    def image_tag(self):
         return format_html('<img src="{}" height=40px style="background-color:#006cff;"/>'.format(self.image.url))
    image_tag.short_description =  f"Current RoadMap Icon"
    image_tag.allow_tags = True

    class Meta:
        verbose_name_plural  = "All Roadmaps"
        unique_together = ['name', 'roadmap_url']
        ordering = ['-name',]
    
    def get_absolute_url(self):
        return reverse('roadmap_detail', kwargs={'slug':self.roadmap_url})


    def __str__(self):
        return f'{self.name} Roadmap'

class RoadMapList(models.Model):
    roadmap = models.ForeignKey(RoadMap,on_delete=models.CASCADE, related_name="roadmaplist")
    title = models.CharField(max_length=100)
    number = models.PositiveBigIntegerField()
    description = RichTextUploadingField(blank=True, null=True,config_name="special")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.roadmap} {self.title} {self.number}"
    class Meta:
        verbose_name_plural  = "Roadmap Lists"
        unique_together = ['roadmap', 'number']
        ordering = ['roadmap','number',]
    
    def get_absolute_url(self):
        return reverse('roadmap_detail', kwargs={'slug':self.roadmap.roadmap_url})

class RoadMapTopics(models.Model):
    roadmaplist = models.ForeignKey(RoadMapList, on_delete=models.CASCADE, related_name="roadmaptopic")
    topic = models.CharField(max_length=150)
    number = models.PositiveBigIntegerField()
    description = RichTextUploadingField(blank=True, null=True, config_name="special")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.roadmaplist} {self.topic}"
    def get_absolute_url(self):
        return reverse('roadmap_detail', kwargs={'slug':self.roadmaplist.roadmap.roadmap_url})
