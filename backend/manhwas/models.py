import uuid

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import F, Count, When
from django.utils import timezone
from django.utils.translation import gettext as _
from django_ckeditor_5.fields import CKEditor5Field

from .storages import protected_storage
from config import settings
from config.settings.base import AUTH_USER_MODEL
from .services import (
    chapter_cover_upload_to, chapter_images_upload_to, generate_manhwa_slug, manhwa_cover_upload_to, N,
)


class Genre(models.Model):
    title = models.CharField(max_length=200, verbose_name=_('title'))
    description = models.CharField(max_length=500, verbose_name='description')

    def __str__(self):
        return self.title


class Studio(models.Model):
    title = models.CharField(max_length=200, verbose_name=_('title'))
    description = models.TextField(verbose_name=_('description'))

    def __str__(self):
        return self.title


class Manhwa(models.Model):
    DAY_OF_THE_WEEK = (
        (SATURDAY:='sat', 'Saturday'),      (SUNDAY:='sun', 'Sunday'),
        (MONDAY:='mon', 'Monday'),        (TUESDAY:='tue', 'Tuesday'),
        (WEDNESDAY:='wed', 'Wednesday'),  (THURSDAY:='thu', 'ُThursday'),
        (FRIDAY:='fri', 'Friday'),
    )
    AGE_RANGE = (
        ('all', 'All people'), ('adult', 'older than 18'),
        ('child', 'less than 13'), ('teen', 'older than 13'),
    )
    PUB_STATUS_CHOICES = (
        (CURRENTLY_PUBLISHING:='cp', 'Currently Publishing'),
        (CONCLUDED:='c', 'Concluded'),
        (UNPUBLISHED:='up', 'UnPublished'),
    )

    fa_title = models.CharField(max_length=500, blank=True, verbose_name=_('persian title'))
    en_title = models.CharField(max_length=500, verbose_name=_('english title'))
    title_slug = models.SlugField(max_length=60, unique=True, blank=True)
    summary = CKEditor5Field('Text', config_name='extends')
    season = models.PositiveIntegerField(default=1, verbose_name=_('season'))
    day_of_week = models.CharField(max_length=30, choices=DAY_OF_THE_WEEK, verbose_name=_('day of the week'))
    cover = models.ImageField(upload_to=manhwa_cover_upload_to, verbose_name=_('manhwa cover'))
    hero_cover = models.ImageField(upload_to='Manhwa/hero/', blank=True, null=True)
    genres = models.ManyToManyField(Genre, related_name='manhwas', verbose_name=_('genre'))
    studio = models.ForeignKey(Studio, on_delete=models.PROTECT, related_name='manhwas', verbose_name=_('studio'))
    views_count = models.PositiveIntegerField(default=0, editable=False, verbose_name=_('views count'))
    publication_datetime = models.DateTimeField(verbose_name=_('publication datetime'))
    publication_status = models.CharField(choices=PUB_STATUS_CHOICES, default=UNPUBLISHED)
    is_hot = models.BooleanField(default=False)

    last_upload_time = models.DateTimeField(null=True, blank=True)  # when an Chapter Uploaded.
    last_upload = models.CharField(default='Not Uploaded', editable=False)

    datetime_created = models.DateTimeField(auto_now_add=True, verbose_name=_('datetime created'))
    datetime_modified = models.DateTimeField(auto_now=True, verbose_name=_('datetime modified'))

    # IMDB rating
    # age_limit

    class Meta:
        ordering = ('-datetime_created',)
        indexes = (
            models.Index(fields=['studio', 'day_of_week']),
            models.Index(fields=['day_of_week']),
            models.Index(fields=['-publication_datetime']),
            models.Index(fields=['publication_status']),
        )
        unique_together = ("en_title", "season")

    def __str__(self):
        return self.en_title

    def save(self, *args, **kwargs):
        if not self.pk:
            if not self.en_title:
                raise ValueError('en_title cant be empty')
            self.title_slug = generate_manhwa_slug(self.en_title)
        return super().save(*args, **kwargs)


class View(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='views',
        verbose_name=_('user')
    )
    manhwa = models.ForeignKey(Manhwa, on_delete=models.CASCADE, related_name='views', verbose_name=_('manhwa'))
    datetime_viewed = models.DateTimeField(auto_now_add=True, verbose_name=_('datetime viewed'))

    class Meta:
        unique_together = ('manhwa', 'user')
        ordering = ('-datetime_viewed',)
        indexes = (
            models.Index(fields=('manhwa',)),
        )

    def __str__(self):
        return f'user: {self.user.phone_number} manhwa: {self.manhwa.en_title}'


