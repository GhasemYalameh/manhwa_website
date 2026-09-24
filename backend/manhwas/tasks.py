import os, logging, zipfile
from celery import shared_task

from django.db.models import F, Q, Count, FloatField, OuterRef, Subquery, Value
from django.db.models.aggregates import Avg
from django.db.models.functions import Coalesce
from django.forms.fields import FloatField
from django_redis import get_redis_connection
from django.core.files.base import ContentFile

from .models import Chapter, ChapterImage, Manhwa, View
from config.settings.app import MANHWA_REDIS_KEYS

logger = logging.getLogger(__name__)
redis_con = get_redis_connection('default')

IMAGE_ALLOWED_FORMATS = {'.jpg', '.jpeg', '.png', '.webp'}


@shared_task(name='manhwas.sync_pending_views')
def sync_pending_views():
    """
    syncing cached views in redis to database.
    """

    logger.info('Starting syncing cached views...')

    pattern = 'manhwa:*:viewers_id'
    cursor, manhwa_ids = 0, []
    update_count, total_viewers = 0, 0
    while 1:
        cursor, keys = redis_con.scan(cursor, match=pattern, count=100)
        manhwa_ids.extend([key.decode('utf-8').split(':')[1] for key in keys])
        if cursor == 0:
            break

    for manhwa_id in manhwa_ids:
        viewers_key = MANHWA_REDIS_KEYS.get('MANHWA_VIEWERS_ID').format(manhwa_id)
        viewed_manhwas_key = MANHWA_REDIS_KEYS.get('VIEWED_MANHWAS_ID')
        # atomic process
        pipe = redis_con.pipeline()
        pipe.smembers(viewers_key)
        pipe.scard(viewers_key)
        pipe.sunionstore(viewed_manhwas_key, viewed_manhwas_key, viewers_key)
        pipe.delete(viewers_key)
        results = pipe.execute()

        manhwa_viewers_id = [int(mvid) for mvid in results[0]]  # mvid (manhwa viewer id)
        manhwa_viewers_count = results[1]

        # if key is empty, continue
        if not manhwa_viewers_count or manhwa_viewers_count <= 0:
            continue

        try:
            Manhwa.objects.filter(pk=manhwa_id).update(views_count=F('views_count') + manhwa_viewers_count)

            # crete view objects
            view_objects = [View(manhwa_id=manhwa_id, user_id=uid) for uid in manhwa_viewers_id]
            View.objects.bulk_create(view_objects, ignore_conflicts=True)

            update_count += 1
            total_viewers += manhwa_viewers_count

            logger.info(f'Increase +{total_viewers} views to manhwa id ({manhwa_id})')

        except Exception as e:
            logger.error(f'got error while syncing pending views for {manhwa_id}: {str(e)}')

    logger.info(f'finished syncing cached views. {update_count} manhwas updated.')
    logger.info(f'total cached views: {total_viewers}')

    return {
        'total_views': total_viewers,
        'updated_manhwas': update_count,
    }

@shared_task(name='manhwas.sync_view_objects_count_to_manhwa')
def sync_view_objects_count_to_manhwa():
    logger.info('Starting to sync views objects count to manhwa...')

    viewed_manhwas_key = MANHWA_REDIS_KEYS.get('VIEWED_MANHWAS_ID')
    viewers_sq = (
        View.objects.filter(manhwa_id=OuterRef('pk')).order_by().values('manhwa')
        .annotate(cnt=Count('id')).values('cnd')
    )
    manhwas_id = redis_con.smembers(viewed_manhwas_key)
    Manhwa.objects.filter(id__in=manhwas_id).annotate(
        views_cnt=Coalesce(Subquery(viewers_sq), Value(0))
    ).update(views_count=F('views_cnt'))

    logger.info('Syncing View Objects Completed .All Manhwa\'s view_count is up to date now')

@shared_task(name='manhwas.mark_five_hot_manhwas')
def mark_five_hot_manhwas():
    logger.info('updating manhwas and marking 5 is_hot manhwa starting...')

    currently_publish_manhwa = Manhwa.objects.filter(publication_status=Manhwa.CURRENTLY_PUBLISHING)
    top_viewed_manhwas_id = list(
        currently_publish_manhwa
        .order_by('-views_count')
        .values_list('id', flat=True)[:15]
    )
    hot_manhwas_id = list(
        Manhwa.objects
        .filter(id__in=top_viewed_manhwas_id)
        .annotate(avg_rates=Coalesce(Avg('rates__rating'), Value(0.0), output_field=FloatField()))
        .order_by('-avg_rates')
        .values_list('id', flat=True)[:5]
    )
    # updating hot manhwas field
    Manhwa.objects.filter(id__in=hot_manhwas_id).update(is_hot=True)
    logger.info('top 5 hot manhwa updated and marked.')

    # updating non hot manhwas field
    Manhwa.objects.filter(Q(is_hot=True) & ~Q(id__in=hot_manhwas_id)).update(is_hot=False)
    logger.info('non-hot manhwas unmarked')
    logger.info('manhwas updated successfully.')

@shared_task(name='manhwas.create_chapter_image_objects')
def create_chapter_image_objects(obj_id):
    logger.info("starting to create Chapter Images...")

    chapter_obj = Chapter.objects.get(id=obj_id)

    if not chapter_obj.zip_file:
        return 

    zip_path = chapter_obj.zip_file.path
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        files_list = [
            f for f in zip_ref.namelist()
            if os.path.splitext(f)[1].lower() in IMAGE_ALLOWED_FORMATS
            and not f.startswith('__MACOSX')
        ]
        logger.info("images extracted from zip file.")
        files_list.sort()

        images_to_create = []
        for index, file_name in enumerate(files_list, start=1):
            image_data = zip_ref.read(file_name)
            clean_filename = os.path.basename(file_name)
            
            chapter_image = ChapterImage(
                chapter=chapter_obj,
                order=index
            )
            # منتسب کردن فایل مستقیماً به ImageField بدون ذخیره روی دیسک اولیه
            chapter_image.image.save(clean_filename, ContentFile(image_data), save=False)
            images_to_create.append(chapter_image)

        logger.info("all images recognized. starting to create ChapterImage objects...")
        ChapterImage.objects.bulk_create(images_to_create)
        logger.info('successfully completed.')
        
    if os.path.exists(zip_path):
        os.remove(zip_path)
    logger.info('zip file removed from temp.')
    


