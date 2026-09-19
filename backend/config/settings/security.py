import os 


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY')

ALLOWED_HOSTS = [
    'localhost', 'web',
    '127.0.0.1', '0.0.0.0',
]

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'


