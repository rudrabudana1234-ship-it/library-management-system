from rest_framework import serializers

from accounts.models import User
from .models import Author, Book, Member, Loan


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = '__all__'


class BookSerializer(serializers.ModelSerializer):

    author_name = serializers.CharField(
        source='author.name',
        read_only=True
    )

    class Meta:
        model = Book
        fields = '__all__'

    def validate(self, attrs):

        quantity = attrs.get(
            'quantity',
            self.instance.quantity if self.instance else None
        )

        available = attrs.get(
            'available',
            self.instance.available if self.instance else None
        )

        if available is not None and available > quantity:
            raise serializers.ValidationError({
                'available':
                    'Available copies cannot be greater than total quantity.'
            })

        if quantity is not None and quantity < 0:
            raise serializers.ValidationError({
                'quantity':
                    'Quantity cannot be negative.'
            })

        if available is not None and available < 0:
            raise serializers.ValidationError({
                'available':
                    'Available copies cannot be negative.'
            })

        return attrs

    def create(self, validated_data):

        validated_data['available'] = validated_data['quantity']

        return Book.objects.create(
            **validated_data
        )

    def update(self, instance, validated_data):

        if 'quantity' in validated_data:

            new_quantity = validated_data['quantity']

            borrowed_copies = (
                instance.quantity - instance.available
            )

            new_available = (
                new_quantity - borrowed_copies
            )

            if new_available < 0:
                raise serializers.ValidationError({
                    'quantity':
                        f'Cannot reduce quantity below '
                        f'{borrowed_copies} borrowed copies.'
                })

            validated_data['available'] = new_available

        return super().update(
            instance,
            validated_data
        )
class MemberSerializer(serializers.ModelSerializer):

    user_id = serializers.PrimaryKeyRelatedField(
        source='user',
        queryset=User.objects.filter(role='member')
    )

    class Meta:
        model = Member
        fields = [
            'id',
            'user_id',
            'name',
            'email',
            'phone',
            'address',
            'joined_date',
            'is_active'
        ]

        read_only_fields = [
            'id',
            'joined_date'
        ]
class LoanSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    member_name = serializers.CharField(source='member.name', read_only=True)

    class Meta:
        model = Loan
        fields = '__all__'