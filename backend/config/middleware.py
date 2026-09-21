import re

_BAD_SEP = re.compile(r",\s*(?=[A-Za-z0-9_.\-]+=)")

class FixCookieSeparatorMiddleware:
    """بعضی پروکسی‌ها هدر Cookie رو با ',' به هم می‌چسبونن؛ اینجا به '; ' برمی‌گردونیم."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        raw = request.META.get("HTTP_COOKIE")
        if raw and "," in raw:
            request.META["HTTP_COOKIE"] = _BAD_SEP.sub("; ", raw)
        return self.get_response(request)