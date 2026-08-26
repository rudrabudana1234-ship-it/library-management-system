from rest_framework import serializers

from accounts.models import User

from .models import (
    Category,
    Author,
    Book,
    Member,
    Loan,
    BookRequest,
    RecentSearch,
)


# =========================================================
# CATEGORY
# =========================================================

class CategorySerializer(serializers.ModelSerializer):

    book_count = serializers.IntegerField(
        source='books.count',
        read_only=True
    )

    class Meta:
        model = Category

        fields = [
            'id',
            'name',
            'description',
            'book_count',
            'created_at'
        ]

        read_only_fields = [
            'id',
            'book_count',
            'created_at'
        ]


# =========================================================
# AUTHOR
# =========================================================

class AuthorSerializer(serializers.ModelSerializer):

    class Meta:
        model = Author
        fields = '__all__'


# =========================================================
# BOOK
# =========================================================

class BookSerializer(serializers.ModelSerializer):

    author_name = serializers.CharField(
        source='author.name',
        read_only=True
    )

    category_name = serializers.CharField(
        source='category.name',
        read_only=True
    )

    class Meta:
        model = Book

        fields = '__all__'

        read_only_fields = [
            'available',
            'created_at'
        ]

    def validate(self, attrs):

        quantity = attrs.get(
            'quantity',
            self.instance.quantity
            if self.instance else None
        )

        available = attrs.get(
            'available',
            self.instance.available
            if self.instance else None
        )

        if (
            available is not None
            and quantity is not None
            and available > quantity
        ):
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

        validated_data['available'] = (
            validated_data['quantity']
        )

        return Book.objects.create(
            **validated_data
        )

    def update(self, instance, validated_data):

        if 'quantity' in validated_data:

            new_quantity = (
                validated_data['quantity']
            )

            borrowed_copies = (
                instance.quantity
                - instance.available
            )

            new_available = (
                new_quantity
                - borrowed_copies
            )

            if new_available < 0:
                raise serializers.ValidationError({
                    'quantity':
                        f'Cannot reduce quantity below '
                        f'{borrowed_copies} borrowed copies.'
                })

            validated_data['available'] = (
                new_available
            )

        return super().update(
            instance,
            validated_data
        )


# =========================================================
# MEMBER
# =========================================================

class MemberSerializer(serializers.ModelSerializer):

    user_id = serializers.PrimaryKeyRelatedField(
        source='user',
        queryset=User.objects.filter(
            role='member'
        )
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


# =========================================================
# LOAN
# =========================================================

class LoanSerializer(serializers.ModelSerializer):

    book_title = serializers.CharField(
        source='book.title',
        read_only=True
    )

    book_isbn = serializers.CharField(
        source='book.isbn',
        read_only=True
    )

    book_author = serializers.CharField(
        source='book.author.name',
        read_only=True
    )

    book_category = serializers.CharField(
        source='book.category.name',
        read_only=True
    )

    book_available = serializers.IntegerField(
        source='book.available',
        read_only=True
    )

    member_name = serializers.CharField(
        source='member.name',
        read_only=True
    )

    member_email = serializers.EmailField(
        source='member.email',
        read_only=True
    )

    member_phone = serializers.CharField(
        source='member.phone',
        read_only=True
    )

    class Meta:
        model = Loan

        fields = [
            'id',

            # Book
            'book',
            'book_title',
            'book_isbn',
            'book_author',
            'book_category',
            'book_available',

            # Member
            'member',
            'member_name',
            'member_email',
            'member_phone',

            # Loan
            'borrow_date',
            'due_date',
            'return_date',
            'status',
        ]


# =========================================================
# BOOK REQUEST
# =========================================================

class BookRequestSerializer(serializers.ModelSerializer):

    book_title = serializers.CharField(
        source='book.title',
        read_only=True
    )

    member_name = serializers.CharField(
        source='member.name',
        read_only=True
    )

    class Meta:
        model = BookRequest

        fields = [
            'id',
            'member',
            'member_name',
            'book',
            'book_title',
            'status',
            'requested_at',
            'processed_at'
        ]

        read_only_fields = [
            'id',
            'member',
            'member_name',
            'book_title',
            'status',
            'requested_at',
            'processed_at'
        ]


# =========================================================
# RECENT SEARCH
# =========================================================

class RecentSearchSerializer(
    serializers.ModelSerializer
):

    class Meta:
        model = RecentSearch

        fields = [
            "id",
            "query",
            "searched_at",
        ]

        read_only_fields = [
            "id",
            "searched_at",
        ]