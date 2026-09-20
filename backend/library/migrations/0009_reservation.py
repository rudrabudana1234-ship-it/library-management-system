from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('library', '0008_payment'),
    ]

    operations = [
        migrations.CreateModel(
            name='Reservation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(
                    choices=[
                        ('waiting', 'Waiting'),
                        ('available', 'Available'),
                        ('borrowed', 'Borrowed'),
                        ('cancelled', 'Cancelled'),
                        ('expired', 'Expired'),
                    ],
                    default='waiting',
                    max_length=20,
                )),
                ('queue_position', models.PositiveIntegerField(default=0)),
                ('reserved_at', models.DateTimeField(auto_now_add=True)),
                ('notified_at', models.DateTimeField(blank=True, null=True)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('book', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reservations',
                    to='library.book',
                )),
                ('member', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reservations',
                    to='library.member',
                )),
            ],
            options={
                'ordering': ['book', 'reserved_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='reservation',
            constraint=models.UniqueConstraint(
                condition=models.Q(status__in=['waiting', 'available']),
                fields=['member', 'book'],
                name='unique_active_reservation',
            ),
        ),
    ]
