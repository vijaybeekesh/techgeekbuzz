from django.contrib import admin

# Register your models here.
from .models import *
class AdsAdmin(admin.ModelAdmin):
    model = Insideads
    list_filter = ("title","page", )
    empty_value_display ='unknown'
    list_display=('title','page', 'placement', 'position')
    list_per_page = 50
admin.site.register(Insideads,AdsAdmin)