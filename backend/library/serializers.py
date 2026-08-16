from rest_framework import serializers

from accounts.models import User
from .models import Author, Book, Member, Loan


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = '__all__'


class BookSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.name', read_only=True)

    class Meta:
        model = Book
        fields = '__all__'


class MemberSerializer(serializers.ModelSerializer):

    user_id = serializers.PrimaryKeyRelatedField(
        source='user',
        queryset=User.objects.filter(role='member'),
        write_only=True
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

        read_only_fields = ['id', 'joined_date']

class LoanSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    member_name = serializers.CharField(source='member.name', read_only=True)

    class Meta:
        model = Loan
        fields = '__all__'