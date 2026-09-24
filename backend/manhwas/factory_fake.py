from pathlib import Path

from charset_normalizer import from_path
import factory, secrets, random
from faker import Faker
from factory.django import DjangoModelFactory
from datetime import timedelta

from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import *

BASE_DIR = Path(__file__).resolve().parent.parent 
FILE_OR_IMAGE_DIR =  BASE_DIR / 'db_images'

fake = Faker()

MANHWA_GENRES = [
    "اکشن", "کمدی", "درام", "ترسناک", "عاشقانه", "علمی تخیلی", "خیانت", "مثبت ۱۴ سال",
    "مستند", "انیمیشن", "هیجانی", "جنایی", "فانتزی", "پلیسی",
]
PREFIX_NUMBERS = (
    '0910', '0912', '0913', '0914', '0915',
    '0917', '0918', '0994', '0992', '0991',
)
DAY_OF_WEEK = (
    'sat', 'sun', 'mon', 'tue', 
    'thu', 'wed', 'fri', 
)
PUBLICATION_STATUS = (
    'cp', 'c', 'up'
)
COMMENT_REACTION_CHOICES = ('lk', 'dlk',)


def get_random_image():
    images = list(FILE_OR_IMAGE_DIR.glob("*.jpg")) + list(FILE_OR_IMAGE_DIR.glob("*.png")) + list(FILE_OR_IMAGE_DIR.glob("*.webp"))
    if not images:
        raise FileNotFoundError("no images found in", str(FILE_OR_IMAGE_DIR))
    return secrets.choice(images)

def get_random_zip_file():
    zip_files = list(FILE_OR_IMAGE_DIR.glob("*.zip")) 
    if not zip_files:
        raise FileNotFoundError("no zip file found in", str(FILE_OR_IMAGE_DIR))
    return secrets.choice(zip_files)


class StudioFactory(DjangoModelFactory):
    class Meta:
        model = Studio
        django_get_or_create = ('title',)
    title = factory.Faker('name',)
    description = factory.Faker('paragraph', nb_sentences=2, locale='fa_IR')


class GenreFactory(DjangoModelFactory):
    class Meta:
        model = Genre
        django_get_or_create = ('title',)
    title = factory.LazyFunction(lambda : random.choice(MANHWA_GENRES))
    description = factory.Faker('paragraph', nb_sentences=2, locale='fa_IR')


class GenresList:
    genres_list = []
    @classmethod
    def set(cls, genres_list):
        cls.genres_list = genres_list


class ManhwaFactory(DjangoModelFactory):
    class Meta:
        model = Manhwa
        django_get_or_create = ('en_title',)

    en_title = factory.Faker('sentence', nb_words=5)
    fa_title = factory.Faker('sentence', nb_words=4, locale='fa_IR')
    summary = factory.Faker('paragraph', nb_sentences=10, locale='fa_IR')
    day_of_week = factory.LazyFunction(lambda : random.choice(DAY_OF_WEEK))
    # cover = factory.django.ImageField(size=(450, 350),format='JPEG')
    cover = factory.django.ImageField(from_path=factory.LazyFunction(get_random_image))
    hero_cover = factory.django.ImageField(size=(720, 1080),format='JPEG')
    publication_status = factory.LazyFunction(lambda : random.choice(PUBLICATION_STATUS))
    views_count = factory.LazyFunction(lambda : random.randint(200, 30000))
    publication_datetime = factory.LazyFunction(
        lambda : timezone.now() - timedelta(days=random.randint(1, 1000))
    )
    datetime_created =factory.LazyFunction(
        lambda : timezone.now() - timedelta(days=random.randint(1, 100))
    )
    last_upload_time =factory.LazyFunction(
        lambda : timezone.now() - timedelta(days=random.randint(1, 100))
    )

    @factory.post_generation
    def genres(self, create, extracted, **kwargs):
        """
        choice 2-5 random genres
        """
        if create:
            num_genres = random.randint(2, 5)
            selected_genres = random.sample(GenresList.genres_list, num_genres)
            self.genres.set(selected_genres)


class UserFactory(DjangoModelFactory):
    class Meta:
        model = get_user_model()
        django_get_or_create = ('phone_number',)

    first_name = factory.Faker('first_name', locale='fa_IR')
    last_name = factory.Faker('last_name', locale='fa_IR')
    is_new_user = False
    phone_number = factory.LazyFunction(lambda : random.choice(PREFIX_NUMBERS) + ''.join([str(random.randint(0, 9)) for _ in range(7)]))
    email = factory.LazyAttribute(lambda obj: f'{obj.first_name}-{obj.last_name}@gmail.com')


class CommentFactory(DjangoModelFactory):
    class Meta:
        model = Comment

    text = factory.Faker('paragraph', nb_sentences=3, locale='fa_IR')
    created_at = factory.LazyFunction(
        lambda : fake.date_time_between(start_date='-3y', end_date='now')
    )


class CommentReactionFactory(DjangoModelFactory):
    class Meta: 
        model = CommentReAction

    reaction = factory.LazyFunction(lambda: random.choice(COMMENT_REACTION_CHOICES))


class ChapterFactory(DjangoModelFactory):
    class Meta:
        model = Chapter

    title = factory.Faker('sentence', nb_words=4, locale='fa_IR')
    is_free = factory.LazyFunction(lambda: random.randint(0, 10) % 2 == 0)
    zip_file = factory.django.ImageField(from_path=factory.LazyFunction(get_random_zip_file))
    downloads_count = factory.LazyFunction(lambda: random.randint(100, 20000))
    created_at = factory.LazyFunction(
        lambda : fake.date_time_between(start_date='-3y', end_date='now')
    )


class ViewFactory(DjangoModelFactory):
    class Meta:
        model = View

    datetime_viewed = factory.LazyFunction(
        lambda : fake.date_time_between(start_date='-3y', end_date='now')
    )
    

class RateFactory(DjangoModelFactory):
    class Meta:
        model = Rate

    rating = factory.LazyFunction(lambda: random.randint(1, 5))


class ViewFactory(DjangoModelFactory):
    class Meta:
        model = View



