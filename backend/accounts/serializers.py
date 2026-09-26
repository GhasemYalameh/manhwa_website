from xml.dom import ValidationErr

from django.core.validators import RegexValidator
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from jsonschema import ValidationError
from rest_framework import serializers

from manhwas.models import Manhwa

from .models import CustomUser
from manhwas.serializers import CommentDetailSerializer, ManhwaSerializer

phone_regex = RegexValidator(
    regex=r"^09\d{9}$",
    message="phone number is not valid."
)
otp_regex = RegexValidator(
    regex=r"^\d+$",
    message="OTP must contain only numbers and const length."
)


def pass_validation(value):
    try:
        validate_password(value)
    except DjangoValidationError as e:
        raise serializers.ValidationError(list(e.messages))


class GetMeSerializer(serializers.ModelSerializer):
    is_subscriber = serializers.SerializerMethodField()
    avatar = serializers.CharField(source='avatar.url')
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ("id", "phone_number", "first_name", "last_name", "is_admin", "is_subscriber", "avatar",)

    def get_is_subscriber(self, obj):
        # return True
        return obj.subscription.is_subscriber()

    def get_is_admin(self, obj):
        return self.context['request'].user.is_staff


class PatchMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ("first_name", "last_name", "avatar",)


class UserProfileDetailSerializer(serializers.ModelSerializer):
    avatar = serializers.CharField(source='avatar.url')
    is_subscriber = serializers.SerializerMethodField()

    finished_manhwa_count = serializers.IntegerField(read_only=True)
    now_following_manhwa_count = serializers.IntegerField(read_only=True)
    will_reading_manhwa_count = serializers.IntegerField(read_only=True)
    total_comments = serializers.IntegerField(read_only=True)
    total_manhwa_viewed = serializers.IntegerField(read_only=True)
    total_manhwa_rated = serializers.IntegerField(read_only=True)

    last_comments = serializers.SerializerMethodField()
    interested_manhwas = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            'first_name', 'avatar', 'bio', 'date_joined', 'is_subscriber',
            'finished_manhwa_count', 'now_following_manhwa_count', 'will_reading_manhwa_count', 
            'total_comments', 'total_manhwa_viewed', 'total_manhwa_rated',
            'last_comments', 'interested_manhwas',
        )

    def get_is_subscriber(self, obj):
        return obj.subscription.is_subscriber()

    def get_last_comments(self, obj):
        my_comments = obj.comments.select_related('manhwa').prefetch_related('children').filter(level=0).order_by('-likes_count', '-created_at')[:5]
        return CommentDetailSerializer(my_comments, many=True).data

    def get_interested_manhwas(self, obj):
        manhwa_ids = obj.rates.select_related('manhwa').filter(rating__gte=4).order_by('-rating').values_list('manhwa_id', flat=True)[:10]
        return ManhwaSerializer(Manhwa.objects.prefetch_related('comments', 'views').filter(id__in=manhwa_ids), many=True).data


class GetPhoneNumberSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=11, validators=[phone_regex,])


class VerifyRegistrationOTPCodeSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=11, validators=[phone_regex])
    otp = serializers.CharField(max_length=8, validators=[otp_regex])


class VerifyChangePassOTPCodeSerializer(serializers.Serializer):
    otp = serializers.CharField(max_length=8, validators=[otp_regex])
    new_password = serializers.CharField(max_length=128)
    new_password2 = serializers.CharField(max_length=128)

    def validate(self, fields):
        if  fields.get('new_password') != fields.get('new_password2'):
            raise ValidationError({'new_password2': 'new password and new password2 are not same.'})
        return fields


class CompleteSignUpWithOTPSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ("first_name", "last_name", "email")


class SignUpWithPasswordSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(max_length=11, validators=[phone_regex,])
    password = serializers.CharField(required=True, write_only=True, validators=[pass_validation,])
    password2 = serializers.CharField(required=True, write_only=True)

    class Meta:
        model = CustomUser
        fields = ('phone_number', 'first_name', 'last_name', 'email', 'password', 'password2')

    def validate_phone_number(self, value):
        if CustomUser.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('an user with this phone number is already exist. please login.')
        return value
    
    def validate(self, fields):
        if fields.get('password') != fields.get('password2'):
            raise serializers.ValidationError({"password2": "passwords not same."})
        return fields

    def create(self, validated_data):
        password2 = validated_data.pop("password2")
        return CustomUser.objects.create_user(is_new_user=False, **validated_data)


class LoginWithPasswordSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=11, validators=[phone_regex,])
    password = serializers.CharField(required=True, write_only=True, validators=[pass_validation,])

    def validate_phone_number(self, value):
        if not CustomUser.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('user with that phone number is not exist. please signup first.')
        return value

    

