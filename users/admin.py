from django.contrib import admin
from .models import Subscriber, UserProfile

# Register your models here.
class ProfileInline(admin.ModelAdmin):
    model = UserProfile
    fieldsets = (
        ('User', {
            'classes': ('collapse',),
            'fields': ( 'user','designation', 'bio'),
        }),
        ('User Profile', {
            'classes': ('collapse',),
            'fields': ('image_tag','profile_picture'),
        }),
        ('Social Media', {
            'classes': ('Collapse',),
            'fields': ('linkedin','twitter', 'instagram', 'facebook'),
        }),
       )
    readonly_fields = ('image_tag',)
    
admin.site.register(UserProfile, ProfileInline)

admin.site.register(Subscriber)