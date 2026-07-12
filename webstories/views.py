from django.shortcuts import render, get_object_or_404
from .models import *
from django.core.paginator import Paginator

# Create your views here.


def allStories(request):
    allstories= WebStory.objects.filter(status="publish").order_by("-date_posted")
    paginator = Paginator(allstories, 20) # Show 20 posts per page.
    page_number = request.GET.get('page',1)
    page_obj = paginator.get_page(page_number)
    return render(request, 'webstories/allstories.html',{'page_obj':page_obj} )

def story(request, slug):
    story =  get_object_or_404(WebStory,slug= slug)
    return render(request, 'webstories/story.html', {'story':story})

