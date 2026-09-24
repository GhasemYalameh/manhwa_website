from calendar import month

from django.utils.timezone import timedelta

# rest framework SETTINGS
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/min",
        "user": "300/min",


        "three_in_hour": "3/hour",
        "five_in_hour": "5/hour",

        "five_in_minute": "5/min",
        "eight_in_minute": "8/min",
        "ten_in_minute": "10/min",
        "fifteen_in_minute": "15/min",
        "twenty_in_minute": "20/min",        
        "hundred_in_minute": "100/min",
    },
    "NUM_PROXIES": 1,
}

# djoser SETTINGS
SIMPLE_JWT = {
    'AUTH_HEADER_TYPES': ('JWT',),
    'ACCESS_TOKEN_LIFETIME': timedelta(weeks=4),
    'REFRESH_TOKEN_LIFETIME': timedelta(weeks=10),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,
}
