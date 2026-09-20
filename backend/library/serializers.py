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
    ReturnRequest,
    Fee,
    Payment,
    Reservation,
    Notification,
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
            if self.instance
            else None
        )

        available = attrs.get(
            'available',
            self.instance.available
            if self.instance
            else None
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

        if (
            quantity is not None
            and quantity < 0
        ):

            raise serializers.ValidationError({
                'quantity':
                    'Quantity cannot be negative.'
            })

        if (
            available is not None
            and available < 0
        ):

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

    def update(
        self,
        instance,
        validated_data,
    ):

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
# FEE SERIALIZER
# =========================================================

class FeeSerializer(serializers.ModelSerializer):

    fee_type_display = serializers.CharField(
        source='get_fee_type_display',
        read_only=True
    )

    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    book_title = serializers.CharField(
    source="loan.book.title",
    read_only=True,
   )

    class Meta:
        model = Fee

        fields = [
            'id',
            'loan',
            'book_title',
            'fee_type',
            'fee_type_display',
            'amount',
            'status',
            'status_display',
            'description',
            'created_at',
            'paid_at',
        ]

        read_only_fields = [
            'id',
            'created_at',
            'paid_at',
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

    total_fees = serializers.SerializerMethodField()

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

            # Fees
            'total_fees',
        ]

        read_only_fields = [
            'id',
            'member',
            'borrow_date',
            'due_date',
            'return_date',
            'status',
            'total_fees',
        ]

    def get_total_fees(self, obj):

        return sum(
            fee.amount
            for fee in obj.fees.all()
        )


# =========================================================
# RETURN REQUEST SERIALIZER
# =========================================================

class ReturnRequestSerializer(serializers.ModelSerializer):

    loan_id = serializers.IntegerField(
        source='loan.id',
        read_only=True
    )

    book_title = serializers.CharField(
        source='loan.book.title',
        read_only=True
    )

    book_isbn = serializers.CharField(
        source='loan.book.isbn',
        read_only=True
    )

    member_name = serializers.CharField(
        source='loan.member.name',
        read_only=True
    )

    member_email = serializers.EmailField(
        source='loan.member.email',
        read_only=True
    )

    borrow_date = serializers.DateField(
        source='loan.borrow_date',
        read_only=True
    )

    due_date = serializers.DateField(
        source='loan.due_date',
        read_only=True
    )

    loan_status = serializers.CharField(
        source='loan.status',
        read_only=True
    )

    class Meta:
        model = ReturnRequest

        fields = [
            'id',
            'loan_id',

            'book_title',
            'book_isbn',

            'member_name',
            'member_email',

            'borrow_date',
            'due_date',
            'loan_status',

            'status',
            'condition',
            'damage_description',

            'requested_at',
            'processed_at',
        ]

        read_only_fields = [
            'id',
            'loan_id',
            'book_title',
            'book_isbn',
            'member_name',
            'member_email',
            'borrow_date',
            'due_date',
            'loan_status',
            'status',
            'requested_at',
            'processed_at',
        ]


# =========================================================
# BOOK REQUEST
# =========================================================

class BookRequestSerializer(serializers.ModelSerializer):

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
        model = BookRequest

        fields = [
            'id',

            # Member
            'member',
            'member_name',
            'member_email',
            'member_phone',

            # Book
            'book',
            'book_title',
            'book_isbn',
            'book_author',
            'book_category',
            'book_available',

            # Request
            'status',
            'requested_at',
            'processed_at',
        ]

        read_only_fields = [
            'id',

            'member',
            'member_name',
            'member_email',
            'member_phone',

            'book_title',
            'book_isbn',
            'book_author',
            'book_category',
            'book_available',

            'status',
            'requested_at',
            'processed_at',
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

class PaymentSerializer(serializers.ModelSerializer):
    fee_type = serializers.CharField(
        source="fee.fee_type",
        read_only=True,
    )

    book_title = serializers.CharField(
        source="fee.loan.book.title",
        read_only=True,
    )

    class Meta:
        model = Payment

        fields = [
            "id",
            "fee",
            "fee_type",
            "book_title",
            "amount",
            "status",
            "payment_method",
            "transaction_id",
            "gateway_order_id",
            "gateway_payment_id",
            "created_at",
            "paid_at",
        ]

        read_only_fields = [
            "id",
            "status",
            "transaction_id",
            "gateway_order_id",
            "gateway_payment_id",
            "created_at",
            "paid_at",
        ]


# =========================================================
# RESERVATION
# =========================================================

class ReservationSerializer(serializers.ModelSerializer):

    book_title = serializers.CharField(
        source='book.title',
        read_only=True
    )

    book_author = serializers.CharField(
        source='book.author.name',
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

    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    class Meta:
        model = Reservation

        fields = [
            'id',
            'book',
            'book_title',
            'book_author',
            'book_available',
            'member',
            'member_name',
            'status',
            'status_display',
            'queue_position',
            'reserved_at',
            'notified_at',
            'expires_at',
        ]

        read_only_fields = [
            'id',
            'member',
            'member_name',
            'book_title',
            'book_author',
            'book_available',
            'status',
            'status_display',
            'queue_position',
            'reserved_at',
            'notified_at',
            'expires_at',
        ]


# =========================================================
# NOTIFICATION
# =========================================================

class NotificationSerializer(serializers.ModelSerializer):

    notif_type_display = serializers.CharField(
        source='get_notif_type_display',
        read_only=True,
    )

    class Meta:
        model = Notification
        fields = [
            'id',
            'notif_type',
            'notif_type_display',
            'title',
            'message',
            'is_read',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'notif_type',
            'notif_type_display',
            'title',
            'message',
            'created_at',
        ]
