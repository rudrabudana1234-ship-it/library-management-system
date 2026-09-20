
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('library', '0010_book_edition_book_edition_year'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notif_type', models.CharField(
                    choices=[
                        ('book_request_approved', 'Book Request Approved'),
                        ('book_request_rejected', 'Book Request Rejected'),
                        ('borrow_approved', 'Borrow Approved'),
                        ('return_requested', 'Return Requested'),
                        ('return_approved', 'Return Approved'),
                        ('loan_due_soon', 'Loan Due Soon'),
                        ('loan_overdue', 'Loan Overdue'),
                        ('reservation_available', 'Reserved Book Available'),
                        ('reservation_expired', 'Reservation Expired'),
                        ('fee_generated', 'Fee Generated'),
                        ('payment_successful', 'Payment Successful'),
                        ('waitlist_updated', 'Waitlist Updated'),
                    ],
                    max_length=40,
                )),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notifications',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
