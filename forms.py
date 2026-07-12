from django.forms import ModelForm, CharField
from django import forms

from .models import CommunityUserProfile, CommunityPost, Comment

class CommunityProfileForm(ModelForm):
    class Meta:
        model = CommunityUserProfile
        fields= ['profile_picture', 'display_name', 'show_email','bio','linkedin','instagram'
        ,'facebook','twitter','github','stackoverflow','website','skills','location','work',]

class CreateCommunityPostForm(ModelForm):
    def clean_tags(self):
        tags = self.cleaned_data['tags']
        if len(tags) > 5:
            raise forms.ValidationError('You can add maximum 5 Tags')
        return tags

    class Meta:
        model = CommunityPost
        fields = ['featured_image','title', 'content', 'tags']


class CommunityCommentForm(ModelForm):
    class Meta:
        model = Comment
        fields= ['comment']