from multiprocessing import context
from django.shortcuts import render
from django.shortcuts import get_object_or_404,HttpResponseRedirect
from django.urls import reverse
from django.contrib import messages


from .models import *
# Create your views here.
def roadmaps(request):
    all_roadmaps = RoadMap.objects.all().order_by('name')

    context = {'all_roadmaps':all_roadmaps}

    return render(request, 'roadmap/roadmaps.html', context=context)

    
def roadmap_detail(request, slug):
    roadmap = get_object_or_404(RoadMap, roadmap_url=slug)

    if request.method =="POST":
        messages.success(request, f'Thanks for liking!(^v^)')
        roadmap.total_likes +=1
        roadmap.save()
        return HttpResponseRedirect(reverse('roadmap_detail',kwargs={'slug':roadmap.roadmap_url}))

    context = {'roadmap':roadmap}

    return render(request, 'roadmap/roadmap.html', context=context)