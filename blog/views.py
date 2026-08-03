from multiprocessing import context
from django.shortcuts import render,get_object_or_404, HttpResponseRedirect, HttpResponse, HttpResponsePermanentRedirect
from django.urls import reverse
from .models import  Post, Category,Comment, BlogStats
from django.core.paginator import Paginator
from django.contrib import messages
from django.contrib.auth.models import User
from bs4 import BeautifulSoup
from adsmanager.models import *


# Create your views here.
def posts(request):
    popular_blogs= Post.objects.filter(status="publish").order_by("-date_posted")[:3]
    popular_blogs_all= Post.objects.filter(status="publish").order_by("-date_posted")[3:15]
    featured_categories = Category.objects.filter(featured=True).order_by('category_name')[:15]
    context ={'context':list()}
    for index, category in enumerate(featured_categories):
        context['context'].append({'name':category.category_name, 'posts':popular_blogs_all })
    context['popularblogs']= popular_blogs
    context['blogs'] = popular_blogs_all
    context['title']= "Check out our latest blogs category wise"
    context['description']= "Techgeekbuzz be up-to-date with the latest computer science terrms and logics"
    context['page_link'] = 'blog'
    context['keywords'] = 'programming, java, python , data science, blog'
    return render(request, 'blog/posts.html', context=context)

# Create your views here.
def bycategory(request, category):
    category = " ".join(category.split('-'))
    category = get_object_or_404(Category,category_name__iexact = category)
    posts = category.posts.all().filter(status='publish').order_by('-date_posted')
    paginator = Paginator(posts, 12) # Show 12 posts per page.
    page_number = request.GET.get('page',1)
    page_obj = paginator.get_page(page_number)
    return render(request, 'blog/postlist.html',{'page_obj':page_obj, 'bycategory':True,'category_name':category.category_name, 'page_link':'blog/category/'} )




# Create your views here.
def bytag(request, tag):
    tag= " ".join(tag.split("-"))
    posts = Post.objects.filter(tags__icontains = tag, status='publish')
    paginator = Paginator(posts, 12) # Show 12 posts per page.
    page_number = request.GET.get('page',1)
    page_obj = paginator.get_page(page_number)
    return render(request, 'blog/postlist.html',{'page_obj':page_obj, 'bycategory':True,
     'category_name':tag,'page_link':'blog/tag/'} )

# Create your views here.
def byuser(request, username):
    posts = Post.objects.filter(author__username = username, status='publish')
    author = get_object_or_404(User, username=username)
    paginator = Paginator(posts, 12) # Show 12 posts per page.
    page_number = request.GET.get('page',1)
    page_obj = paginator.get_page(page_number)
    context = {'page_obj':page_obj, 'by_user':author,}
    context['title']= f"Check out the profile and articles written by {username}"
    context['description']= f"Techgeekbuzz Author {author}"
    context['page_link'] = f'blog/author/{username}'
    context['keywords'] = f'{username}-author, blogs'
    return render(request, 'blog/postlist.html', context=context)

def handalingtags(data):
    content = BeautifulSoup(data, 'html.parser')
    all_p= content.find_all('p')
    toal_length = len(all_p)
    blog_ads_sections = Insideads.objects.filter(page="blog", placement=Placement.BLOG_IN_CONTENT, status=True).order_by('position')
    print(f"Blog Ads Sections: {blog_ads_sections}")
    for ad in blog_ads_sections:
        if ad.position<toal_length:
            divtag = content.new_tag("div", Class="text-center")
            all_p[ad.position-1].insert_after(divtag)
            ads_script = ad.script
            soup = BeautifulSoup(ads_script, 'html.parser')
            divtag.append(soup)
    return content.prettify()

