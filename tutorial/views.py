from multiprocessing import context
from unicodedata import name
from django.shortcuts import render, get_object_or_404
from django.http import Http404
from bs4 import BeautifulSoup
from adsmanager.models import *
from .models import *


def handalingtags(data):
    content = BeautifulSoup(data, 'html.parser')
    all_p= content.find_all('p')
    toal_length = len(all_p)
    blog_ads_sections = Insideads.objects.filter(page="tutorial").order_by('position')
    for ad in blog_ads_sections:
        if ad.position<toal_length:
            divtag = content.new_tag("div", Class="text-center")
            all_p[ad.position-1].insert_after( divtag)
            ads_script = ad.script
            soup = BeautifulSoup(ads_script, 'html.parser')
            divtag.append(soup)
    return content.prettify()

# Create your views here.
def tutorialintro(request, tutorial):
    if "-" in tutorial:
        tutorial= " ".join(tutorial.split("-"))
    context= dict()
    context['main_tutorial']= tutorial
    tutorial = get_object_or_404(Tutorial, name__iexact=tutorial)
    context['tutorial']= tutorial
    categories = tutorial.tutorialcategory.order_by('category_number')
    context['categories']=categories
    return render(request, 'tutorial/tutoriallist.html', context=context)

def tutorialdetail(request, tutorial, slug):
    if "-" in tutorial:
        tutorial= " ".join(tutorial.split("-"))
    context = dict()
    context['main_tutorial']= tutorial
    main_tutorial = get_object_or_404(Tutorial, name__iexact=tutorial)
    tutorial_categories = main_tutorial.tutorialcategory.all().order_by('category_number')
    context['tutorial_categories'] = tutorial_categories
    post = get_object_or_404(TutorialArticle, slug=slug)
    if not post.tutorial in tutorial_categories:
        raise Http404()
    if post:
        context['post']=post
        context['content'] = handalingtags(post.content)
        post.view_count +=1
        post.save()
        next_tutorial = TutorialArticle.objects.filter(tutorial__tutorial__name__iexact=tutorial, tutorial_number=post.tutorial_number+1)
        if next_tutorial:
            context['next_tutorial'] = next_tutorial[0]
        perv_tutorial=TutorialArticle.objects.filter(tutorial__tutorial__name__iexact=tutorial, tutorial_number=post.tutorial_number-1)
        if perv_tutorial:
            context['perv_tutorial'] = perv_tutorial[0]
    
    return render(request, 'tutorial/tutorialdetail.html', context=context)

    





    