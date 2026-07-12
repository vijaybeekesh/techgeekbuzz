from django.contrib import admin
from .models import *

# Register your models here.
class RoadMapListInline(admin.StackedInline):
    model = RoadMapList
    extra=0

class RoadMapAdmin(admin.ModelAdmin):
     model = RoadMap
     list_filter = ("name",)
     inlines = [RoadMapListInline,]
     empty_value_display ='unknown'
     list_display=("name","description", "roadmap_icon")
     list_per_page = 100

     readonly_fields = ('image_tag',)

     fieldsets = (
        (None, {
            'fields': ('name', "description",'roadmap_url',"image", 'image_tag'),
        }),
        ('Extra', {
            'classes':('collapse',),
            'fields':("total_likes",),
        }),
        )

admin.site.register(RoadMap, RoadMapAdmin)

class RoadMapTopicsInline(admin.StackedInline):
    model = RoadMapTopics
    extra = 0


class RoadMapListAdmin(admin.ModelAdmin):
    model = RoadMapList
    list_filter= ('roadmap',)
    inlines = [RoadMapTopicsInline,]
    empty_value_display ='unknown'
    list_display=("roadmap",'title')
    list_per_page = 100

admin.site.register(RoadMapList, RoadMapListAdmin)