class Rate(models.Model):
    RATING_CHOICES = (
        (1, '1'), (2, '2'), (3, '3'),
        (4, '4'), (5, '5'),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rates',
        verbose_name=_('user')
    )
    manhwa = models.ForeignKey(Manhwa, on_delete=models.CASCADE, related_name='rates', verbose_name=_('manhwa'))
    rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES, verbose_name=_('rating'))

    class Meta:
        ordering = ('manhwa', 'rating',)
        unique_together = ('user', 'manhwa')
        indexes = (
            models.Index(fields=('manhwa', 'rating',)),
            models.Index(fields=('user', 'rating',)),
        )


class Chapter(models.Model):
    manhwa = models.ForeignKey(Manhwa, on_delete=models.PROTECT, related_name='chapters', verbose_name=_('manhwas'))
    title = models.CharField(max_length=255, blank=True)
    cover = models.ImageField(upload_to=chapter_cover_upload_to, blank=True)
    number = models.PositiveIntegerField(blank=True, editable=False, verbose_name=_('number of chapters'))
    is_free = models.BooleanField(default=False)
    zip_file = models.FileField(upload_to='temp_zips/', verbose_name=_('chapter zip file'))
    downloads_count = models.PositiveIntegerField(default=0, editable=False, verbose_name=_('download count'))

    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('datetime created'))

    class Meta:
        unique_together = ('number', 'manhwa')
        ordering = ('manhwa', 'number',)
        indexes = (
            models.Index(fields=['manhwa', 'number']),
            models.Index(fields=['-downloads_count']),
            models.Index(fields=['-created_at']),
        )
        
    def save(self, *args, **kwargs):
        if not self.pk :
            last_chapter = self.__class__.objects.filter(manhwa_id=self.manhwa_id).order_by('-created_at').values('number').first()
            self.number = 1 if last_chapter is None else last_chapter.get('number') + 1
            if not self.cover:
                self.cover = self.manhwa.cover

            self.update_last_chapter_on_manhwa(self.number)

        return super().save(*args, **kwargs)

    def update_last_chapter_on_manhwa(self, number):
        manhwa = Manhwa.objects.get(pk=self.manhwa_id)
        season, chapter = N(manhwa.season), N(number)
        last_upload = f'S{season}-E{chapter}'
        Manhwa.objects.filter(pk=self.manhwa_id).update(last_upload=last_upload, last_upload_time=timezone.now())

    def is_accessible_by(self, user):
        is_admin = user.is_staff
        is_subscriber = user.subscription.is_subscriber()
        is_free = self.is_free
        return is_free or is_admin or is_subscriber 

    def __str__(self):
        return f'manhwa {self.manhwa.title_slug}: chapter {self.number}'


class ChapterImage(models.Model):
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to=chapter_images_upload_to, storage=protected_storage)
    order = models.PositiveIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('chapter', 'order',)
        indexes = (
            models.Index(fields=('chapter', )),
        )


    def __str__(self):
        return str(self.order)


class Comment(models.Model):
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments'
        )
    manhwa = models.ForeignKey(Manhwa, on_delete=models.CASCADE, related_name='comments')
    text = models.TextField()
    is_spoiler = models.BooleanField(default=False)

    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    level = models.PositiveSmallIntegerField(default=0, editable=False)  # level of comment depth

    likes_count = models.PositiveIntegerField(default=0, editable=False)
    dis_likes_count = models.PositiveIntegerField(default=0, editable=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('manhwa', 'author', 'text')  # try except for same text and spam robot
        ordering = ('-created_at',)
        indexes = (
            models.Index(fields=['level']),
            models.Index(fields=['manhwa', '-created_at']),
            models.Index(fields=['author', '-created_at']),
            models.Index(fields=['parent', 'level']),
        )

    def save(self, *args, **kwargs):
        if self.parent and not self.pk:

            if self.parent.manhwa_id != self.manhwa_id:
                raise ValidationError('parent & child must sign to same manhwa.')

            self.level = self.parent.level + 1  # set comment level
            if self.level >= 3:
                raise ValidationError('depth of comment cant more than 3.')

        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.id}'


