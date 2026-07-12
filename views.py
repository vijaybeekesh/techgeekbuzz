from django.shortcuts import render
from .models import CommunityUserProfile, CommunityPost
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from .forms import *
from django.db.models import Q
from django.http import Http404

from django.http import HttpResponse, HttpResponseRedirect
from django.urls import reverse

# Create your views here.



def communityView(request):
    return render(request, 'community/community.html')




def communityUserProfile(request, username):
    User=get_user_model()
    context = dict()

    user = get_object_or_404(User, username =username)

    context['mainuser'] = user
    if request.user.username == username:
        set_edit= True
        context['set_edit'] = set_edit

    userprofile = get_object_or_404(CommunityUserProfile, user__username=username)
    context['userprofile'] = userprofile

    return render(request, 'community/communityuserprofile.html', context=context)

@login_required
def updateUserProfile(request):
    user = request.user
    profile = user.community_profile
    
    if request.method=="POST":
        profile_modal = CommunityProfileForm(request.POST, request.FILES, instance= profile)
        if profile_modal.is_valid():
            profile_modal.save()
            return HttpResponseRedirect(reverse('update-profile'))

    form = CommunityProfileForm(instance= profile)

    return render(request, 'community/updateprofile.html', {'form':form, 'profile':profile})


@login_required
def createPostview(request):
    if request.method=="POST":
        form = CreateCommunityPostForm(request.POST, request.FILES)
        if form.is_valid():
            new_author =form.save(commit=False)
            new_author.author = request.user
            new_author.save()
            form.save_m2m()
            return HttpResponseRedirect(reverse('postview', kwargs={'slug':new_author.slug}))
    form = CreateCommunityPostForm()
    return render(request, 'community/createPost.html',{'form':form})




def postView(request,slug):
    if request.user.is_authenticated:
        post = get_object_or_404(CommunityPost, Q(status="publish")|Q(author=request.user), slug=slug)
        if request.method =="POST":
            form = CommunityCommentForm(request.POST, request.FILES)
            if form.is_valid():
                comment = form.save(commit=False)
                comment.user = request.user
                comment.post = post
                comment.save()
                return HttpResponseRedirect(reverse('postview', kwargs={'slug':post.slug}))
    else:
        post = get_object_or_404(CommunityPost, status="publish", slug=slug)
    
    if(post.author==request.user and post.status=="publish"):
        set_edit = True
    else:
        set_edit= False
    
    print(set_edit)

    form = CommunityCommentForm()
    return render(request, 'community/viewpost.html', {'post':post, 'form':form,'set_edit':set_edit})


@login_required
def deleteComment(request, id):
    comment = get_object_or_404(Comment, Q(user=request.user)|Q(post__author=request.user), id=id)
    if request.method == "POST":
        post_slug = comment.post.slug
        comment.delete()
        return HttpResponseRedirect(reverse('postview', kwargs={'slug':post_slug}))
    
    return render(request, 'community/deleteComment.html',{'comment':comment})
    



@login_required
def editPost(request, slug):
    post = get_object_or_404(CommunityPost, slug=slug, author=request.user)

    if request.method=="POST":
        form = CreateCommunityPostForm(request.POST, request.FILES, instance=post)
        if form.is_valid():
            form.save()
            return HttpResponseRedirect(reverse('editpost', kwargs={'slug':post.slug}))

    form = CreateCommunityPostForm(instance=post)    

    return render(request, 'community/editpost.html', {'form':form, 'post':post})

@login_required
def deletePost(request, id):
    post = get_object_or_404(CommunityPost,author=request.user, id=id)
    if request.method == "POST":
        post.delete()
        return HttpResponseRedirect(reverse('communityuserprofile', kwargs={'username':request.user}))
    
    return render(request, 'community/deletepost.html',{'post':post})