from django.contrib import admin
from .models import CommunityUserProfile, CommunityPost, Tags, Comment
from django.utils.text import slugify
from  django.utils import timezone

# Register your models here.
class CommunityProfileInline(admin.ModelAdmin):
    model = CommunityUserProfile
    fieldsets = (
        ('User', {
            'classes': ('collapse',),
            'fields': ( 'user','display_name', 'bio', 'designation', 'show_email'),
        }),
        ('User Profile', {
            'classes': ('collapse',),
            'fields': ('image_tag','profile_picture'),
        }),
        ('Social Media', {
            'classes': ('Collapse',),
            'fields': ('linkedin','twitter', 'instagram', 'facebook', 'github','stackoverflow', 'website'),
        }),
        ('Work', {
            'classes': ('Collapse',),
            'fields': ('skills','location', 'work',),
        }),
       )
    readonly_fields = ('image_tag',)
    
admin.site.register(CommunityUserProfile, CommunityProfileInline)


class CommentsInline(admin.StackedInline):
    model = Comment
    extra=0

class CommunityPostAdmin(admin.ModelAdmin):
    model = CommunityPost
    list_filter = ("title","status", 'date_posted', 'author', )
    inlines = [CommentsInline,]
    search_fields = ('title',)
    empty_value_display ='unknown'
    list_display=('title','date_posted', 'author','status','view_count', 'featured_images')
    list_per_page = 50

    def save_model(self, request, obj, form, change):
        if not obj.author:
            obj.author = request.user
        if not obj.slug:
            obj.slug= slugify(obj.title)

        obj.post_updated= timezone.now()
        super().save_model(request, obj, form, change)

    # @admin.display(empty_value='unknown')
    # def categories(self, obj):
    #     if obj.category:
    #         category = ""
    #         for cat in obj.category.all():
    #             category = f"{category} {cat},"
    #     else:
    #         category =""

    #     return category
    
    
    fieldsets = (
        (None, {
            'fields': ('title', 'slug', 'content', 'status', 'author')
        }),
        ('Post Image', {
            'classes': ('collapse',),
            'fields': ( 'featured_image','image_tag',),
        }),
        ('Date', {
            'classes': ('collapse',),
            'fields': ('date_posted','post_updated'),
        }),
        ('Tags', {
            'classes': ('collapse',),
            'fields': ('tags', ),
        }),
        ('SEO', {
            'classes': ('collapse',),
            'fields': ('seoTitle', 'seoDescription', 'seoKeywords'),
        }),
        ('Extra',{
            'classes': ('collapse',),
            'fields':('view_count',),
        })
    )
    readonly_fields = ('image_tag',)
    

admin.site.register(CommunityPost, CommunityPostAdmin)

admin.site.register(Tags)