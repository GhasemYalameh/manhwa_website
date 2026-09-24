from django.shortcuts import get_object_or_404
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle

from .services import SubscriptionService
from .models import SubscriptionOrder, SubscriptionPlan
from . import serializers as srlzr


class SubscriptionApi(APIView):
    permission_classes = [IsAuthenticated,]

    def get_throttles(self):
        match self.request.method:
            case 'GET':
               self.throttle_scope = 'hundred_in_minute' 

            case 'POST':
                self.throttle_scope = 'five_in_hour'

            case _:
                raise NotImplementedError('action throttle not set.') 
              
        return [ScopedRateThrottle()]

    def get(self, request):
        sub_service = SubscriptionService(request)
        obj = srlzr.SubscriptionSerializer(sub_service.sub_obj)
        return Response(obj.data, status=status.HTTP_200_OK)

    def post(self, request):
        # receiving plan id
        plan_serializer = srlzr.GetSubscriptionPlanSerializer(data=request.data)
        plan_serializer.is_valid(raise_exception=True)
        plan_obj = plan_serializer.validated_data['plan']

        sub_service = SubscriptionService(request)
        payment_url, error = sub_service.create_payment_url(plan_obj)
        if payment_url:
            return Response({'payment_url': payment_url}) # an url with payment authority

        return Response(error, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubscriptionVerify(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'five_in_hour'
    permission_classes = [IsAuthenticated, ]

    def get(self, request):
        authority = request.GET.get('Authority')
        payment_status = request.GET.get('Status')
        sub_service = SubscriptionService(request)

        if payment_status and payment_status.lower() == 'ok':
            order_obj = get_object_or_404(SubscriptionOrder, authority=authority, user=request.user)
            if order_obj.is_consumed == True:
                return Response("this subscription has been consumed.", status=status.HTTP_226_IM_USED)

            is_verified, errors = sub_service.verify_payment(order_obj)
            if not is_verified:
                return Response(errors, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            sub_service.apply_subscription(order_obj)
            return Response("your subscription verified successfully. ", status=status.HTTP_200_OK)
            
        return Response('subscription failed.', status=status.HTTP_412_PRECONDITION_FAILED)


class SubscriptionPlanList(ListAPIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'hundred_in_minute'
    serializer_class = srlzr.SubscriptionPlanListSerializer
    queryset = SubscriptionPlan.objects.filter(is_purchasable=True)


class SubscriptionOrderList(ListAPIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'hundred_in_minute'
    permission_classes = (IsAuthenticated,)
    serializer_class = srlzr.SubscriptionOrderSerializer

    def get_queryset(self):
        return SubscriptionOrder.objects.filter(user=self.request.user)