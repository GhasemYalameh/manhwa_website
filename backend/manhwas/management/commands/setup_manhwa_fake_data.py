from django.db.models import OuterRef, Subquery, Value
from django.db.models.functions import Coalesce
import factory
from django.core.management.base import BaseCommand
from django.db import transaction
from manhwas.models import *
from manhwas.factory_fake import *
from accounts.models import CustomUser

DJANGO_MODELS = [CustomUser, Chapter, Manhwa, Genre, Studio, View, Rate, Comment,]
NUM_MANHWAS = 100
NUM_USERS = 2000
NUM_GENRES = 20
NUM_STUDIOS = 20
CHAPTERS_MAX_NUM = 3000
REACTIONS_MAX_NUM = 30000
COMMENTS_MAX_NUM = 5000
RATES_MAX_NUM = 10000
CACHE_NUM = 0

def list_to_generator(g_list):
    for item in g_list:
        yield item


class Command(BaseCommand):
    def write(self, text, style=None, ending='\n'):
        if style == 'success':
            self.stdout.write(self.style.SUCCESS(text), ending=ending)
        else :
            self.stdout.write(text, ending=ending)

    @transaction.atomic
    def handle(self, *args, **options):
        global CACHE_NUM
        self.write('DELETING ALL DATABASE INFORMATION...', ending='')
        for model in DJANGO_MODELS:
            model.objects.all().delete()
        self.write('DONE.', style='success')


        # STUDIOS
        self.write(f'CREATING {NUM_STUDIOS} STUDIOS...', ending='')
        studios = StudioFactory.create_batch(NUM_STUDIOS)
        self.write('DONE.', style='success')


        # GENRES
        self.write(f'CREATING {NUM_GENRES} GENRES...', ending='')
        genres = GenreFactory.create_batch(NUM_GENRES)
        self.write('DONE.', style='success')


        #  MANHWAS
        self.write(f'CREATING MANHWAS...', ending='')
        GenresList.set(genres)
        CACHE_NUM = 0
        created, manhwas = 0, []
        for studio in studios :
            keep , num = self.get_num(NUM_MANHWAS, rand=(10, 15))
            manhwas += ManhwaFactory.create_batch(num, studio=studio)
            created += num
            if not keep:
                break
        self.write('DONE.', style='success')
        self.write(f'{created} MANHWAS CREATED.')


        # USERS
        self.write(f'CREATING {NUM_USERS} NUMBER OF USERS...', ending='')
        users = UserFactory.create_batch(NUM_USERS)
        self.write('DONE.', style='success')


        #  COMMENTS
        self.write(f'CREATING {COMMENTS_MAX_NUM} COMMENTS...', ending='')
        CACHE_NUM = 0
        comments = []
        for manhwa in manhwas :
            num = random.randint(15, 20)
            comment_users = random.sample(users, k=num)
            for user in comment_users:
                comments.append(
                    CommentFactory.create(author=user, manhwa=manhwa,)
                )
        self.write('DONE.', style='success')


        #  CHAPTERS   
        self.write(f'CREATING CHAPTERS...', ending='')
        # creating reaction for random comments
        for manhwa in list_to_generator(manhwas):
            num = random.randint(10, 30)
            for _ in range(num):
                ChapterFactory.create(manhwa=manhwa)
        self.write('DONE.', style='success')


        #  COMMENT_REACTIONS   
        self.write(f'CREATING COMMENT-REACTIONS...', ending='')
        for comment in list_to_generator(comments):
            # creating reaction for random comments
            if random.randint(0, 10) % 2 == 0:
                continue

            num = random.randint(10, 15)
            reaction_users = random.sample(users, k=num)
            for user in reaction_users:
                CommentReactionFactory.create(user=user, comment=comment)
        self.write('DONE.', style='success')


        # RATES
        self.write(f'CREATING {RATES_MAX_NUM} RATES...', ending='')
        rates = []
        for manhwa in manhwas:
            num = random.randint(25, 35)
            rate_users = random.sample(users, k=num)
            for user in rate_users:
                rates.append(
                    RateFactory.create(user=user, manhwa=manhwa)
                )
        self.write('DONE.', style='success')


        # VIEWS
        self.write(f'CREATING VIEWS...', ending='')
        for manhwa in manhwas:
            num = random.randint(50, 500)
            view_users = random.sample(users, k=num)
            for user in view_users:
                ViewFactory.create(manhwa=manhwa, user=user)
        self.write('DONE.', style='success')


        transaction.on_commit(self._update_counter_fields)

    def _update_counter_fields(self):
        """
        updating  counter fields after db committing.
        """
        like_count_sq = (
            CommentReAction.objects.filter(comment_id=OuterRef('pk'), reaction='lk')
            .order_by().values('comment').annotate(cnt=Count('pk')).values('cnt')
        )
        dislike_count_sq = (
            CommentReAction.objects.filter(comment_id=OuterRef('pk'), reaction='dlk')
            .order_by().values('comment').annotate(cnt=Count('pk')).values('cnt')
        )

        Comment.objects.annotate(
            lk=Coalesce(Subquery(like_count_sq), Value(0)),
            dlk=Coalesce(Subquery(dislike_count_sq), Value(0)),
        ).update(
            likes_count=F('lk'),
            dis_likes_count=F('dlk'),
        )
        views_count_sq = (
            View.objects.filter(manhwa_id=OuterRef('pk'))
            .order_by().values('manhwa').annotate(cnt=Count('pk')).values('cnt')
        )
        Manhwa.objects.annotate(view_cnt=Coalesce(Subquery(views_count_sq), Value(0))).update(views_count=F('view_cnt'))

    def get_num(self, maximum, rand=(1, 10)):
        global CACHE_NUM
        num = random.randint(rand[0], rand[1])

        if (maximum - CACHE_NUM - num) >= 0 :
            CACHE_NUM += num
            keep_loop = True
        else:
            num = maximum - CACHE_NUM
            if num < 0 :
                num = 0
            keep_loop = False

        return keep_loop, num

