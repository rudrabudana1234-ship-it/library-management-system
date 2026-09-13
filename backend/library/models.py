from django.db import models
from django.utils import timezone
from django.conf import settings
from accounts.models import User


# =========================================================
# CATEGORY
# =========================================================

class Category(models.Model):

    name = models.CharField(
        max_length=100,
        unique=True
    )

    description = models.TextField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.name


# =========================================================
# AUTHOR
# =========================================================

class Author(models.Model):

    name = models.CharField(
        max_length=200
    )

    bio = models.TextField(
        blank=True,
        null=True
    )

    def __str__(self):
        return self.name


# =========================================================
# BOOK
# =========================================================

class Book(models.Model):

    title = models.CharField(
        max_length=255
    )

    author = models.ForeignKey(
        Author,
        on_delete=models.CASCADE,
        related_name='books'
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='books'
    )

    isbn = models.CharField(
        max_length=13,
        unique=True
    )

    published_date = models.DateField(
        null=True,
        blank=True
    )

    quantity = models.PositiveIntegerField(
        default=1
    )

    available = models.PositiveIntegerField(
        default=1
    )

    cover = models.ImageField(
        upload_to='book_covers/',
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.title


# =========================================================
# MEMBER
# =========================================================

class Member(models.Model):

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='member_profile',
        null=True,
        blank=True
    )

    name = models.CharField(
        max_length=150
    )

    email = models.EmailField(
        unique=True
    )

    phone = models.CharField(
        max_length=15,
        blank=True
    )

    address = models.TextField(
        blank=True
    )

    joined_date = models.DateField(
        auto_now_add=True
    )

    is_active = models.BooleanField(
        default=True
    )

    def __str__(self):
        return self.name


# =========================================================
# LOAN
# =========================================================

class Loan(models.Model):

    STATUS_CHOICES = [
        ('borrowed', 'Borrowed'),
        ('overdue', 'Overdue'),
        ('return_requested', 'Return Requested'),
        ('returned', 'Returned'),
        ('lost', 'Lost'),
    ]

    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name='loans'
    )

    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name='loans'
    )

    borrow_date = models.DateField(
        default=timezone.localdate
    )

    due_date = models.DateField()

    return_date = models.DateField(
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='borrowed'
    )

    def __str__(self):
        return f"{self.book.title} → {self.member.name}"


# =========================================================
# RETURN REQUEST
# =========================================================

class ReturnRequest(models.Model):

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    CONDITION_CHOICES = [
        ('normal', 'Normal'),
        ('damaged', 'Damaged'),
        ('lost', 'Lost'),
    ]

    loan = models.OneToOneField(
        Loan,
        on_delete=models.CASCADE,
        related_name='return_request'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    condition = models.CharField(
        max_length=20,
        choices=CONDITION_CHOICES,
        null=True,
        blank=True
    )

    damage_description = models.TextField(
        blank=True
    )

    requested_at = models.DateTimeField(
        auto_now_add=True
    )

    processed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:

        ordering = [
            '-requested_at'
        ]

    def __str__(self):
        return (
            f"Return Request #{self.id} - "
            f"{self.loan.book.title} - "
            f"{self.status}"
        )


# =========================================================
# FEE
# =========================================================

class Fee(models.Model):

    FEE_TYPE_CHOICES = [
        ('late', 'Late Fee'),
        ('damage', 'Damage Fee'),
        ('lost', 'Lost Book Fee'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('waived', 'Waived'),
    ]

    loan = models.ForeignKey(
        Loan,
        on_delete=models.CASCADE,
        related_name='fees'
    )

    fee_type = models.CharField(
        max_length=20,
        choices=FEE_TYPE_CHOICES
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    description = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    paid_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:

        ordering = [
            '-created_at'
        ]

    def __str__(self):
        return (
            f"{self.get_fee_type_display()} - "
            f"{self.loan.book.title} - "
            f"₹{self.amount}"
        )

class Payment(models.Model):

    STATUS_CHOICES = [
        ("created", "Created"),
        ("successful", "Successful"),
        ("failed", "Failed"),
    ]

    PAYMENT_METHOD_CHOICES = [
        ("upi", "UPI"),
        ("card", "Card"),
        ("netbanking", "Net Banking"),
    ]

    fee = models.ForeignKey(
        Fee,
        on_delete=models.PROTECT,
        related_name="payments",
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="created",
    )

    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        blank=True,
        null=True,
    )

    transaction_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    gateway_order_id = models.CharField(
        max_length=255,
        unique=True,
    )

    gateway_payment_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    paid_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    def __str__(self):
        return (
            f"Payment #{self.id} - "
            f"{self.amount} - "
            f"{self.status}"
        )

# =========================================================
# BOOK REQUEST
# =========================================================

class BookRequest(models.Model):

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name='book_requests'
    )

    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name='book_requests'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    requested_at = models.DateTimeField(
        auto_now_add=True
    )

    processed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:

        constraints = [
            models.UniqueConstraint(
                fields=['member', 'book'],
                condition=models.Q(status='pending'),
                name='unique_pending_book_request'
            )
        ]

        ordering = ['-requested_at']

    def __str__(self):
        return (
            f"{self.member.name} → "
            f"{self.book.title} "
            f"({self.status})"
        )


# =========================================================
# RECENT SEARCH
# =========================================================

class RecentSearch(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="recent_book_searches"
    )

    query = models.CharField(
        max_length=255
    )

    searched_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:

        ordering = [
            "-searched_at"
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "user",
                    "query"
                ],
                name="unique_user_recent_search"
            )
        ]

    def __str__(self):

        return f"{self.user.username} - {self.query}"