class CommentReactionManager(models.Manager):
    def toggle_reaction(self, user, comment_id, reaction):
        """
        if reaction exist and reaction was different, will update it.
        if reaction was same, will delete it.
        if reaction not exist, will create it.

        returns: (reaction_obj, action)
        action may be: 'updated', 'deleted', 'created'
        """
        with transaction.atomic():
            try:
                reaction_obj = self.select_for_update().get(  # lock update row
                    user=user,
                    comment_id=comment_id
                )
                old_reaction = reaction_obj.reaction

                if reaction_obj.reaction == reaction:  # unlike or undislike
                    reaction_obj.delete()
                    self._update_comment_reaction_counters(comment_id, old_reaction=old_reaction)
                    reaction_obj = None
                    action = 'deleted'

                else:
                    reaction_obj.reaction = reaction  # change reaction
                    reaction_obj.save(update_fields=['reaction'])
                    self._update_comment_reaction_counters(comment_id, old_reaction=old_reaction, new_reaction=reaction)
                    action = 'updated'

            except self.model.DoesNotExist:
                reaction_obj = self.create(
                    user=user,
                    comment_id=comment_id,
                    reaction=reaction
                )
                self._update_comment_reaction_counters(comment_id, new_reaction=reaction)
                action = 'created'

            return reaction_obj, action

    def _update_comment_reaction_counters(self, comment_id, old_reaction=None, new_reaction=None):
        """
        update likes_count, dis_likes_count, when need to update
        if reaction is deleted, new_reaction must be None!
        if reaction created, old_reaction must be None!
        and if reaction changed, you must set both old_reaction & new_reaction
        """
        updates = {}

        if old_reaction == self.model.LIKE: # if old reaction is Like
            updates['likes_count'] = F('likes_count') - 1
        elif old_reaction == self.model.DISLIKE:  # if old reaction is Dislike
            updates['dis_likes_count'] = F('dis_likes_count') - 1

        if new_reaction == self.model.LIKE:
            updates['likes_count'] = F('likes_count') + 1
        elif new_reaction == self.model.DISLIKE:
            updates['dis_likes_count'] = F('dis_likes_count') + 1

        if updates:
            Comment.objects.filter(pk=comment_id).update(**updates)

    def sync_comment_reaction_counters(self, comment_id):
        """update likes & dis_likes count fields from db and real count of reactions"""

        reactions = self.filter(comment_id=comment_id).aggregate(
            likes=Count(When(reaction='lk', then=1)),
            dis_likes=Count(When(reaction='dlk', then=1))
        )
        Comment.objects.filter(pk=comment_id).update(likes_count=reactions.likes, dis_likes_count=reactions.dis_likes)


class CommentReAction(models.Model):
    LIKE = 'lk'
    DISLIKE = 'dlk'

    COMMENT_REACTIONS = (
        (LIKE, 'like'),
        (DISLIKE, 'dislike'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comment_reactions',
        verbose_name=_('user')
    )
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='reactions', verbose_name=_('comment'))
    reaction = models.CharField(max_length=10, choices=COMMENT_REACTIONS, verbose_name=_('reaction'))

    objects = CommentReactionManager()

    class Meta:
        ordering = ('comment',)
        unique_together = ('user', 'comment')
        indexes = (
            models.Index(fields=('comment', 'reaction')),
        )


class Ticket(models.Model):
    STATUS_CHOICES = (
        (OPEN:='op', 'open ticket'),
        (CLOSE:='cl', 'close ticket'),
    )

    title = models.CharField(max_length=150, default='title not set')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tickets')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=OPEN)
    is_seen = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = (
            models.Index(fields=('status',)),
            models.Index(fields=('status', 'is_seen')),
        )

    def is_accessible_by(self, user):
        obj_owner = self.user.id
        is_owner = obj_owner == user.id
        is_admin = user.is_staff
        return is_admin or is_owner


class TicketMessage(models.Model):
    MESSAGE_SENDER = (
        (USER:='user', 'From User'),
        (ADMIN:='admin', 'From Admin'),
    )
    
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='messages')
    message_sender = models.CharField(max_length=20, choices=MESSAGE_SENDER, default=USER)
    text = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = (
            models.Index(fields=('ticket', 'message_sender',)),
        )


class WatchList(models.Model):
    WATCHING_STATUS = (
        (WILL_READING:='wr', 'Will Reading'),
        (NOW_READING:='nr', 'Now Reading'),
        (STOPPED:='st', 'Stpped'),
        (FINISHED:='fn', 'Finished'),
    )
    manhwa = models.ForeignKey(Manhwa, on_delete=models.CASCADE, related_name='watch_listed')
    user = models.ForeignKey(AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='watch_list')
    watching_status = models.CharField(choices=WATCHING_STATUS, max_length=10, default=WILL_READING, blank=True)

    class Meta:
        ordering = ('user',)
        unique_together = ('user', 'manhwa')
        indexes = (
            models.Index(fields=('user', 'watching_status')),
            models.Index(fields=('manhwa', 'watching_status')),
        )