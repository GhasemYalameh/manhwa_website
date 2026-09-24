from django.contrib import admin
from django.db.models import Count, OuterRef, Subquery
from django.utils.html import format_html, urlencode
from django.urls import reverse

from manhwas.tasks import create_chapter_image_objects

from .models import ChapterImage, Manhwa, Chapter, Studio, Genre, Rate, View, CommentReAction, Comment, Ticket, TicketMessage, WatchList


class ChapterInline(admin.TabularInline):
    model = Chapter
    fields = ['number', 'zip_file']
    readonly_fields = ['number']
    extra = 0


@admin.register(Manhwa)
class ManhwaAdmin(admin.ModelAdmin):
    list_display = ('en_title', 'season', 'views_count', 'get_genres', 'chapters_count', 'comments_count')
    autocomplete_fields = ['genres', 'studio']
    list_filter = ['genres', 'day_of_week', 'studio']
    search_fields = ['en_title']
    inlines = [ChapterInline]

    def get_queryset(self, request):
        return super(ManhwaAdmin, self)\
            .get_queryset(request)\
            .prefetch_related('genres')\
            .select_related('studio')\
            .annotate(
                chapters_count=Subquery(
                    Chapter.objects
                    .filter(manhwa=OuterRef('pk'))
                    .values('manhwa')
                    .annotate(count=Count('id'))
                    .values('count')
                ),
                comments_count=Subquery(
                    Comment.objects
                    .filter(manhwa=OuterRef('pk'))
                    .values('manhwa')
                    .annotate(count=Count('id'))
                    .values('count')
                )
            )

    def get_genres(self, obj):
        return ', '.join([genre.title for genre in obj.genres.all()])
    get_genres.short_description = 'Genre'

    @admin.display(description='Chapters', ordering='chapters_count')
    def chapters_count(self, manhwa):
        url = reverse('admin:manhwas_chapter_changelist') + "?" + urlencode({'manhwa__id': manhwa.id})
        return format_html('<a href="{}">{}</a>', url, manhwa.chapters_count or 0)

    @admin.display(description='Comments', ordering='comments_count')
    def comments_count(self, manhwa):
        url = reverse('admin:manhwas_comment_changelist') + '?' + urlencode({'manhwa__id': manhwa.id})

        return format_html('<a href="{}">{}</a>', url, manhwa.comments_count or 0)


@admin.register(View)
class ViewAdmin(admin.ModelAdmin):
    list_display = ('user', 'manhwa', 'datetime_viewed')


@admin.register(Rate)
class RateAdmin(admin.ModelAdmin):
    list_display = ('user', 'manhwa', 'rating')


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ('title',)
    search_fields = ['title']


@admin.register(Studio)
class StudioAdmin(admin.ModelAdmin):
    list_display = ('title',)
    search_fields = ['title']


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ('manhwa', 'downloads_count', 'number',)

    def save_model(self, request, obj, form, change):
        is_new_zip = 'zip_file' in form.changed_data and obj.zip_file
        super().save_model(request, obj, form, change)

        # if is_new_zip:
        #     create_chapter_image_objects.delay(obj.id)

@admin.register(ChapterImage)
class ChapterImageAdmin(admin.ModelAdmin):
    list_display = ('chapter', 'order',)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'manhwa', 'parent', 'level', 'created_at', 'updated_at')


@admin.register(CommentReAction)
class CommentReActionAdmin(admin.ModelAdmin):
    list_display = ('user', 'comment', 'reaction')


class TicketMessageInline(admin.TabularInline):
    model = TicketMessage
    fields = ('text', 'message_sender', 'user', 'created_at', )
    readonly_fields = ('text', 'message_sender', 'user', 'created_at',)
    extra = 0

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'user', 'status', 'is_seen')
    inlines = [TicketMessageInline]


@admin.register(TicketMessage)
class TicketMessageAdmin(admin.ModelAdmin):
    list_display = ('text', 'user', 'created_at',)
    list_filter = ('message_sender',)


@admin.register(WatchList)
class WatchListAdmin(admin.ModelAdmin):
    list_display = ('manhwa', 'user',)
    ordering = ('manhwa',)
    autocomplete_fields = ('user', 'manhwa')

