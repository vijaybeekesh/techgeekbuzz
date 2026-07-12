from django.contrib import admin

# Register your models here.
from .models import *

class StoryInline(admin.StackedInline):
    model = Story
    fields = ('title', 'description' ,'coverimage', 'image_tag')
    readonly_fields = ('image_tag',)
    extra =0


class WebStoryAdmin(admin.ModelAdmin):
    model = WebStory
    list_filter = ('title', 'date_posted', 'status',)
    inlines = [StoryInline,]
    search_fields = ['title', ]
    empty_value_display ='unknown'
    list_display=('title','date_posted', 'status',)
    list_per_page = 50


    fieldsets = (
        (None, {
            'fields': ('title', 'slug','seoTitle', 'seoDescription', 'seoKeywords', 'status', 'post_url',)
        }),
    )

admin.site.register(WebStory, WebStoryAdmin)
