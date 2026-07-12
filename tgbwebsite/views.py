from django.shortcuts import render
from django.shortcuts import HttpResponseRedirect, get_object_or_404, HttpResponsePermanentRedirect
from django.urls import reverse

from django.db.models import Q
from blog.models import Post
from users.models import Subscriber
from django.core.paginator import Paginator
from django.contrib import messages
from blog.models import *
from tutorial.models import *
def homepage(request):
    return render(request, 'index.html')

def advertise(request):
    return render(request, 'advertisewithus.html')

def aboutus(request):
    return render(request, 'about.html')

def privacy(request):
    return render(request, 'privacy.html')

def term_condition(request):
    return render(request, 'termandcondition.html')

def write_for_us(request):
    return render(request, 'writeforus.html')

def guest_article_requirements(request):
    return render(request,"wrtierequirements.html")

def search(request):
    if request.method=="GET":
        query = request.GET.get('search')
        if query:
            posts = Post.objects.filter(title__icontains = query, status ='publish')
            paginator = Paginator(posts, 12) # Show 12 posts per page.
            page_number = request.GET.get('page',1)
            page_obj = paginator.get_page(page_number)
            return render(request, 'blog/postlist.html',{'page_obj':page_obj, 'query':query,'bycategory':True,
            'page_link':f'query/?search={query}&'})
        else:
            return HttpResponseRedirect('/')
    else:
        return reverse("index")

def subscribe(request):
    import re
    
    email = request.POST.get('email', "")
    next = request.POST.get('next', '/')
    regex = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    if email:
        if(re.fullmatch(regex, email)):
            (object, created)=Subscriber.objects.get_or_create(user_email=email)
            if created:
                messages.success(request, 'Thanks for Subscribing us')
            else:
                messages.success(request, 'You are already Subscribed with this email address')
        return HttpResponseRedirect(next)
    else:
        return HttpResponseRedirect(next)


def redirect_old(request, old_url):

    blog = Post.objects.filter(slug=old_url)
    tutorial = TutorialArticle.objects.filter(slug=old_url)
    
    if blog:
        blog = blog[0]
        return HttpResponsePermanentRedirect(reverse('postdetail',kwargs={'slug':blog.slug}))
    if tutorial:
        tutorial = tutorial[0]
        print(str(tutorial.tutorial.tutorial).lower().replace(" ", "-"))
        return HttpResponsePermanentRedirect(reverse('tutorialdetail',kwargs={'tutorial':str(tutorial.tutorial.tutorial).lower().replace(" ", "-"), 'slug':tutorial.slug}))
    get_object_or_404(Post, slug = "asdfhsadfhksahgkhsjfashkghdfkghk")
    


def latestposts(request):
    posts = Post.objects.filter(status='publish').order_by('-date_posted')
    paginator = Paginator(posts, 12) # Show 12 posts per page.
    page_number = request.GET.get('page',1)
    page_obj = paginator.get_page(page_number)
    return render(request, 'blog/postlist.html',{'page_obj':page_obj} )



