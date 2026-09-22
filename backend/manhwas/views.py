from django.db import connection
from django.db.models import Avg, F, Value, Subquery, OuterRef, Prefetch, Count
from django.db.models.functions import Coalesce
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.functional import cached_property

from rest_framework import status, exceptions
from rest_framework.decorators import  APIView, action
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet, ModelViewSet
from rest_framework.generics import ListAPIView
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from . import serializers as srilzr
from .models import ChapterImage, Genre, Manhwa, Studio, View, CommentReAction, Comment, Chapter, Ticket, Rate, TicketMessage, WatchList
from .paginations import CustomPagination
from .permissions import IsOwnerOrAdmin
from .services import ManhwaService, get_today_weekly_name

comment_count_sq = (
    Comment.objects.filter(manhwa_id=OuterRef('pk'), level=0).order_by().values('manhwa')
    .annotate(count=Count('id')).values('count')
)
chapter_count_sq = (
    Chapter.objects.filter(manhwa_id=OuterRef('pk')).order_by().values('manhwa')
    .annotate(count=Count('id')).values('count')
)
avg_rating_sq = (
    Rate.objects.filter(manhwa_id=OuterRef('pk')).order_by().values('manhwa')
    .annotate(avg=Avg('rating')).values('avg')
    )

def health_check(request):
    return JsonResponse({'status': 'ok'})


class TicketViewSet(ModelViewSet):
    http_method_names = ('get', 'post', 'patch',)
    permission_classes = (IsAuthenticated,)
    pagination_class = CustomPagination
    filter_backends = (DjangoFilterBackend, OrderingFilter)
    ordering_fields = ('is_seen', 'status', 'created_at',)
    filterset_fields = ('status','is_seen')

    def get_queryset(self):
        query = Ticket.objects.select_related('user').prefetch_related('messages').all()
        if (self.action in ['list', 'retrieve']) and not self.request.user.is_staff:
            return query.filter(user=self.request.user)
        return query

    def get_serializer_class(self):
        if self.action == 'create':
            return srilzr.CreateTicketSerializer
        if self.action == 'partial_update':
            return srilzr.PatchTicketSerializer

        is_admin_user = self.request.user.is_staff
        if is_admin_user and self.action in ['list', 'retrieve'] :
            return srilzr.ListTicketForAdminSerializer

        return srilzr.ListTicketSerializer

    def get_permissions(self):
        if self.action == 'partial_update':
            return (IsAuthenticated(), IsAdminUser(),)
        return super().get_permissions()


class TicketMessageViewSet(ModelViewSet):
    permission_classes = (IsAuthenticated, IsOwnerOrAdmin)
    pagination_class = CustomPagination
    http_method_names = ('get', 'post', 'patch', 'delete',)

    def get_queryset(self):
        ticket_id = int(self.kwargs['ticket_pk'])
        ticket_messages_qs = TicketMessage.objects.filter(ticket_id=ticket_id)
        return ticket_messages_qs

    def get_serializer_context(self):
        context = {'ticket': self.get_ticket(),}
        return {**context, **super().get_serializer_context()}

    def get_serializer_class(self):
        match self.action:
            case 'partial_update':
                return srilzr.UpdateTicketMessageSerializer
            case 'create':
                return srilzr.CreateTicketMessageSerializer
            case _:
                return srilzr.GetTicketMessageSerializer

    def get_ticket(self):
        ticket_id = self.kwargs['ticket_pk']
        ticket_obj = get_object_or_404(Ticket, id=ticket_id)
        return ticket_obj


class CommentViewSet(ModelViewSet):
    pagination_class = CustomPagination
    http_method_names = ['get', 'post', 'patch', 'delete']

    @cached_property
    def manhwa(self):
        manhwa_slug = self.kwargs['manhwa_title_slug']
        return get_object_or_404(Manhwa, title_slug=manhwa_slug)

    def get_permissions(self):
        match self.action:
            case 'create' | 'partial_update' | 'destroy':
                return [IsAuthenticated()]
            case _:
                return [AllowAny()]
            
