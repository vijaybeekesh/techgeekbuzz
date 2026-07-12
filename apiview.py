from django.http import JsonResponse
import requests
from datetime import datetime
from .models import CommunityPost
from django.core.paginator import Paginator




def loadposts(request):
    pass
    context=dict()
    contact_list = CommunityPost.objects.all()
    paginator = Paginator(contact_list, 25) # Show 25 contacts per page.

    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    for p in page_obj:
        # context['posts_details'] =
        print(p)
    print(page_obj)
    return JsonResponse(context)