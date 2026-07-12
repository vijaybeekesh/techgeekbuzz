from django.contrib import admin
from .models import *
from django.utils.html import format_html
from django.utils.text import slugify
from  django.utils import timezone

# Register your models here.

class CommentsInline(admin.StackedInline):
    model = Comment
    extra=0

class FAQsInline(admin.StackedInline):
    model = Faq
    fields = ( 'question','answer')
    extra=0
class PostAdmin(admin.ModelAdmin):
    model = Post
    list_filter = ("title", "status", "category", "date_posted", "author", )
    inlines = [CommentsInline, FAQsInline]
    search_fields = ("title",)
    empty_value_display = "unknown"
    list_display = ("title", "date_posted", "author", "status", "categories", "view_count", "featured_images")
    list_per_page = 50

    def save_model(self, request, obj, form, change):
        if not obj.author:
            obj.author = request.user
        if not obj.slug:
            obj.slug = slugify(obj.title)
        super().save_model(request, obj, form, change)

    @admin.display(description="Categories", empty_value="unknown")
    def categories(self, obj):
        return ", ".join(cat.category_name for cat in obj.category.all())

    @admin.display(description="Views", empty_value="0")
    def view_count(self, obj):
        if hasattr(obj, "stats"):
            return obj.stats.views
        return 0

    @admin.display(description="Featured Image")
    def featured_images(self, obj):
        if obj.featured_image:
            return format_html('<img src="{}" width="60" height="60" style="object-fit:cover;"/>', obj.featured_image.url)
        return "No Image"

    fieldsets = (
        (None, {
            "fields": ("title", "slug", "content", "status", "author")
        }),
        ("Post Image", {
            "classes": ("collapse",),
            "fields": ("featured_image", "image_tag",),
        }),
        ("Categories And Tags", {
            "classes": ("collapse",),
            "fields": ("tags", "category",),
        }),
        ("SEO", {
            "classes": ("collapse",),
            "fields": ("seoTitle", "seoDescription", "seoKeywords"),
        }),
        ("Extra", {
            "classes": ("collapse",),
            "fields": ("paralinks",),
        }),
    )
    readonly_fields = ("image_tag",)
    

admin.site.register(Post, PostAdmin)

class CategoryAdmin(admin.ModelAdmin):
    model = Category
    list_per_page = 200
    list_filter = ("category_name","featured" )
    

admin.site.register(Category, CategoryAdmin)




class CommentAdmin(admin.ModelAdmin):
    model = Comment
    list_filter = ("post","approved_comment")
    empty_value_display ='unknown'
    list_display=('name','email','message','posts', "approved_comment",)
    list_per_page = 100

admin.site.register(Comment, CommentAdmin)



from  django.contrib.auth.models  import  Group  # new

admin.site.unregister(Group)  # new