from django.contrib import admin
from .models import *
# Register your models here.

class TutorialCategoryInline(admin.StackedInline):
    model = TutorialCategory
    extra=0

class TutorialExampleInline(admin.StackedInline):
    model = TutorialExamples
    extra=0

class TutorialAdmin(admin.ModelAdmin):
     model = Tutorial
     list_filter = ("name",)
     inlines = [TutorialCategoryInline,TutorialExampleInline]
     empty_value_display ='unknown'
     list_display=("name","tutorial_icon")
     list_per_page = 500
     
     readonly_fields = ('image_tag',)
     
     fieldsets = (
        (None, {
            'fields': ('name', "description",'image','image_tag')
        }),)
     
admin.site.register(Tutorial, TutorialAdmin)


class TutorialArticleAdmin(admin.ModelAdmin):
    model =TutorialArticle
    list_filter = ("tutorial", 'title', 'date_posted')
    empty_value_display ='unknown'
    list_display=("title","tutorial",'status' ,'date_posted','featured_images')
    list_per_page = 500
    
    fieldsets = (
        (None, {
            'fields': ('tutorial','tutorial_number','title', 'slug', 'content', 'status',)
        }),
        ('Article Image', {
            'classes': ('collapse',),
            'fields': ( 'featured_image','tutorial_image_tag'),
        }),
        ('SEO', {
            'classes': ('collapse',),
            'fields': ('seoTitle', 'seoDescription', 'seoKeywords'),
        }),
        ('Extra', {
            'classes': ('collapse',),
            'fields': ( 'view_count', 'paralinks'),
        }),
    )
    readonly_fields =('tutorial_image_tag',)

admin.site.register(TutorialArticle, TutorialArticleAdmin)

# ready for production