def postdetail(request, slug):
    check_post = Post.objects.filter(slug__iexact = slug, status="publish")
    if check_post:
        post = get_object_or_404(Post,slug__iexact = slug)
        if not request.user.is_authenticated:
            if post.status =="draft":
                get_object_or_404(Post,slug__iexact = "askdhfshdfgfkshfhsdfaskfhskdhfsdhfksdhgkdhf")
    else:
        check_post = Post.objects.filter(paralinks__icontains = slug)
        in_posts =False
        for p in check_post:
            print(p.paralinks.split())
            if slug in list(map(lambda x:x.strip(), p.paralinks.split())):
                in_posts=True
                break
        if not in_posts:
            get_object_or_404(Post,slug__iexact = "askdhfshfkshfhsdfaskfhskdhfsdhfksdhgkdhf")
        post = get_object_or_404(Post,paralinks__icontains = slug)
        return HttpResponsePermanentRedirect(reverse('postdetail',kwargs={'slug':post.slug}))

    context=dict()
    context['content'] = handalingtags(post.content)
    blog_left_sidebar = Insideads.objects.filter(page="blog", placement=Placement.BLOG_LEFT_SIDEBAR, status=True).order_by('position')
    print(f"Blog Left Sidebar: {blog_left_sidebar}")
    blog_right_sidebar = Insideads.objects.filter(page="blog", placement=Placement.BLOG_RIGHT_SIDEBAR, status=True).order_by('position')
    print(f"Blog Right Sidebar: {blog_right_sidebar}")
    context['post'] = post
    context['blog_left_sidebar'] = blog_left_sidebar
    context['blog_right_sidebar'] = blog_right_sidebar
    try:
        context['img_type']=post.featured_image.url.split(".")[-1]
    except:
        context['img_type']='jpeg'
        pass

    if post:
        recent_posts= post.category.order_by('posts').first()
        if recent_posts:
            context['recent_posts'] = recent_posts.posts.filter(status="publish").exclude(title=post.title)[:3]
        else:
            # context['recent_posts']= Post.objects.filter(status="publish").order_by('-view_count').exclude(title=post.title)[:3]
            context['recent_posts'] = (
                Post.objects.filter(status="publish")
                .exclude(pk=post.pk)               # exclude current post
                .select_related("stats")           # join BlogStats in same query
                .order_by("-stats__views")[:3]     # order by views in BlogStats
            )
    if request.method =="GET":
        if post:
            # Get or create stats entry for this post
            stats, created = BlogStats.objects.get_or_create(blog=post)
            stats.increment_views()
            return render(request, 'blog/postdetail.html', context=context)

    if request.method=="POST":
        reply = request.POST.get('reply')
        print(reply)
        #main comment
        if reply == "null":
            name = request.POST.get('username')
            email = request.POST.get('email')
            message = request.POST.get('message')
            if name and email and message:
                new_comment = Comment(email=email, name=name, message=message)
                if request.user.is_authenticated:
                    user = request.user
                    new_comment.authorize_user= user
                new_comment.post= post
                new_comment.save()
                messages.success(request, f'Your Comment has been send for validation!')
                return HttpResponsePermanentRedirect(reverse('postdetail',kwargs={'slug':post.slug}))
            else:
                messages.error(request, f'Please Do not mess with the form You are no hacker!')
                return HttpResponsePermanentRedirect(reverse('postdetail',kwargs={'slug':post.slug}))
        elif request.POST.get('replying'):
            comment_reply_id = int(float(request.POST.get('replying')))
            parentcomment = Comment.objects.get(id = comment_reply_id)
            if not parentcomment.post == post:
                messages.error(request, f'Please Do not mess with the form You are no hacker!')
                return HttpResponsePermanentRedirect(reverse('postdetail',kwargs={'slug':post.slug}))    
            if parentcomment:
                name = request.POST.get('username')
                email = request.POST.get('email')
                message = request.POST.get('message')
                if name and email and message:
                    new_comment = Comment(email=email, name=name, message=message)
                    if request.user.is_authenticated:
                        user = request.user
                        new_comment.authorize_user= user
                    new_comment.post= post
                    new_comment.parent=parentcomment
                    new_comment.save()
                    messages.success(request, f'Your Comment has been send for validation!')
                    return HttpResponsePermanentRedirect(reverse('postdetail',kwargs={'slug':post.slug}))
                else:
                    messages.error(request, f'Please Do not mess with the form You are no hacker!')
                    return HttpResponsePermanentRedirect(reverse('postdetail',kwargs={'slug':post.slug}))
            else:
                messages.error(request, f'Please Do not mess with the form You are no hacker!')
                return HttpResponsePermanentRedirect(reverse('postdetail',kwargs={'slug':post.slug}))
        return render(request, 'blog/postdetail.html', context=context)