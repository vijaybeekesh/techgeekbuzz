import re

from django.http import HttpResponse, HttpResponsePermanentRedirect

# Paths that should permanently redirect (301) to themselves with the query
# string stripped, when requested with any query string — for spam-indexed
# URLs on pages worth preserving SEO value for, e.g.
# /tutorial/python/python-data-types/?ultimate-guide-to-gambling-and-betting...
# Checked before SPAM_QUERY_410_PATHS, so it takes priority over the general
# 410 rule below.
#
# `[^/]+` (not `.*`) matches exactly one path segment, so this covers every
# tutorial *article* page (tutorial/<category>/<slug>/, any category/slug)
# without also matching the one-segment category page tutorial/<category>/.
SPAM_QUERY_REDIRECT_PATHS = [
    re.compile(r"^/tutorial/[^/]+/[^/]+/?$"),
]

# Paths that should return 410 Gone when requested with any query string.
# The app is served via gunicorn (no .htaccess/mod_rewrite), so this replaces
# what would otherwise be an Apache RewriteRule with [G=410,L]. Empty for now
# — every tutorial article currently redirects instead (see above) — kept
# around for any future path that should be killed outright rather than
# redirected.
SPAM_QUERY_410_PATHS = [
]


class SpamQueryURLMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        query_string = request.META.get("QUERY_STRING", "")
        if query_string:
            if any(pattern.match(request.path) for pattern in SPAM_QUERY_REDIRECT_PATHS):
                return HttpResponsePermanentRedirect(request.path)
            if any(pattern.match(request.path) for pattern in SPAM_QUERY_410_PATHS):
                return HttpResponse(status=410)
        return self.get_response(request)