# ------ use cache for updating reactions instead  of directly to db -------
    def get_queryset(self):
        pk = self.kwargs.get('pk')
        base_qs = Comment.objects.filter(manhwa=self.manhwa)
        optimized_qs = base_qs.prefetch_related(
            Prefetch('children',queryset=Comment.objects.select_related('author'))
        ).select_related('author')

        match self.action:
            case 'create':
                return base_qs
            case 'partial_update' | 'destroy':
                return base_qs.filter(author_id=self.request.user.id)
            case 'list' :
                query = optimized_qs.filter(level=0)
                return query if not self.request.user.is_authenticated else query.annotate(
                    user_reaction=Coalesce(
                        Subquery(CommentReAction.objects.filter(
                            user_id=self.request.user.id,
                            comment_id=OuterRef('pk')
                            ).values('reaction')),
                        Value('no-reaction')
                    ),
                )

        return base_qs.filter(pk=pk)  # create, detail

    def get_serializer_class(self):
        match self.action:
            case 'create':
                return srilzr.CreateCommentSerializer
            case 'reaction':
                return srilzr.CommentReActionSerializer
            case 'partial_update':
                return srilzr.PatchCommentSerializer
            case _:
                return srilzr.CommentSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user, manhwa=self.manhwa)


    @action(detail=True, methods=['GET'])
    def replies(self, request, *args, **kwargs):
        comment_obj = self.get_object()
        serializer = self.get_serializer(comment_obj.children.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reaction(self, request, pk, *args, **kwargs):
        comment = self.get_object()
        serializer = self.get_serializer(data=request.data, context={'request': request, 'comment_id': pk})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        comment.refresh_from_db()
        comment_data = {'likes_count': comment.likes_count, 'dis_likes_count': comment.dis_likes_count}

        return Response({'action': serializer.action, 'comment': comment_data, 'reaction': serializer.data}, status=status.HTTP_200_OK)


class MyComment(APIView):
    permission_classes = (IsAuthenticated,)
    pagination_class = CustomPagination

    def get(self, request):
        my_comments_qs =  Comment.objects.filter(author_id=request.user.id).order_by('-created_at')
        serializer = srilzr.CommentDetailSerializer(my_comments_qs, many=True)
        return Response(serializer.data)


class ManhwaViewSet(ReadOnlyModelViewSet):
    lookup_field = 'title_slug'
    pagination_class = CustomPagination
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ('en_title', 'fa_title')
    ordering_fields = ('publication_datetime', 'avg_rating', 'views_count', 'last_upload_time', 'datetime_created',)
    filterset_fields = ('day_of_week', 'genres', 'studio')

# ---- many query in filter --------
    def get_queryset(self):
        base_query = Manhwa.objects.all()
        if self.action == 'list':
            return base_query.annotate(
                comments_count=Coalesce(Subquery(comment_count_sq), Value(0)),
                chapters_count=Coalesce(Subquery(chapter_count_sq), Value(0)),
                avg_rating=Coalesce(Subquery(avg_rating_sq), Value(0.0)),
            )
        return base_query

    def get_serializer_class(self):
        match self.action:
            case 'rate':
                return srilzr.ManhwaRatingSerializer
            case 'cache_view':
                return srilzr.ManhwaTrackViewSerializer
            case 'retrieve':
                return srilzr.ManhwaDetailSerializer
            case _:
                return srilzr.ManhwaSerializer

    @action(detail=False, methods=('get',))
    def today(self, request):
        today_name = get_today_weekly_name()
        manhwas = Manhwa.objects.filter(
            publication_status=Manhwa.CURRENTLY_PUBLISHING, 
            day_of_week=today_name,
            ).annotate(
                comments_count=Coalesce(Subquery(comment_count_sq), Value(0)),
                chapters_count=Coalesce(Subquery(chapter_count_sq), Value(0)),
                avg_rating=Coalesce(Subquery(avg_rating_sq), Value(0.0)),
            )
        serializer = self.get_serializer(manhwas, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post', 'get'], permission_classes=(IsAuthenticated,))
    def rate(self, request, title_slug=None):
        manhwa_obj = self.get_object()
        if request.method == 'GET':
            serializer = self.get_serializer(get_object_or_404(Rate, user=request.user, manhwa_id=manhwa_obj.id))
            return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=request.data, context={'request': request, 'manhwa_id': manhwa_obj.id})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED if serializer.was_created else status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=(IsAuthenticated,))
    def view(self, request, title_slug=None):
        manhwa_obj = self.get_object()
        if ManhwaService().is_exist_view(manhwa_id=manhwa_obj.id, user_id=request.user.id):
            return Response({'tracked': False, 'message': 'view exists in cache.'}, status=status.HTTP_200_OK)

        if View.objects.filter(user=request.user, manhwa_id=manhwa_obj.id).exists():
            return Response({'tracked': False, 'message': 'view exists in db.'}, status=status.HTTP_200_OK)

        ManhwaService().track_view(user_id=request.user.id, manhwa_id=manhwa_obj.id)
        return Response({'tracked': True, 'message': 'view added.'}, status=status.HTTP_200_OK)


class ChapterViewSet(ReadOnlyModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = srilzr.ChapterSerializer

    def get_queryset(self):
        manhwa_slug = self.kwargs.get('manhwa_title_slug')
        return Chapter.objects.select_related('manhwa').prefetch_related('images').filter(manhwa__title_slug=manhwa_slug)


class ProtectedChapterImageView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, title_slug, chapter_id, image_id):
        chapter_image = get_object_or_404(ChapterImage, id=image_id, chapter_id=chapter_id)
        user = request.user
        if not chapter_image.chapter.is_accessible_by(user):
            raise exceptions.PermissionDenied(detail='you have to by subscription for continue', code=status.HTTP_403_FORBIDDEN)

        response = HttpResponse()
        response['X-Accel-Redirect'] = f'/internal/{chapter_image.image.name}'
        return response


class GenreListApiView(ListAPIView):
    serializer_class = srilzr.GenreListSerializer
    queryset = Genre.objects.all()


class StudioListApiView(ListAPIView):
    serializer_class = srilzr.StudioListSerializer
    queryset = Studio.objects.all()


class WatchListViewSet(ModelViewSet):
    http_method_names = ('get', 'post', 'patch', 'delete',)
    permission_classes = (IsAuthenticated,)
    pagination_class = CustomPagination
    filterset_fields = ('user',)

    def get_serializer_class(self):
        if self.action == 'partial_update':
            return srilzr.PatchWatchListSerializer
        elif self.action == 'create':
            return srilzr.PostWatchListSerializer

        return srilzr.WatchListSerializer

    def get_queryset(self):
        qs = WatchList.objects.select_related('manhwa', ).prefetch_related('manhwa__comments')
        return qs.filter(user_id=self.request.user.id)


def delete_db(model_class):
    table_name = model_class._meta.db_table
    with connection.cursor() as cursor:
        cursor.execute(f"DELETE FROM {table_name}")
        cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table_name}'")
