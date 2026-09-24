from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.throttling import ScopedRateThrottle

from manhwas.paginations import CustomPagination
from .models import Notification
from .serializers import ListNotificationSerializer, PatchNotificationSerializer


class NotificationViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ('get', 'patch',)
    pagination_class = CustomPagination

    def get_throttles(self):
        match self.request.method:
            case 'GET':
               self.throttle_scope = 'hundred_in_minute' 

            case 'PATCH':
                self.throttle_scope = 'eight_in_minute'

            case _:
                raise NotImplementedError('action throttle not set.') 
              
        return [ScopedRateThrottle()]


    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ListNotificationSerializer
        return PatchNotificationSerializer

    def get_queryset(self):
        base_q = Notification.objects.select_related('sender', 'target_content_type').order_by('-created_at').all()
        user = self.request.user
        if user.is_staff :
            return base_q
        return base_q.filter(recipient_id=user.id)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        user_id = request.user.id
        unread_notif_count = Notification.objects.filter(recipient_id=user_id, is_read=False).count()
        return Response({'unread_count': unread_notif_count}, status=status.HTTP_200_OK)


