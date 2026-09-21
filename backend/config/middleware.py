import logging

class DebugCookieMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "POST" and request.path.startswith("/admin"):
            info = {k: len(v) for k, v in request.COOKIES.items()}
            logging.error("COOKIES SEEN: %s | RAW LEN: %s",
                          info, len(request.META.get("HTTP_COOKIE", "")))
        return self.get_response(request)