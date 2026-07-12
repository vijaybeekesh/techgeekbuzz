from django.db import models
from django.utils import timezone
# Create your models here.

class Placement(models.TextChoices):
    GLOBAL_HEADER = "global_header", "Global header"
    BLOG_SIDEBAR = "blog_sidebar", "Blog sidebar"
    BLOG_HEADER = "blog_header", "Blog header"
    BLOG_FOOTER = "blog_footer", "Blog footer"
    BLOG_LEFT_SIDEBAR = "blog_left_sidebar", "Blog left sidebar"
    BLOG_RIGHT_SIDEBAR = "blog_right_sidebar", "Blog right sidebar"
    BLOG_BELOW_POST = "blog_below_post", "Blog below post"
    BLOG_ABOVE_POST = "blog_above_post", "Blog above post"
    BLOG_IN_CONTENT = "blog_in_content", "In Blog Content"
    TUTORIAL_SIDEBAR = "tutorial_sidebar", "Tutorial sidebar"
    TUTORIAL_HEADER = "tutorial_header", "Tutorial header"
    TUTORIAL_FOOTER = "tutorial_footer", "Tutorial footer"
    TUTORIAL_LEFT_SIDEBAR = "tutorial_left_sidebar", "Tutorial left sidebar"
    TUTORIAL_RIGHT_SIDEBAR = "tutorial_right_sidebar", "Tutorial right sidebar"
    TUTORIAL_BELOW_POST = "tutorial_below_post", "Tutorial below post"
    TUTORIAL_ABOVE_POST = "tutorial_above_post", "Tutorial above post"
    TUTORIAL_IN_CONTENT = "tutorial_in_content", "In Tutorial Content"

class Insideads(models.Model):
    title =models.CharField(max_length=300, verbose_name="Ads Title")
    page = models.CharField(max_length=30 , choices=[('tutorial', 'tutorial'), ('blog', 'blog')], default='blog', verbose_name="Select Page")
    placement = models.CharField(max_length=30, choices=Placement.choices, default=None, null=True, blank=True, verbose_name="Select Placement")
    position= models.PositiveIntegerField(default=0, verbose_name="Paragraph Position")
    script = models.TextField(verbose_name="Enter the Script")
    status = models.BooleanField(default=True, verbose_name="Enable/Disable")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"{self.title} {self.page}"
    
    class Meta:
        ordering = ['position',]
        verbose_name_plural  = "Ad Inserter"
        unique_together = ['page', 'position', 'placement']