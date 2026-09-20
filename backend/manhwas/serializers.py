from re import search

from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from django.urls import reverse
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

from accounts.models import CustomUser
from .models import ChapterImage, Manhwa, CommentReAction, Comment, Chapter, Studio, Ticket, TicketMessage, Rate, Genre, View, WatchList
from .services import ManhwaService


class CustomUserSerializer(serializers.ModelSerializer):
    is_subscriber = serializers.SerializerMethodField()
    avatar = serializers.URLField(source='avatar.url')
    class Meta:
        model = CustomUser
        # avatar , 
        fields = ('id', 'first_name', 'is_subscriber', 'avatar')

    def get_is_subscriber(self, obj):
        return obj.subscription.is_subscriber()


class GenreListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre 
        fields = ("id", "title", "description",)


class StudioListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Studio 
        fields = ("id", "title", "description",)


class ManhwaMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Manhwa
        fields = ('en_title', 'fa_title', 'title_slug', )


# COMMENTS
class CommentSerializer(serializers.ModelSerializer):
    author = CustomUserSerializer()
    replies_count = serializers.SerializerMethodField()
    user_reaction = serializers.CharField(max_length=1, read_only=True)
    manhwa_slug = serializers.CharField(source='manhwa.title_slug')

    class Meta:
        model = Comment
        fields = (
            'id', 'manhwa_slug', 'author', 'text', 'is_spoiler', 'parent',
            'level', 'likes_count', 'dis_likes_count',
            'replies_count', 'user_reaction', 'created_at',
        )

    def get_replies_count(self, obj):
        return obj.children.count()


class CommentDetailSerializer(serializers.ModelSerializer):
    replies_count = serializers.SerializerMethodField()
    manhwa = ManhwaMinimalSerializer()

    class Meta:
        model = Comment
        fields = (
            'id', 'manhwa', 'text', 'is_spoiler', 'parent',
            'level', 'likes_count', 'dis_likes_count',
            'replies_count', 'created_at',
        )

    def get_replies_count(self, obj):
        return obj.children.count()


class CreateCommentSerializer(serializers.ModelSerializer):
    author = CustomUserSerializer(read_only=True)
    user = serializers.HiddenField(source='author', default=serializers.CurrentUserDefault())

    class Meta:
        model = Comment
        fields = ('id', 'author', 'is_spoiler', 'text', 'parent', 'user')
        read_only_fields = ('author',)

    def validate_text(self, value):
        is_html = search(r'<[^>]+>', value)
        if is_html:
            raise serializers.ValidationError('text cant be included html tags.')

        return value

    def create(self, validated_data):
        try:
            return Comment.objects.create(**validated_data)

        except ValidationError as e:
            raise serializers.ValidationError(e.message_dict)

        except IntegrityError as e:
            raise serializers.ValidationError({
                'non_field_error': _('same text for comment not allowed.')
            })


class PatchCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ('text',)


# MANHWA
class ManhwaGenresSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ('title',)


class RatingDetailSerializer(serializers.Serializer):
    avg_rating = serializers.DecimalField(max_digits=3, decimal_places=1, read_only=True)
    raters_count = serializers.IntegerField(read_only=True)
    fives_count = serializers.IntegerField( read_only=True)
    fours_count = serializers.IntegerField(read_only=True)
    threes_count = serializers.IntegerField(read_only=True)
    twos_count = serializers.IntegerField(read_only=True)
    ones_count = serializers.IntegerField(read_only=True)


class ManhwaSerializer(serializers.ModelSerializer):
    comments_count = serializers.IntegerField( read_only=True)
    chapters_count = serializers.IntegerField( read_only=True)
    cover = serializers.URLField(source='cover.url', read_only=True)
    avg_rating = serializers.DecimalField(max_digits=3, decimal_places=1, read_only=True)
    slug = serializers.CharField(source='title_slug', read_only=True)

    class Meta:
        model = Manhwa
        fields = ('slug', 'fa_title', 'en_title', 'is_hot', 'avg_rating', 'season', 'day_of_week', 'publication_status', 'last_upload', 'last_upload_time', 'views_count', 'comments_count', 'chapters_count', 'cover', 'hero_cover')  # + 'comments'
        read_only_fields = ('comments_count', 'chapters_count', 'cover', 'avg_rating', 'slug', 'fa_title',)


class ManhwaDetailSerializer(serializers.ModelSerializer):
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    cover = serializers.URLField(source='cover.url', read_only=True)
    rating_data = serializers.SerializerMethodField()
    genres = GenreListSerializer(many=True)
    studio = StudioListSerializer()

    class Meta:
        model = Manhwa
        fields = (
            'fa_title', 'en_title', 'summary', 'genres', 'rating_data', 'season',
            'day_of_week', 'last_upload', 'studio', 'views_count', 'comments_count',
            'cover', 'publication_datetime', 'publication_status', 'is_hot', 'last_upload_time',
        )

    # def get_genres(self, obj):
    #     # return only title of genres instead of many dicts with key&value
    #     genres_qs = obj.genres.all()
    #     genres_obj = ManhwaGenresSerializer(genres_qs, many=True).data
    #     return [genre.get('title') for genre in genres_obj]

    def get_rating_data(self, obj):
        rating_data = ManhwaService().get_rating_data(obj)
        serializer = RatingDetailSerializer(rating_data)
        return serializer.data


class ManhwaTrackViewSerializer(serializers.Serializer):
    """dont remove it."""
    pass


class ManhwaRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rate
        fields = ('rating',)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._was_created = False

    def create(self, validated_data):
        manhwa_id = self.context['manhwa_id']
        user = self.context['request'].user
        rate_obj, self._was_created = Rate.objects.update_or_create(user=user, manhwa_id=manhwa_id, defaults=validated_data)
        return rate_obj

    @property
    def was_created(self):
        return self._was_created


