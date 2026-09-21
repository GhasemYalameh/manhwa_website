import os

from .base  import *
from .app import *
from .third_party import *
from .celery import *
from .drf import *
from .databases import *
from .security import *


DEBUG = False

SECRET_KEY = os.getenv('SECRET_KEY')
ALLOWED_HOSTS = ['naranjtoon.style.dev', 'web']

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

CSRF_TRUSTED_ORIGINS = ['https://naranjtoon.style.dev']
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_NAME = "naranj_csrftoken"
SESSION_COOKIE_NAME = "naranj_sessionid"

DEBUG_TOOLBAR_CONFIG = {
    "SHOW_TOOLBAR_CALLBACK": lambda x: False,
}