from celery import shared_task
from django.db.models import Q
import logging

from manhwas.models import Chapter, WatchList
from notifications.models import Notification

logger = logging.getLogger(__name__)

@shared_task(name='notifications.chapter_published_notification')
def chapter_published_notification(chapter_id):
    """
    notifying users after publishing new chapter who added the manhwa to his watch list.
    """
    logger.info('starting to create notification for chapter publication...')

    chapter_obj = Chapter.objects.get(id=chapter_id)
    manhwa_id = chapter_obj.manhwa_id
    curser = 0
    BACH_SIZE = 1000
    while True:
        rows = WatchList.objects.filter(
            Q(manhwa_id=manhwa_id) & ~Q(watching_status=WatchList.STOPPED),
            id__gt=curser
        ).order_by('id').values('user_id','id')[:BACH_SIZE]

        rows = list(rows)
        if not rows:
            break

        notif_objects = []
        for row in rows :
            notif_objects.append(
                Notification(
                    recipient_id=row['user_id'],
                    notif_type=Notification.CHAPTER_PUBLISHED,
                    target_object=chapter_obj
                )
            )
        Notification.objects.bulk_create(notif_objects, ignore_conflicts=True)
        curser = rows[-1]['id']

    logger.info('all notifications created.')