# COMMENT REACTION
class CommentReactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommentReAction
        fields = ('id', 'user', 'comment', 'reaction',)
        read_only_fields = ('id', 'user')


class CommentReActionSerializer(serializers.ModelSerializer):
    reaction = serializers.ChoiceField(choices=CommentReAction.COMMENT_REACTIONS)

    class Meta:
        model = CommentReAction
        fields = ('reaction',)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._action = None

    def save(self, **kwargs):
        reaction_obj, self._action = CommentReAction.objects.toggle_reaction(
            user=self.context['request'].user,
            comment_id=self.context['comment_id'],
            reaction=self.validated_data['reaction']
        )
        return reaction_obj

    @property
    def action(self):
        return self._action


class CommentReactionToggleSerializer(serializers.Serializer):
    comment_id = serializers.IntegerField()
    reaction = serializers.ChoiceField(choices=CommentReAction.COMMENT_REACTIONS)

    def validate_comment_id(self, value):
        """check existing of comment"""
        try:
            Comment.objects.get(pk=value)
        except Comment.DoesNotExist:
            raise serializers.ValidationError("comment not fount")

        return value


# CHAPTER
class ChapterImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    image_number = serializers.CharField(source='order')
    class Meta:
        model = ChapterImage
        fields = ('image_number', 'image_url',)

    def get_image_url(self, obj):
        manhwa_slug = obj.chapter.manhwa.title_slug
        chapter_id = obj.chapter_id
        chapter_image_id = obj.id
        url = reverse('manhwa-chapter-image-list', args=[manhwa_slug, chapter_id, chapter_image_id])
        return url


class ChapterSerializer(serializers.ModelSerializer):
    images = serializers.SerializerMethodField()
    manhwa_slug = serializers.SlugRelatedField(source='manhwa', slug_field='title_slug', queryset=Manhwa.objects.all())
    is_accessible = serializers.SerializerMethodField()
    cover = serializers.CharField(source='cover.url', read_only=True)
    
    class Meta:
        model = Chapter
        fields = ['id', 'manhwa_slug', 'number', 'is_accessible', 'cover', 'images',  'created_at']

    def get_images(self, obj):
        images = obj.images.all()
        return ChapterImageSerializer(images, many=True).data

    def get_is_accessible(self, obj):
        request = self.context['request']
        return obj.is_accessible_by(request.user)


# TICKET
class ListTicketSerializer(serializers.ModelSerializer):
    messages_count = serializers.IntegerField(source='messages.count')
    class Meta:
        model = Ticket
        fields = ('id', 'title', 'user', 'status', 'is_seen', 'messages_count', 'created_at',)


class ListTicketForAdminSerializer(serializers.ModelSerializer):
    messages_count = serializers.IntegerField(source='messages.count')
    user = CustomUserSerializer()
    class Meta:
        model = Ticket
        fields = ('id', 'title', 'user', 'status', 'is_seen', 'messages_count', 'created_at',)


class CreateTicketSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=150, default='No Title')
    text = serializers.CharField(max_length=500, write_only=True)

    @transaction.atomic
    def create(self, validated_data):
        """
        create a ticket object and TicketMessage object.
        need to send user obj through the context.
        """
        ticket_obj = Ticket.objects.create(
            title=validated_data.get('title'),
            user=self.context['request'].user,
        )
        TicketMessage.objects.create(
            ticket=ticket_obj,
            text=validated_data['text'],
            user=self.context['request'].user,
        )
        return ticket_obj


class PatchTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ('status', 'is_seen',)


class GetTicketMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketMessage
        fields = ('id', 'user', 'text', 'message_sender', 'created_at', 'modified_at',)


class ListTicketMessagesSerializer(serializers.ModelSerializer):
    messages = GetTicketMessageSerializer(many=True, read_only=True)
    class Meta:
        model = Ticket
        fields = ('id', 'title', 'user', 'messages',)


class CreateTicketMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketMessage
        fields = ('id', 'text', 'message_sender', 'created_at')
        read_only_fields = ('message_sender', 'created_at',)

    def validate(self, attrs):
        ticket_obj = self.context['ticket']
        is_ticket_open = ticket_obj.status == Ticket.OPEN
        if not is_ticket_open:
            raise ValidationError('ticket is close.sending message for this ticket not allowed.')

        return super().validate(attrs)

    def save(self, **kwargs):
        request = self.context['request']
        ticket_obj = self.context['ticket']
        is_admin = request.user.is_staff
        return super().save(
            ticket_id = ticket_obj.id,
            user=request.user,
            message_sender=TicketMessage.ADMIN if is_admin else TicketMessage.USER,
            **kwargs,
        )


class UpdateTicketMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketMessage
        fields = ('text',)


# WATCH LIST
class PostWatchListSerializer(serializers.ModelSerializer):
    manhwa_slug = serializers.SlugRelatedField(source='manhwa', slug_field='title_slug', queryset=Manhwa.objects.all())
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = WatchList
        fields = ('id', 'manhwa_slug', 'watching_status', 'user',)
        validators = (
            UniqueTogetherValidator(
                queryset=WatchList.objects.all(), fields=('manhwa_slug', 'user')
            ),
        )


class WatchListSerializer(serializers.ModelSerializer):
    manhwa = ManhwaSerializer()
    class Meta:
        model = WatchList
        fields = ('id', 'manhwa', 'watching_status')


class PatchWatchListSerializer(serializers.ModelSerializer):
    class Meta:
        model = WatchList
        fields = ('watching_status',)
