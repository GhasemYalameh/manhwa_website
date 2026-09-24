from django.db.models import Count, OuterRef, Subquery, IntegerField
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle

from accounts.services.otp import BlackListManager
from manhwas.models import Rate, View, WatchList, Comment
from .models import CustomUser
from .services import OTP
from .serializers import (
    CompleteSignUpWithOTPSerializer, GetPhoneNumberSerializer, LoginWithPasswordSerializer, GetMeSerializer, VerifyChangePassOTPCodeSerializer, 
    VerifyRegistrationOTPCodeSerializer, PatchMeSerializer,  SignUpWithPasswordSerializer, UserProfileDetailSerializer,
)


class MeApiView(APIView):
    permission_classes=[IsAuthenticated]
    
    def get_throttles(self):
        match self.request.method:
            case 'GET':
               self.throttle_scope = 'hundred_in_minute' 

            case 'PATCH':
                self.throttle_scope = 'three_in_hour'

            case _:
                raise NotImplementedError('action throttle not set.') 
              
        return [ScopedRateThrottle()]

    def get(self, request):
        user = CustomUser.objects.prefetch_related('subscription').get(pk=request.user.id)
        serializer = GetMeSerializer(user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = PatchMeSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserProfileDetailView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'hundred_in_minute'

    def get(self, request, uid: str):
        # subqueries
        watch_list_qs = WatchList.objects.filter(user_id=OuterRef('pk'))
        finished_sq = watch_list_qs.filter(watching_status=WatchList.FINISHED).values('user_id').annotate(c=Count('id')).values('c')
        now_reading_sq = watch_list_qs.filter(watching_status=WatchList.NOW_READING).values('user_id').annotate(c=Count('id')).values('c')
        will_reading_sq = watch_list_qs.filter(watching_status=WatchList.WILL_READING).values('user_id').annotate(c=Count('id')).values('c')
        comments_sq = Comment.objects.filter(author_id=OuterRef('pk')).values('author_id').annotate(c=Count('id')).values('c')
        views_sq = View.objects.filter(user_id=OuterRef('pk')).values('user_id').annotate(c=Count('id')).values('c')
        rates_sq = Rate.objects.filter(user_id=OuterRef('pk')).values('user_id').annotate(c=Count('id')).values('c')

        # main queryset
        annotated_qs = CustomUser.objects.annotate(
            finished_manhwa_count=Coalesce(Subquery(finished_sq, output_field=IntegerField()), 0),
            now_following_manhwa_count=Coalesce(Subquery(now_reading_sq, output_field=IntegerField()), 0),
            will_reading_manhwa_count=Coalesce(Subquery(will_reading_sq, output_field=IntegerField()), 0),
            total_comments=Coalesce(Subquery(comments_sq, output_field=IntegerField()), 0),
            total_manhwa_viewed=Coalesce(Subquery(views_sq, output_field=IntegerField()), 0),
            total_manhwa_rated=Coalesce(Subquery(rates_sq, output_field=IntegerField()), 0),
        )
        user = get_object_or_404(annotated_qs, id=uid)
        serializer = UserProfileDetailSerializer(user)
        return Response(serializer.data)


class GenerateRegistrationOTPApiView(APIView):
    """
    generating OTP and send via sms.
    """    

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'five_in_hour'

    def post(self, request):
        serializer = GetPhoneNumberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone_number = serializer.validated_data['phone_number']
        otp = OTP(phone_number)

        if otp.is_blacklisted():  # check if user in blacklist
            return Response('your now in blacklist. please try again later', status=status.HTTP_403_FORBIDDEN)

        otp_code = otp.generate_otp_code()
        if not otp_code:
            return Response('the OTP code is already generated. please send it for verification.', status=status.HTTP_406_NOT_ACCEPTABLE)

        otp.send_sms(otp_code)  # sms the otp here
        return Response('your otp code generated. please send it to us for verification', status=status.HTTP_201_CREATED)


class VerifyRegistrationOTPApiView(APIView):
    """
    verify otp code and register user.
    returns access token and refresh token.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'five_in_hour'

    def post(self, request):
        serializer = VerifyRegistrationOTPCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone_number = serializer.validated_data['phone_number']
        otp = serializer.validated_data['otp']
        otp_service = OTP(phone_number)  

        if otp_service.is_blacklisted():  # check if user in blacklist
            return Response('your now in blacklist. please try again later', status=status.HTTP_403_FORBIDDEN)

        # Wrong OTP code condition
        is_verified = otp_service.verify_otp_code(otp)
        if not is_verified:
            attempt_count = otp_service.check_attempts()
            if attempt_count == -1:
                return Response('you are added to blacklist because of most attempt.', status=status.HTTP_403_FORBIDDEN)

            return Response(f'incorrect OTP code!. remaining attempt is : {otp_service.max_attempts - attempt_count}', status=status.HTTP_400_BAD_REQUEST)

        otp_service.delete_cached_keys()

        user_query = CustomUser.objects.filter(phone_number=phone_number)
        user = user_query.first() if user_query.exists() else CustomUser.objects.create_user_via_otp(phone_number=phone_number)
        is_new_user = user.is_new_user
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'refresh_token': str(refresh),
                'access_token': str(refresh.access_token),
                'is_new_user': is_new_user,
            },
            status=status.HTTP_200_OK
        )


class SignUpWithPasswordApiView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'five_in_hour'

    def post(self, request):
        serializer = SignUpWithPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({"refresh_token": str(refresh), "access_token": str(refresh.access_token)}, status=status.HTTP_200_OK)


class CompleteSignUpWithOTPApiView(APIView):
    """
    after creating new user, user must redirected to this view for completion of signin.
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'five_in_hour'
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = CompleteSignUpWithOTPSerializer(data=request.data, instance=request.user, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(is_new_user=False)
        return Response('sign up completed', status=status.HTTP_200_OK)


class LoginWithPasswordApiView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'five_in_hour'

    def post(self, request):
        serializer = LoginWithPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone_number = serializer.validated_data['phone_number']
        password = serializer.validated_data['password']

        # user blacklisted condition
        blk_service = BlackListManager(phone_number)
        if blk_service.is_blacklisted():
            return Response("you are black listed now. please try again later.", status=status.HTTP_403_FORBIDDEN)

        # wrong password condition
        user = CustomUser.objects.get(phone_number=phone_number)
        if not user.check_password(password):
            attempts_count = blk_service.check_attempts()
            if attempts_count == -1:
                return Response('you added to black list  because of many wrong attempts.', status=status.HTTP_400_BAD_REQUEST)
            return Response(
                f'invalid password. remaining attempts: {blk_service.max_attempts - attempts_count}',
                status=status.HTTP_400_BAD_REQUEST
            )
        
        refresh = RefreshToken.for_user(user)
        return Response({"refresh_token": str(refresh), "access_token": str(refresh.access_token)}, status=status.HTTP_200_OK)


class GenerateChangePassOTPApiView(APIView):
    """
    when user wanna change herself password, he must generate an OTP
    to confirm change password.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'five_in_hour'
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        phone_number:str = request.user.phone_number
        otp = OTP(phone_number)

        if otp.is_blacklisted():  # check if user in blacklist
            return Response('your now in blacklist. please try again later', status=status.HTTP_403_FORBIDDEN)

        otp_code = otp.generate_otp_code()
        if not otp_code:
            return Response('the OTP code is already generated. please send it for verification.', status=status.HTTP_406_NOT_ACCEPTABLE)

        otp.send_sms(otp_code)  # sms the otp here
        return Response('your otp code generated. please send it to us for verification', status=status.HTTP_201_CREATED)


class VerifyChangePassOTPApiView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'five_in_hour'
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = VerifyChangePassOTPCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_password = serializer.validated_data['new_password']
        otp = serializer.validated_data['otp']
        phone_number = request.user.phone_number

        is_verified, code, error = self.verify_otp(phone_number, otp)
        if not is_verified:
            return Response(error, status=code)

        tokens = self.change_password_for_user(request.user, new_password)
        return Response(tokens)

    def change_password_for_user(self, user, new_password):
        user.set_password(new_password)
        user.save(update_fields=('password',))

        tokens = OutstandingToken.objects.filter(user=user, expires_at__gt=timezone.now())
        BlacklistedToken.objects.bulk_create([BlacklistedToken(token=token) for token in tokens], ignore_conflicts=True)

        refresh = RefreshToken.for_user(user)
        return {'refresh_token': str(refresh), 'access_token': str(refresh.access_token)}

    def verify_otp(self, phone_number, otp):
        """
        returns is_verified , status code, error dic
        """
        otp_service = OTP(phone_number)  

        if otp_service.is_blacklisted():  # check if user in blacklist
            error = {'message': 'your now in blacklist. please try again later', 'ttl': otp_service.get_blacklisted_ttl}
            code = 403
            return False, code, error


        # Wrong OTP code condition
        is_verified = otp_service.verify_otp_code(otp)
        if not is_verified:
            attempt_count = otp_service.check_attempts()
            if attempt_count == -1:
                error = {
                    'message': 'you are added to blacklist because of most attempt.', 
                    'ttl': otp_service.get_blacklisted_ttl
                }
                code = 403
                return False, code, error
            return False, 400, {'message': 'incorrect OTP code!', 'remaining': otp_service.max_attempts - attempt_count}

        otp_service.delete_cached_keys()
        return True, 200, None
