from django.contrib.auth import get_user_model

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import CommunityUserProfile

user = get_user_model()

# code signal for user creation 
@receiver(post_save, sender=user)
def autoprofilecreation(sender, instance,created, **kwargs):
    if created:
        # create a new profile for the register user
        profile_create = CommunityUserProfile.objects.create(user=instance)
    else:
        pass