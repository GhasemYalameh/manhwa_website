from django.utils.timezone import timedelta
# ===================================
# Celery Configuration
# ===================================

CELERY_BROKER_URL = 'redis://redis:6379/1'
CELERY_RESULT_BACKEND = 'redis://redis:6379/1'

CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

CELERY_TIMEZONE = 'Asia/Tehran'

CELERY_TASK_TRACK_STARTED = True

CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
CELERY_TASK_SOFT_TIME_LIMIT = 25 * 60  # 25 minutes

# ===================================
# Celery Beat Schedule
# ===================================

CELERY_BEAT_SCHEDULE = {
    'sync-pending-views-every-2-hours': {
        'task': 'manhwas.sync_pending_views',
        'schedule': timedelta(hours=2),  # 2 hours
    },
    'sync-manhwas-views-to-view-objects-everyday': {
        'task': 'manhwas.sync_view_objects_count_to_manhwa',
        'schedule': timedelta(days=1),  # 4 days
    },
    'mark-hot-manhwas-every-4-days': {
        'task': 'manhwas.mark_five_hot_manhwas',
        'schedule': timedelta(days=4),  # 4 days
    },

}
