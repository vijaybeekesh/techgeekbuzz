from .models import Tutorial

def alltutorials(request):
    tutoriallist = Tutorial.objects.all()
    return {"tutoriallist": tutoriallist}