import re

from django.http import HttpResponse

# Paths that should return 410 Gone when requested with any query string,
# e.g. spam-indexed URLs like /tutorial/javascript/javascript-sorting-arrays/?xyz=1
# The app is served via gunicorn (no .htaccess/mod_rewrite), so this replaces
# what would otherwise be an Apache RewriteRule with [G=410,L].
#
# `[^/]+` (not `.*`) matches exactly one path segment, so this covers every
# tutorial *article* page (tutorial/<category>/<slug>/, any category/slug)
# without also matching the one-segment category page tutorial/<category>/.
SPAM_QUERY_410_PATHS = [
    re.compile(r"^/tutorial/[^/]+/[^/]+/?$"),
]


class SpamQuery410Middleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        query_string = request.META.get("QUERY_STRING", "")
        if query_string and any(pattern.match(request.path) for pattern in SPAM_QUERY_410_PATHS):
            return HttpResponse(status=410)
        return self.get_response(request)
