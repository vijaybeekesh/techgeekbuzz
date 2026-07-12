from adsmanager.models import Insideads, Placement
from .models import Post

def popularpost(request):
    popular =  Post.objects.filter(status="publish").order_by('-date_posted')[:3]
    global_header = Insideads.objects.filter(page="blog", placement=Placement.GLOBAL_HEADER, status=True).order_by('position')
    return {'popular':popular, 'global_header': global_header}