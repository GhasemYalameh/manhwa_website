from django.urls import path, include
from . import views
from rest_framework_nested import routers

router = routers.SimpleRouter()
router.register('manhwas', views.ManhwaViewSet, basename='manhwa')  # list & retrieve (manhwa-list, manhwa-detail)
manhwa_router = routers.NestedSimpleRouter(router, 'manhwas', lookup='manhwa')
manhwa_router.register('comments', views.CommentViewSet, basename='manhwa-comments')
manhwa_router.register('chapters', views.ChapterViewSet, basename='manhwa-chapters')

router2 = routers.SimpleRouter()
router2.register('tickets', views.TicketViewSet, basename='ticket')
ticket_router = routers.NestedSimpleRouter(router2, 'tickets', lookup='ticket')
ticket_router.register('messages', views.TicketMessageViewSet, basename='ticket-messages')

router3 = routers.SimpleRouter()
router3.register('watchlist', views.WatchListViewSet, basename='watchlist')

urlpatterns = [
    path('healthy/', views.health_check, name='health-check'),
    path('genre/', views.GenreListApiView.as_view(), name='genre-list'),
    path('studio/', views.StudioListApiView.as_view(), name='studio-list'),
    path('comments/mine/', views.MyComment.as_view(), name='my-comment-list'),
    path('manhwas/<slug:title_slug>/chapters/<int:chapter_id>/images/<int:image_id>', views.ProtectedChapterImageView.as_view(), name='manhwa-chapter-image-list'),
    path('', include(router.urls)),
    path('', include(manhwa_router.urls)),
    path('', include(router2.urls)),
    path('', include(ticket_router.urls)),
    path('', include(router3.urls)),
]
