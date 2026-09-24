from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .tasks import create_chapter_image_objects
from manhwas.models import Chapter, Comment, Ticket, TicketMessage
from notifications.models import Notification
from notifications.tasks import chapter_published_notification


# @receiver(post_save, sender=Chapter)
# def create_notif_when_chapter_created(sender, instance, created, **kwargs):
#     if created:
#         chapter_published_notification.delay(instance.id)

@receiver(post_save, sender=Comment)
def create_notify_when_comment_replied(sender, instance, created, **kwargs):
    if not (created and instance.parent) :
        return 

    Notification.objects.create(
        recipient_id=instance.parent.author_id,
        sender_id=instance.author_id,
        notif_type=Notification.REPLIED_COMMENT,
        target_object=instance
    )

@receiver(post_save, sender=TicketMessage)
def update_ticket_when_ticket_message_created(sender, instance, created, **kwargs):
    if created and instance.message_sender == TicketMessage.USER:
        Ticket.objects.filter(id=instance.ticket_id).update(is_seen=False)

@receiver(post_save, sender=Chapter)
def create_chapter_images_after_chapter_creation(sender, instance, created, **kwargs):
    if created :
        transaction.on_commit(lambda: create_chapter_image_objects.delay(instance.id))
        
