from datetime import timedelta
from decimal import Decimal, InvalidOperation
from django.conf import settings

from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncDay, TruncMonth
from django.utils import timezone

from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

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
    create_notification,
)

from .serializers import (
    CategorySerializer,
    AuthorSerializer,
    BookSerializer,
    MemberSerializer,
    LoanSerializer,
    BookRequestSerializer,
    RecentSearchSerializer,
    ReturnRequestSerializer,
    FeeSerializer,
    PaymentSerializer,
    ReservationSerializer,
    NotificationSerializer,
)

from .permissions import IsAuthenticatedUser
from .ai_search import ai_search_books

from accounts.permissions import (
    IsAdmin,
    IsLibrarian,
    IsAdminOrLibrarian,
    IsMemberOwnerOrAdmin,
    IsMemberOwnerOrAdminOrLibrarian,
    IsLoanOwnerOrAdminOrLibrarian,
)


# =========================================================
# CATEGORY VIEWSET
# =========================================================


class CategoryViewSet(viewsets.ModelViewSet):

    queryset = Category.objects.all()

    serializer_class = CategorySerializer

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "name",
        "description",
    ]

    ordering_fields = [
        "name",
        "created_at",
    ]

    ordering = [
        "name",
    ]

    def get_permissions(self):

        if self.action in [
            "create",
            "update",
            "partial_update",
        ]:

            permission_classes = [
                IsAdminOrLibrarian,
            ]

        elif self.action == "destroy":

            permission_classes = [
                IsAdmin,
            ]

        else:

            permission_classes = [
                IsAuthenticatedUser,
            ]

        return [
            permission()
            for permission in permission_classes
        ]


# =========================================================
# AUTHOR VIEWSET
# =========================================================


class AuthorViewSet(viewsets.ModelViewSet):

    queryset = Author.objects.all()

    serializer_class = AuthorSerializer

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "name",
    ]

    ordering_fields = [
        "name",
    ]

    ordering = [
        "name",
    ]

    def get_permissions(self):

        if self.action in [
            "create",
            "update",
            "partial_update",
        ]:

            permission_classes = [
                IsAdminOrLibrarian,
            ]

        elif self.action == "destroy":

            permission_classes = [
                IsAdmin,
            ]

        else:

            permission_classes = [
                IsAuthenticatedUser,
            ]

        return [
            permission()
            for permission in permission_classes
        ]


# =========================================================
# BOOK VIEWSET
# =========================================================


class BookViewSet(viewsets.ModelViewSet):

    """
    Complete Book API.

    Features:

    - Book CRUD
    - Category filtering
    - Author filtering
    - Availability filtering
    - Search
    - Ordering
    - Pagination
    - Optimized queries
    - Advanced search
    - Book suggestions
    """

    serializer_class = BookSerializer

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    filterset_fields = [
        "category",
        "author",
        "available",
    ]

    search_fields = [
        "title",
        "isbn",
        "author__name",
        "category__name",
    ]

    ordering_fields = [
        "title",
        "available",
        "quantity",
        "created_at",
        "published_date",
    ]

    ordering = [
        "title",
    ]

    def get_queryset(self):

        return (
            Book.objects
            .select_related(
                "author",
                "category",
            )
            .all()
        )

    def get_permissions(self):

        if self.action in [
            "create",
            "update",
            "partial_update",
        ]:

            permission_classes = [
                IsAdminOrLibrarian,
            ]

        elif self.action == "destroy":

            permission_classes = [
                IsAdmin,
            ]

        else:

            permission_classes = [
                IsAuthenticatedUser,
            ]

        return [
            permission()
            for permission in permission_classes
        ]

    # =====================================================
    # ADVANCED BOOK SEARCH
    # =====================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="search",
    )
    def advanced_search(
        self,
        request,
    ):

        query = request.query_params.get(
            "q",
            "",
        ).strip()

        if not query:

            return Response(
                [],
                status=status.HTTP_200_OK,
            )

        queryset = (
            self.get_queryset()
            .filter(
                Q(title__istartswith=query)
                | Q(title__icontains=query)
                | Q(isbn__istartswith=query)
                | Q(isbn__icontains=query)
                | Q(author__name__istartswith=query)
                | Q(author__name__icontains=query)
                | Q(category__name__istartswith=query)
                | Q(category__name__icontains=query)
            )
            .distinct()
            .order_by("title")
        )

        serializer = self.get_serializer(
            queryset,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # =====================================================
    # BOOK SUGGESTIONS
    # =====================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="suggestions",
    )
    def suggestions(
        self,
        request,
    ):

        query = request.query_params.get(
            "q",
            "",
        ).strip()

        if not query:

            return Response(
                [],
                status=status.HTTP_200_OK,
            )

        queryset = (
            self.get_queryset()
            .filter(
                Q(title__istartswith=query)
                | Q(author__name__istartswith=query)
                | Q(category__name__istartswith=query)
                | Q(isbn__istartswith=query)
            )
            .distinct()
            .order_by("title")[:10]
        )

        serializer = self.get_serializer(
            queryset,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# RECENT BOOK SEARCH
# =========================================================


class RecentBookSearchView(APIView):

    permission_classes = [
        IsAuthenticatedUser,
    ]

    # =====================================================
    # GET RECENT SEARCHES
    # =====================================================

    def get(
        self,
        request,
    ):

        recent_searches = (
            RecentSearch.objects
            .filter(
                user=request.user,
            )
            .order_by(
                "-searched_at",
            )[:10]
        )

        serializer = RecentSearchSerializer(
            recent_searches,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # =====================================================
    # SAVE SEARCH
    # =====================================================

    def post(
        self,
        request,
    ):

        query = request.data.get(
            "query",
            "",
        )

        if not isinstance(
            query,
            str,
        ):

            return Response(
                {
                    "error": "Search query must be text.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        query = query.strip()

        if not query:

            return Response(
                {
                    "error": "Search query is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # REMOVE DUPLICATE SEARCH
        # -------------------------------------------------

        RecentSearch.objects.filter(
            user=request.user,
            query__iexact=query,
        ).delete()

        # -------------------------------------------------
        # CREATE NEW SEARCH
        # -------------------------------------------------

        recent_search = RecentSearch.objects.create(
            user=request.user,
            query=query,
        )

        # -------------------------------------------------
        # KEEP ONLY 10 SEARCHES
        # -------------------------------------------------

        old_searches = (
            RecentSearch.objects
            .filter(
                user=request.user,
            )
            .order_by(
                "-searched_at",
            )[10:]
        )

        old_search_ids = list(
            old_searches.values_list(
                "id",
                flat=True,
            )
        )

        if old_search_ids:

            RecentSearch.objects.filter(
                id__in=old_search_ids,
            ).delete()

        serializer = RecentSearchSerializer(
            recent_search,
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


# =========================================================
# AI BOOK SEARCH
# =========================================================


class AIBookSearchView(APIView):

    """
    Natural language book search using TF-IDF cosine similarity.

    GET /api/books/ai-search/?q=<natural language query>

    Accepts free-text queries like:
      "beginner Python programming book"
      "machine learning from basics"
      "classic science fiction novels"

    Returns books ranked by relevance. Keeps all existing
    search/filter endpoints completely untouched.
    """

    permission_classes = [
        IsAuthenticatedUser,
    ]

    def get(
        self,
        request,
    ):

        query = request.query_params.get(
            "q",
            "",
        ).strip()

        if not query:

            return Response(
                [],
                status=status.HTTP_200_OK,
            )

        if len(query) < 3:

            return Response(
                [],
                status=status.HTTP_200_OK,
            )

        # Fetch all books with related data
        books = (
            Book.objects
            .select_related(
                "author",
                "category",
            )
            .all()
        )

        ranked = ai_search_books(
            query=query,
            books=list(books),
            top_n=20,
        )

        if not ranked:

            return Response(
                [],
                status=status.HTTP_200_OK,
            )

        ranked_books = [
            book
            for book, _score in ranked
        ]

        serializer = BookSerializer(
            ranked_books,
            many=True,
        )

        # Attach relevance scores for optional frontend use
        result_data = serializer.data

        for i, (_book, score) in enumerate(ranked):

            result_data[i]["ai_score"] = round(
                score,
                4,
            )

        return Response(
            result_data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# MEMBER VIEWSET
# =========================================================


class MemberViewSet(viewsets.ModelViewSet):

    serializer_class = MemberSerializer

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "name",
        "email",
        "phone",
    ]

    ordering_fields = [
        "name",
        "email",
        "joined_date",
    ]

    ordering = [
        "name",
    ]

    filterset_fields = [
        "is_active",
    ]

    def get_queryset(self):

        if self.request.user.role in [
            "admin",
            "librarian",
        ]:

            return (
                Member.objects
                .select_related("user")
                .all()
            )

        return (
            Member.objects
            .select_related("user")
            .filter(
                user=self.request.user,
            )
        )

    def get_permissions(self):

        if self.action == "create":

            permission_classes = [
                IsAdminOrLibrarian,
            ]

        elif self.action == "destroy":

            permission_classes = [
                IsMemberOwnerOrAdmin,
            ]

        else:

            permission_classes = [
                IsMemberOwnerOrAdminOrLibrarian,
            ]

        return [
            permission()
            for permission in permission_classes
        ]


# =========================================================
# LOAN VIEWSET
# =========================================================


class LoanViewSet(viewsets.ModelViewSet):

    """
    Complete Loan API.

    Features:

    - Loan listing
    - Loan retrieval
    - Advanced search
    - Filtering
    - Ordering
    - Pagination
    - Role-based access
    - Transaction-safe loan creation
    - Transaction-safe return requests
    - Overdue detection
    - Automatic 14-day due date

    Members cannot directly create loans.

    Member borrowing flow:

        MEMBER
            ↓
        BOOK
            ↓
        Borrow Book
            ↓
        BookRequest
            ↓
        Librarian Approval
            ↓
        Loan Created
    """

    serializer_class = LoanSerializer

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    filterset_fields = [
        "status",
        "book",
        "member",
        "borrow_date",
        "due_date",
        "return_date",
    ]

    search_fields = [
        "book__title",
        "book__isbn",
        "member__name",
        "member__email",
        "member__phone",
        "status",
    ]

    ordering_fields = [
        "borrow_date",
        "due_date",
        "return_date",
        "status",
        "book__title",
        "member__name",
    ]

    ordering = [
        "-borrow_date",
    ]

    def get_queryset(self):

        queryset = (
            Loan.objects
            .select_related(
                "book",
                "member",
                "book__author",
                "book__category",
            )
            .all()
        )

        if self.request.user.role in [
            "admin",
            "librarian",
        ]:

            return queryset

        return queryset.filter(
            member__user=self.request.user,
        )

    def get_permissions(self):

        if self.action == "create":

            permission_classes = [
                IsAdminOrLibrarian,
            ]

        elif self.action in [
            "return_book",
            "overdue",
        ]:

            permission_classes = [
                IsAdminOrLibrarian,
            ]

        elif self.action in [
            "update",
            "partial_update",
            "destroy",
        ]:

            permission_classes = [
                IsAdmin,
            ]

        else:

            permission_classes = [
                IsLoanOwnerOrAdminOrLibrarian,
            ]

        return [
            permission()
            for permission in permission_classes
        ]

    # =====================================================
    # CREATE LOAN
    # =====================================================

    @transaction.atomic
    def create(
        self,
        request,
        *args,
        **kwargs,
    ):

        if request.user.role == "member":

            return Response(
                {
                    "error": (
                        "Members cannot create loans directly. "
                        "Please submit a borrowing request "
                        "and wait for librarian approval."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # -------------------------------------------------
        # MEMBER ID
        # -------------------------------------------------

        member_id = request.data.get(
            "member",
        )

        if not member_id:

            return Response(
                {
                    "error": "Member ID is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # LOCK MEMBER
        # -------------------------------------------------

        try:

            member = (
                Member.objects
                .select_for_update()
                .get(
                    id=member_id,
                )
            )

        except Member.DoesNotExist:

            return Response(
                {
                    "error": "Member not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # -------------------------------------------------
        # ACTIVE MEMBER
        # -------------------------------------------------

        if not member.is_active:

            return Response(
                {
                    "error": (
                        "This member is inactive "
                        "and cannot borrow books."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # BOOK ID
        # -------------------------------------------------

        book_id = request.data.get(
            "book",
        )

        if not book_id:

            return Response(
                {
                    "error": "Book ID is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # LOCK BOOK
        # -------------------------------------------------

        try:

            book = (
                Book.objects
                .select_for_update()
                .select_related(
                    "author",
                    "category",
                )
                .get(
                    id=book_id,
                )
            )

        except Book.DoesNotExist:

            return Response(
                {
                    "error": "Book not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # -------------------------------------------------
        # AVAILABILITY
        # -------------------------------------------------

        if book.available <= 0:

            return Response(
                {
                    "error": (
                        "Book is currently unavailable."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # DUPLICATE ACTIVE LOAN
        # -------------------------------------------------

        active_loan = (
            Loan.objects
            .filter(
                member=member,
                book=book,
                status__in=[
                    "borrowed",
                    "overdue",
                ],
            )
            .exists()
        )

        if active_loan:

            return Response(
                {
                    "error": (
                        "This member already has "
                        "this book borrowed."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # DATES
        # -------------------------------------------------

        borrow_date = timezone.localdate()

        due_date = (
            borrow_date
            + timedelta(days=14)
        )

        # -------------------------------------------------
        # CREATE LOAN
        # -------------------------------------------------

        loan = Loan.objects.create(
            book=book,
            member=member,
            borrow_date=borrow_date,
            due_date=due_date,
            status="borrowed",
        )

        # -------------------------------------------------
        # DECREASE AVAILABLE
        # -------------------------------------------------

        book.available -= 1

        book.save(
            update_fields=[
                "available",
            ],
        )

        return Response(
            {
                "message": (
                    "Book borrowed successfully."
                ),
                "loan": LoanSerializer(
                    loan,
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )

    # =====================================================
    # MEMBER RETURN REQUEST
    # =====================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="request-return",
    )
    @transaction.atomic
    def request_return(
        self,
        request,
        pk=None,
    ):

        if request.user.role != "member":

            return Response(
                {
                    "error": (
                        "Only members can request "
                        "book returns."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # -------------------------------------------------
        # LOCK LOAN
        # -------------------------------------------------

        try:

            loan = (
                Loan.objects
                .select_for_update()
                .select_related(
                    "book",
                    "member",
                )
                .get(
                    pk=pk,
                )
            )

        except Loan.DoesNotExist:

            return Response(
                {
                    "error": "Loan not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # -------------------------------------------------
        # OWNERSHIP
        # -------------------------------------------------

        if loan.member.user != request.user:

            return Response(
                {
                    "error": (
                        "You can only request a return "
                        "for your own borrowed books."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # -------------------------------------------------
        # STATUS
        # -------------------------------------------------

        if loan.status not in [
            "borrowed",
            "overdue",
        ]:

            return Response(
                {
                    "error": (
                        "This book cannot be returned "
                        "because its current status is "
                        f"'{loan.get_status_display()}'."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # DUPLICATE RETURN REQUEST
        # -------------------------------------------------

        existing_request = (
            ReturnRequest.objects
            .filter(
                loan=loan,
                status="pending",
            )
            .first()
        )

        if existing_request:

            return Response(
                {
                    "error": (
                        "A return request for this "
                        "book is already pending."
                    ),
                    "return_request": (
                        ReturnRequestSerializer(
                            existing_request,
                        ).data
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # CREATE REQUEST
        # -------------------------------------------------

        return_request = (
            ReturnRequest.objects.create(
                loan=loan,
                status="pending",
            )
        )

        # -------------------------------------------------
        # UPDATE LOAN
        # -------------------------------------------------

        loan.status = "return_requested"

        loan.save(
            update_fields=[
                "status",
            ],
        )

        # ── notify member ──────────────────────────────
        create_notification(
            user=request.user,
            notif_type='return_requested',
            title='Return Request Submitted',
            message=(
                f'Your return request for '
                f'"{loan.book.title}" has been submitted '
                f'and is pending librarian approval.'
            ),
        )
        # ───────────────────────────────────────────────

        return Response(
            {
                "message": (
                    "Return request submitted successfully. "
                    "Please wait for librarian approval."
                ),
                "return_request": (
                    ReturnRequestSerializer(
                        return_request,
                    ).data
                ),
            },
            status=status.HTTP_201_CREATED,
        )

    # =====================================================
    # OVERDUE LOANS
    # =====================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="overdue",
    )
    def overdue(
        self,
        request,
    ):

        today = timezone.localdate()

        # -------------------------------------------------
        # FIND BORROWED LOANS PAST DUE
        # -------------------------------------------------

        overdue_loans = (
            self.get_queryset()
            .filter(
                status="borrowed",
                due_date__lt=today,
            )
        )

        # -------------------------------------------------
        # UPDATE STATUS + NOTIFY MEMBERS
        # -------------------------------------------------

        # Notify members whose loans just became overdue
        newly_overdue = list(overdue_loans.select_related('member__user', 'book'))
        for loan in newly_overdue:
            member_user = loan.member.user if loan.member else None
            if member_user:
                already_notified = Notification.objects.filter(
                    user=member_user,
                    notif_type='loan_overdue',
                    message__contains=loan.book.title,
                ).exists()
                if not already_notified:
                    create_notification(
                        user=member_user,
                        notif_type='loan_overdue',
                        title='Book Overdue',
                        message=(
                            f'"{loan.book.title}" was due on '
                            f'{loan.due_date} and is now overdue. '
                            f'Please return it as soon as possible.'
                        ),
                    )

        overdue_loans.update(
            status="overdue",
        )

        # Notify members with loans due in the next 3 days
        due_soon_cutoff = today + timedelta(days=3)
        due_soon_loans = (
            self.get_queryset()
            .filter(
                status="borrowed",
                due_date__gte=today,
                due_date__lte=due_soon_cutoff,
            )
            .select_related('member__user', 'book')
        )
        for loan in due_soon_loans:
            member_user = loan.member.user if loan.member else None
            if member_user:
                already_notified = Notification.objects.filter(
                    user=member_user,
                    notif_type='loan_due_soon',
                    message__contains=loan.book.title,
                ).exists()
                if not already_notified:
                    days_left = (loan.due_date - today).days
                    create_notification(
                        user=member_user,
                        notif_type='loan_due_soon',
                        title='Book Due Soon',
                        message=(
                            f'"{loan.book.title}" is due in '
                            f'{days_left} day(s) (on {loan.due_date}). '
                            f'Please return it on time.'
                        ),
                    )

        # Re-fetch so serializer reflects updated status.
        overdue_loans = (
            self.get_queryset()
            .filter(
                status="overdue",
                due_date__lt=today,
            )
        )

        serializer = self.get_serializer(
            overdue_loans,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    @action(
    detail=True,
    methods=["patch"],
    url_path="process-return",
    )

    def process_return(self, request, pk=None):

        if getattr(
            request.user,
            "role",
            None
        ) != "librarian":

            return Response(
                {
                    "detail": (
                        "Only librarians can process returns."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        condition = request.data.get(
            "condition",
            "normal",
        )

        damage_fee = request.data.get(
            "damage_fee",
            0,
        )

        lost_fee = request.data.get(
            "lost_fee",
            0,
        )

        description = request.data.get(
            "description",
            "",
        )

        if condition not in [
            "normal",
            "damaged",
            "lost",
        ]:

            return Response(
                {
                    "detail": (
                        "Condition must be normal, "
                        "damaged or lost."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            damage_fee = Decimal(
                str(damage_fee or 0)
            )

            lost_fee = Decimal(
                str(lost_fee or 0)
            )

        except (
            InvalidOperation,
            ValueError,
            TypeError,
        ):

            return Response(
                {
                    "detail": (
                        "Invalid fee amount."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if damage_fee < 0 or lost_fee < 0:

            return Response(
                {
                    "detail": (
                        "Fee amounts cannot be negative."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if condition == "damaged":

            if damage_fee <= 0:

                return Response(
                    {
                        "detail": (
                            "Damage fee is required "
                            "for a damaged book."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        else:

            damage_fee = Decimal("0")

        if condition == "lost":

            if lost_fee <= 0:

                return Response(
                    {
                        "detail": (
                            "Lost-book fee is required "
                            "for a lost book."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        else:

            lost_fee = Decimal("0")

        with transaction.atomic():

            loan = (
                Loan.objects
                .select_for_update()
                .select_related(
                    "book",
                    "member",
                )
                .get(pk=pk)
            )

            if loan.status not in [
                "borrowed",
                "overdue",
                "return_requested",
            ]:

                return Response(
                    {
                        "detail": (
                            "This loan cannot be returned."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            book = (
                Book.objects
                .select_for_update()
                .get(pk=loan.book_id)
            )

            try:

                return_request = (
                    ReturnRequest.objects
                    .select_for_update()
                    .get(
                        loan=loan,
                        status="pending",
                    )
                )

            except ReturnRequest.DoesNotExist:

                return_request = ReturnRequest.objects.create(
                    loan=loan,
                    status="pending",
                )

            today = timezone.localdate()

            late_days = 0

            if loan.due_date:

                late_days = max(
                    0,
                    (today - loan.due_date).days
                )

            late_fee = Decimal(
                late_days * 10
            )

            total_fee = (
                late_fee +
                damage_fee +
                lost_fee
            )

            if late_fee > 0:

                Fee.objects.create(
                    loan=loan,
                    fee_type="late",
                    amount=late_fee,
                    status="pending",
                    description=(
                        f"Late fee for "
                        f"{late_days} overdue day(s)."
                    ),
                )

            if damage_fee > 0:

                Fee.objects.create(
                    loan=loan,
                    fee_type="damage",
                    amount=damage_fee,
                    status="pending",
                    description=(
                        description or
                        "Book returned damaged."
                    ),
                )

            if lost_fee > 0:

                Fee.objects.create(
                    loan=loan,
                    fee_type="lost",
                    amount=lost_fee,
                    status="pending",
                    description=(
                        description or
                        "Book marked as lost."
                    ),
                )

            return_request.status = "approved"

            return_request.processed_by = request.user

            return_request.processed_at = timezone.now()

            return_request.condition = condition

            return_request.description = description

            return_request.save()

            loan.return_date = today

            if condition == "lost":

                loan.status = "lost"

            else:

                loan.status = "returned"

            loan.save(
                update_fields=[
                    "status",
                    "return_date",
                ]
            )

            if condition == "normal":

                book.available = (
                    book.available + 1
                )

                book.save(
                    update_fields=["available"]
                )

                # Notify the first waiting reservation
                _notify_next_reservation(book)

        return Response(
            {
                "detail": "Book returned successfully.",
                "condition": condition,
                "late_days": late_days,
                "late_fee": late_fee,
                "damage_fee": damage_fee,
                "lost_fee": lost_fee,
                "total_fee": total_fee,
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# LIBRARIAN RETURN REQUEST MANAGEMENT
# =========================================================


class LibrarianReturnRequestView(APIView):

    """
    Librarian-only return management.

    Librarian determines:

        normal
        damaged
        lost

    Fees:

        late fee     -> automatically calculated
        damage fee   -> librarian supplied
        lost fee     -> librarian supplied
    """

    permission_classes = [
        IsLibrarian,
    ]

    # =====================================================
    # GET RETURN REQUESTS
    # =====================================================

    def get(
        self,
        request,
    ):

        return_requests = (
            ReturnRequest.objects
            .select_related(
                "loan",
                "loan__book",
                "loan__member",
                "loan__book__author",
                "loan__book__category",
            )
            .all()
            .order_by("-requested_at")
        )

        serializer = ReturnRequestSerializer(
            return_requests,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # =====================================================
    # PROCESS RETURN
    # =====================================================

    @transaction.atomic
    def patch(
        self,
        request,
        request_id,
    ):

        # -------------------------------------------------
        # LOCK RETURN REQUEST
        # -------------------------------------------------

        try:

            return_request = (
                ReturnRequest.objects
                .select_for_update()
                .select_related(
                    "loan",
                    "loan__member",
                    "loan__book",
                )
                .get(
                    id=request_id,
                )
            )

        except ReturnRequest.DoesNotExist:

            return Response(
                {
                    "error": (
                        "Return request not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # -------------------------------------------------
        # PENDING CHECK
        # -------------------------------------------------

        if return_request.status != "pending":

            return Response(
                {
                    "error": (
                        "This return request has "
                        "already been processed."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # CONDITION
        # -------------------------------------------------

        condition = request.data.get(
            "condition",
            "",
        )

        if not isinstance(
            condition,
            str,
        ):

            condition = ""

        condition = condition.strip().lower()

        if condition not in [
            "normal",
            "damaged",
            "lost",
        ]:

            return Response(
                {
                    "error": (
                        "Invalid condition. Use "
                        "'normal', 'damaged', or 'lost'."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # LOCK LOAN
        # -------------------------------------------------

        loan = (
            Loan.objects
            .select_for_update()
            .select_related(
                "book",
                "member",
            )
            .get(
                id=return_request.loan.id,
            )
        )

        # -------------------------------------------------
        # VALIDATE LOAN
        # -------------------------------------------------

        if loan.status not in [
            "return_requested",
            "borrowed",
            "overdue",
        ]:

            return Response(
                {
                    "error": (
                        "This loan cannot be returned "
                        "because it has already been processed."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # LOCK BOOK
        # -------------------------------------------------

        book = (
            Book.objects
            .select_for_update()
            .get(
                id=loan.book.id,
            )
        )

        today = timezone.localdate()

        # =================================================
        # LATE FEE
        # =================================================

        late_days = 0

        if today > loan.due_date:

            late_days = (
                today - loan.due_date
            ).days

        # Current policy: ₹10 per late day.
        late_fee_per_day = 10

        late_fee_amount = (
            late_days
            * late_fee_per_day
        )

        # =================================================
        # DAMAGE FEE
        # =================================================

        damage_fee_amount = request.data.get(
            "damage_fee",
            0,
        )

        # =================================================
        # LOST FEE
        # =================================================

        lost_fee_amount = request.data.get(
            "lost_fee",
            0,
        )

        # =================================================
        # VALIDATE FEES
        # =================================================

        try:

            damage_fee_amount = float(
                damage_fee_amount,
            )

            lost_fee_amount = float(
                lost_fee_amount,
            )

        except (
            TypeError,
            ValueError,
        ):

            return Response(
                {
                    "error": (
                        "Damage fee and lost fee "
                        "must be valid numbers."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if damage_fee_amount < 0:

            return Response(
                {
                    "error": (
                        "Damage fee cannot be negative."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if lost_fee_amount < 0:

            return Response(
                {
                    "error": (
                        "Lost fee cannot be negative."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # CONDITION-SPECIFIC FEES
        # -------------------------------------------------

        if condition != "damaged":

            damage_fee_amount = 0

        if condition != "lost":

            lost_fee_amount = 0

        # =================================================
        # DAMAGE DESCRIPTION
        # =================================================

        damage_description = request.data.get(
            "damage_description",
            "",
        )

        if not isinstance(
            damage_description,
            str,
        ):

            damage_description = ""

        damage_description = (
            damage_description.strip()
        )

        # =================================================
        # CREATE LATE FEE
        # =================================================

        if late_fee_amount > 0:

            Fee.objects.create(
                loan=loan,
                fee_type="late",
                amount=late_fee_amount,
                status="pending",
                description=(
                    f"{late_days} late day(s) "
                    f"at ₹{late_fee_per_day} per day."
                ),
            )

        # =================================================
        # CREATE DAMAGE FEE
        # =================================================

        if damage_fee_amount > 0:

            Fee.objects.create(
                loan=loan,
                fee_type="damage",
                amount=damage_fee_amount,
                status="pending",
                description=(
                    damage_description
                    or "Damaged book charge."
                ),
            )

        # =================================================
        # CREATE LOST FEE
        # =================================================

        if lost_fee_amount > 0:

            Fee.objects.create(
                loan=loan,
                fee_type="lost",
                amount=lost_fee_amount,
                status="pending",
                description="Lost book charge.",
            )

        # =================================================
        # UPDATE RETURN REQUEST
        # =================================================

        return_request.status = "approved"

        return_request.condition = condition

        return_request.damage_description = (
            damage_description
        )

        return_request.processed_at = (
            timezone.now()
        )

        return_request.save(
            update_fields=[
                "status",
                "condition",
                "damage_description",
                "processed_at",
            ],
        )

        # =================================================
        # NORMAL RETURN
        # =================================================

        if condition == "normal":

            loan.status = "returned"

            loan.return_date = today

            loan.save(
                update_fields=[
                    "status",
                    "return_date",
                ],
            )

            book.available += 1

            if book.available > book.quantity:

                book.available = book.quantity

            book.save(
                update_fields=[
                    "available",
                ],
            )

            # Notify the first waiting reservation
            _notify_next_reservation(book)

        # =================================================
        # DAMAGED RETURN
        # =================================================

        elif condition == "damaged":

            loan.status = "returned"

            loan.return_date = today

            loan.save(
                update_fields=[
                    "status",
                    "return_date",
                ],
            )

            # Damaged copy is NOT added back to available.
            #
            # available remains unchanged.

        # =================================================
        # LOST BOOK
        # =================================================

        elif condition == "lost":

            loan.status = "lost"

            loan.return_date = today

            loan.save(
                update_fields=[
                    "status",
                    "return_date",
                ],
            )

            # Lost copy is NOT returned to available.
            #
            # available remains unchanged.

        # =================================================
        # RESPONSE
        # =================================================

        total_fee = (
            late_fee_amount
            + damage_fee_amount
            + lost_fee_amount
        )

        # ── notify member about return approval ────────
        member_user = loan.member.user if loan.member else None
        if member_user:
            fee_note = (
                f' A fee of ₹{total_fee} has been generated.'
                if total_fee > 0 else ''
            )
            create_notification(
                user=member_user,
                notif_type='return_approved',
                title='Return Request Approved',
                message=(
                    f'Your return of "{loan.book.title}" '
                    f'has been processed ({condition}).{fee_note}'
                ),
            )
            if total_fee > 0:
                create_notification(
                    user=member_user,
                    notif_type='fee_generated',
                    title='Fee Generated',
                    message=(
                        f'A fee of ₹{total_fee} has been '
                        f'generated for "{loan.book.title}".'
                    ),
                )
        # ───────────────────────────────────────────────

        return Response(
            {
                "message": (
                    "Return processed successfully."
                ),
                "condition": condition,
                "late_days": late_days,
                "late_fee": late_fee_amount,
                "damage_fee": damage_fee_amount,
                "lost_fee": lost_fee_amount,
                "total_fee": total_fee,
                "return_request": (
                    ReturnRequestSerializer(
                        return_request,
                    ).data
                ),
                "loan": LoanSerializer(
                    loan,
                ).data,
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# FEE MANAGEMENT
# =========================================================


class LibrarianFeeView(APIView):

    """
    Librarian-only fee management.

    GET:

        View all fees.

    PATCH:

        Change fee status.

    Supported statuses:

        pending
        paid
        waived
    """

    permission_classes = [
        IsLibrarian,
    ]

    # =====================================================
    # GET FEES
    # =====================================================

    def get(
        self,
        request,
    ):

        fees = (
            Fee.objects
            .select_related(
                "loan",
                "loan__book",
                "loan__member",
            )
            .all()
            .order_by("-id")
        )

        serializer = FeeSerializer(
            fees,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # =====================================================
    # UPDATE FEE
    # =====================================================

    @transaction.atomic
    def patch(
        self,
        request,
        fee_id,
    ):

        try:

            fee = (
                Fee.objects
                .select_for_update()
                .get(
                    id=fee_id,
                )
            )

        except Fee.DoesNotExist:

            return Response(
                {
                    "error": "Fee not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = request.data.get(
            "status",
            "",
        )

        if not isinstance(
            new_status,
            str,
        ):

            new_status = ""

        new_status = new_status.strip().lower()

        if new_status not in [
            "paid",
            "waived",
            "pending",
        ]:

            return Response(
                {
                    "error": (
                        "Invalid fee status. Use "
                        "'paid', 'waived', or 'pending'."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        fee.status = new_status

        if new_status == "paid":

            fee.paid_at = timezone.now()

        else:

            fee.paid_at = None

        fee.save(
            update_fields=[
                "status",
                "paid_at",
            ],
        )

        return Response(
            {
                "message": (
                    "Fee updated successfully."
                ),
                "fee": FeeSerializer(
                    fee,
                ).data,
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# MEMBER BOOK REQUEST VIEW
# =========================================================


class BookRequestView(APIView):

    """
    Member borrowing request flow.

    MEMBER:

        Book
          ↓
        Borrow Book
          ↓
        BookRequest
          ↓
        pending
          ↓
        Librarian approval
          ↓
        Loan created

    IMPORTANT:

    Creating a request does NOT consume a book copy.

    The book copy is consumed only after
    librarian approval.
    """

    permission_classes = [
        IsAuthenticatedUser,
    ]

    # =====================================================
    # GET REQUESTS
    # =====================================================

    def get(
        self,
        request,
    ):

        # -------------------------------------------------
        # LIBRARIAN
        # -------------------------------------------------

        if request.user.role == "librarian":

            requests = (
                BookRequest.objects
                .select_related(
                    "book",
                    "book__author",
                    "book__category",
                    "member",
                )
                .all()
                .order_by("-id")
            )

        # -------------------------------------------------
        # MEMBER
        # -------------------------------------------------

        elif request.user.role == "member":

            try:

                member = (
                    Member.objects
                    .get(
                        user=request.user,
                    )
                )

            except Member.DoesNotExist:

                return Response(
                    {
                        "error": (
                            "Member profile not found."
                        ),
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            requests = (
                BookRequest.objects
                .select_related(
                    "book",
                    "book__author",
                    "book__category",
                    "member",
                )
                .filter(
                    member=member,
                )
                .order_by("-id")
            )

        # -------------------------------------------------
        # ADMIN
        # -------------------------------------------------

        else:

            return Response(
                {
                    "error": (
                        "Book request management "
                        "is available only to members "
                        "and librarians."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = BookRequestSerializer(
            requests,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # =====================================================
    # CREATE REQUEST
    # =====================================================

    @transaction.atomic
    def post(
        self,
        request,
    ):

        # -------------------------------------------------
        # ONLY MEMBERS
        # -------------------------------------------------

        if request.user.role != "member":

            return Response(
                {
                    "error": (
                        "Only members can submit "
                        "book borrowing requests."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # -------------------------------------------------
        # MEMBER
        # -------------------------------------------------

        try:

            member = (
                Member.objects
                .select_for_update()
                .get(
                    user=request.user,
                )
            )

        except Member.DoesNotExist:

            return Response(
                {
                    "error": (
                        "Member profile not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # -------------------------------------------------
        # ACTIVE MEMBER
        # -------------------------------------------------

        if not member.is_active:

            return Response(
                {
                    "error": (
                        "Your member account is inactive "
                        "and cannot request books."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # -------------------------------------------------
        # BOOK ID
        # -------------------------------------------------

        book_id = request.data.get(
            "book",
        )

        if not book_id:

            return Response(
                {
                    "error": "Book ID is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # LOCK BOOK
        # -------------------------------------------------

        try:

            book = (
                Book.objects
                .select_for_update()
                .select_related(
                    "author",
                    "category",
                )
                .get(
                    id=book_id,
                )
            )

        except Book.DoesNotExist:

            return Response(
                {
                    "error": "Book not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # -------------------------------------------------
        # ACTIVE LOAN CHECK
        # -------------------------------------------------

        active_loan = (
            Loan.objects
            .filter(
                member=member,
                book=book,
                status__in=[
                    "borrowed",
                    "overdue",
                ],
            )
            .exists()
        )

        if active_loan:

            return Response(
                {
                    "error": (
                        "You already have this "
                        "book borrowed."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # DUPLICATE PENDING REQUEST
        # -------------------------------------------------

        existing_request = (
            BookRequest.objects
            .filter(
                member=member,
                book=book,
                status="pending",
            )
            .first()
        )

        if existing_request:

            return Response(
                {
                    "error": (
                        "You already have a pending "
                        "request for this book."
                    ),
                    "request": (
                        BookRequestSerializer(
                            existing_request,
                        ).data
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # CREATE REQUEST
        # -------------------------------------------------

        book_request = (
            BookRequest.objects.create(
                member=member,
                book=book,
                status="pending",
            )
        )

        serializer = BookRequestSerializer(
            book_request,
        )

        return Response(
            {
                "message": (
                    "Borrowing request submitted "
                    "successfully. Please wait for "
                    "librarian approval."
                ),
                "request": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


# =========================================================
# LIBRARIAN BOOK REQUEST MANAGEMENT
# =========================================================


class LibrarianBookRequestActionView(APIView):

    """
    Librarian-only borrowing request management.

    Actions:

        approve
        reject

    APPROVE:

        BookRequest
             ↓
        Lock Book
             ↓
        Re-check availability
             ↓
        Create Loan
             ↓
        available -= 1
             ↓
        BookRequest = approved
    """

    permission_classes = [
        IsLibrarian,
    ]

    # =====================================================
    # GET ALL REQUESTS
    # =====================================================

    def get(
        self,
        request,
    ):

        requests = (
            BookRequest.objects
            .select_related(
                "book",
                "book__author",
                "book__category",
                "member",
            )
            .all()
            .order_by("-id")
        )

        serializer = BookRequestSerializer(
            requests,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # =====================================================
    # APPROVE / REJECT
    # =====================================================

    @transaction.atomic
    def patch(
        self,
        request,
        request_id,
    ):

        # -------------------------------------------------
        # LOCK REQUEST
        # -------------------------------------------------

        try:

            book_request = (
                BookRequest.objects
                .select_for_update()
                .select_related(
                    "book",
                    "member",
                )
                .get(
                    id=request_id,
                )
            )

        except BookRequest.DoesNotExist:

            return Response(
                {
                    "error": (
                        "Book request not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # -------------------------------------------------
        # PENDING CHECK
        # -------------------------------------------------

        if book_request.status != "pending":

            return Response(
                {
                    "error": (
                        "This request has already "
                        "been processed."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # ACTION
        # -------------------------------------------------

        action_type = request.data.get(
            "action",
            "",
        )

        if not isinstance(
            action_type,
            str,
        ):

            action_type = ""

        action_type = action_type.strip().lower()

        # =================================================
        # REJECT
        # =================================================

        if action_type == "reject":

            book_request.status = "rejected"

            book_request.processed_at = (
                timezone.now()
            )

            book_request.save(
                update_fields=[
                    "status",
                    "processed_at",
                ],
            )

            # ── notify member ──────────────────────────
            if book_request.member.user:
                create_notification(
                    user=book_request.member.user,
                    notif_type='book_request_rejected',
                    title='Borrow Request Rejected',
                    message=(
                        f'Your request to borrow '
                        f'"{book_request.book.title}" '
                        f'has been rejected.'
                    ),
                )
            # ───────────────────────────────────────────

            return Response(
                {
                    "message": (
                        "Book borrowing request "
                        "rejected successfully."
                    ),
                    "request": (
                        BookRequestSerializer(
                            book_request,
                        ).data
                    ),
                },
                status=status.HTTP_200_OK,
            )

        # =================================================
        # APPROVE
        # =================================================

        if action_type == "approve":

            # ---------------------------------------------
            # MEMBER ACTIVE CHECK
            # ---------------------------------------------

            if not book_request.member.is_active:

                return Response(
                    {
                        "error": (
                            "This member is inactive "
                            "and cannot borrow books."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # ---------------------------------------------
            # LOCK BOOK
            # ---------------------------------------------

            book = (
                Book.objects
                .select_for_update()
                .select_related(
                    "author",
                    "category",
                )
                .get(
                    id=book_request.book.id,
                )
            )

            # ---------------------------------------------
            # AUTHORITATIVE AVAILABILITY CHECK
            # ---------------------------------------------

            if book.available <= 0:

                return Response(
                    {
                        "error": (
                            "This book is currently "
                            "unavailable. The request "
                            "will remain pending until "
                            "a copy becomes available."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # ---------------------------------------------
            # ACTIVE LOAN CHECK
            # ---------------------------------------------

            active_loan = (
                Loan.objects
                .filter(
                    member=book_request.member,
                    book=book,
                    status__in=[
                        "borrowed",
                        "overdue",
                    ],
                )
                .exists()
            )

            if active_loan:

                return Response(
                    {
                        "error": (
                            "This member already has "
                            "this book borrowed."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # ---------------------------------------------
            # DATES
            # ---------------------------------------------

            borrow_date = timezone.localdate()

            due_date = (
                borrow_date
                + timedelta(days=14)
            )

            # ---------------------------------------------
            # CREATE LOAN
            # ---------------------------------------------

            loan = Loan.objects.create(
                book=book,
                member=book_request.member,
                borrow_date=borrow_date,
                due_date=due_date,
                status="borrowed",
            )

            # ---------------------------------------------
            # DECREASE AVAILABLE
            # ---------------------------------------------

            book.available -= 1

            book.save(
                update_fields=[
                    "available",
                ],
            )

            # ---------------------------------------------
            # APPROVE REQUEST
            # ---------------------------------------------

            book_request.status = "approved"

            book_request.processed_at = (
                timezone.now()
            )

            book_request.save(
                update_fields=[
                    "status",
                    "processed_at",
                ],
            )

            # ── notify member ──────────────────────────
            if book_request.member.user:
                create_notification(
                    user=book_request.member.user,
                    notif_type='book_request_approved',
                    title='Borrow Request Approved',
                    message=(
                        f'Your request to borrow '
                        f'"{book.title}" has been approved. '
                        f'Due date: {due_date}.'
                    ),
                )
            # ───────────────────────────────────────────

            return Response(
                {
                    "message": (
                        "Borrowing request approved. "
                        "Loan created successfully."
                    ),
                    "request": (
                        BookRequestSerializer(
                            book_request,
                        ).data
                    ),
                    "loan": LoanSerializer(
                        loan,
                    ).data,
                },
                status=status.HTTP_200_OK,
            )

        # =================================================
        # INVALID ACTION
        # =================================================

        return Response(
            {
                "error": (
                    "Invalid action. Use "
                    "'approve' or 'reject'."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


# =========================================================
# DASHBOARD
# =========================================================


class DashboardView(APIView):

    permission_classes = [
        IsAuthenticatedUser,
    ]

    def get(
        self,
        request,
    ):

        # =================================================
        # ADMIN / LIBRARIAN
        # =================================================

        if request.user.role in [
            "admin",
            "librarian",
        ]:

            total_books = (
                Book.objects.count()
            )

            available_books = (
                Book.objects
                .filter(
                    available__gt=0,
                )
                .count()
            )

            total_copies = (
                Book.objects.aggregate(
                    total=Sum(
                        "quantity",
                    ),
                )["total"]
                or 0
            )

            total_members = (
                Member.objects
                .filter(
                    is_active=True,
                )
                .count()
            )

            total_loans = (
                Loan.objects.count()
            )

            active_loans = (
                Loan.objects
                .filter(
                    status="borrowed",
                )
                .count()
            )

            overdue_loans = (
                Loan.objects
                .filter(
                    status="overdue",
                )
                .count()
            )

            pending_book_requests = (
                BookRequest.objects
                .filter(
                    status="pending",
                )
                .count()
            )

            pending_return_requests = (
                ReturnRequest.objects
                .filter(
                    status="pending",
                )
                .count()
            )

            pending_fees = (
                Fee.objects
                .filter(
                    status="pending",
                )
                .count()
            )

            outstanding_fees_amount = (
                Fee.objects
                .filter(
                    status="pending",
                )
                .aggregate(
                    total=Sum("amount"),
                )["total"]
                or 0
            )

            pending_reservations = (
                Reservation.objects
                .filter(
                    status__in=["waiting", "available"],
                )
                .count()
            )

            recent_loans = (
                Loan.objects
                .select_related(
                    "book",
                    "member",
                )
                .order_by("-borrow_date", "-id")[:10]
            )

            recent_activity = [
                {
                    "type": "borrowed",
                    "member": loan.member.name,
                    "book": loan.book.title,
                    "date": str(loan.borrow_date),
                }
                for loan in recent_loans
            ]

            data = {
                "role": request.user.role,
                "total_books": total_books,
                "available_books": available_books,
                "total_copies": total_copies,
                "total_members": total_members,
                "total_loans": total_loans,
                "active_loans": active_loans,
                "overdue_loans": overdue_loans,
                "pending_book_requests": (
                    pending_book_requests
                ),
                "pending_return_requests": (
                    pending_return_requests
                ),
                "pending_fees": pending_fees,
                "outstanding_fees_amount": (
                    outstanding_fees_amount
                ),
                "pending_reservations": (
                    pending_reservations
                ),
                "recent_activity": recent_activity,
            }

            return Response(
                data,
                status=status.HTTP_200_OK,
            )

        # =================================================
        # MEMBER DASHBOARD
        # =================================================

        try:

            member = (
                Member.objects
                .get(
                    user=request.user,
                )
            )

        except Member.DoesNotExist:

            return Response(
                {
                    "role": "member",
                    "message": (
                        "Member profile not found."
                    ),
                    "active_loans": 0,
                    "overdue_loans": 0,
                    "total_loans": 0,
                    "pending_requests": 0,
                    "pending_return_requests": 0,
                    "pending_fees": 0,
                },
                status=status.HTTP_200_OK,
            )

        today = timezone.localdate()

        member_loans = (
            Loan.objects
            .select_related("book", "book__author")
            .filter(member=member)
        )

        active_loans_qs   = member_loans.filter(status="borrowed")
        overdue_loans_qs  = member_loans.filter(status="overdue")

        active_loans   = active_loans_qs.count()
        overdue_loans  = overdue_loans_qs.count()
        total_loans    = member_loans.count()

        reservations_qs = (
            Reservation.objects
            .select_related("book", "book__author")
            .filter(member=member, status__in=["waiting", "available"])
        )

        outstanding_fees_amount = (
            Fee.objects
            .filter(loan__member=member, status="pending")
            .aggregate(total=Sum("amount"))["total"] or 0
        )

        pending_requests = (
            BookRequest.objects
            .filter(member=member, status="pending")
            .count()
        )

        pending_return_requests = (
            ReturnRequest.objects
            .filter(loan__member=member, status="pending")
            .count()
        )

        # Currently borrowed
        currently_borrowed = [
            {
                "loan_id":  loan.id,
                "book_id":  loan.book.id,
                "title":    loan.book.title,
                "author":   loan.book.author.name,
                "due_date": str(loan.due_date),
                "status":   loan.status,
            }
            for loan in active_loans_qs.order_by("due_date")
        ]

        # Overdue books
        overdue_books = [
            {
                "loan_id":      loan.id,
                "book_id":      loan.book.id,
                "title":        loan.book.title,
                "author":       loan.book.author.name,
                "due_date":     str(loan.due_date),
                "days_overdue": (today - loan.due_date).days,
            }
            for loan in overdue_loans_qs.order_by("due_date")
        ]

        # Upcoming due dates (next 7 days)
        upcoming_due = [
            {
                "loan_id":   loan.id,
                "title":     loan.book.title,
                "due_date":  str(loan.due_date),
                "days_left": (loan.due_date - today).days,
            }
            for loan in active_loans_qs.filter(
                due_date__gte=today,
                due_date__lte=today + timedelta(days=7),
            ).order_by("due_date")
        ]

        # Outstanding fees
        outstanding_fees = [
            {
                "fee_id":     fee.id,
                "book_title": fee.loan.book.title,
                "fee_type":   fee.get_fee_type_display(),
                "amount":     str(fee.amount),
                "created_at": str(fee.created_at.date()),
            }
            for fee in Fee.objects
            .select_related("loan__book")
            .filter(loan__member=member, status="pending")
            .order_by("-created_at")
        ]

        # Payment history (last 10 successful)
        payment_history = [
            {
                "payment_id":     p.id,
                "book_title":     p.fee.loan.book.title,
                "fee_type":       p.fee.get_fee_type_display(),
                "amount":         str(p.amount),
                "status":         p.status,
                "payment_method": p.payment_method,
                "paid_at":        str(p.paid_at.date()) if p.paid_at else None,
            }
            for p in Payment.objects
            .select_related("fee__loan__book")
            .filter(fee__loan__member=member, status="successful")
            .order_by("-paid_at")[:10]
        ]

        # Pending book requests
        pending_book_requests = [
            {
                "request_id":   br.id,
                "book_id":      br.book.id,
                "title":        br.book.title,
                "author":       br.book.author.name,
                "status":       br.status,
                "requested_at": str(br.requested_at.date()),
            }
            for br in BookRequest.objects
            .select_related("book", "book__author")
            .filter(member=member, status="pending")
            .order_by("-requested_at")
        ]

        # Reservations / waitlist
        reservations = [
            {
                "reservation_id": r.id,
                "book_id":        r.book.id,
                "title":          r.book.title,
                "author":         r.book.author.name,
                "status":         r.status,
                "queue_position": r.queue_position,
                "reserved_at":    str(r.reserved_at.date()),
                "expires_at":     str(r.expires_at.date()) if r.expires_at else None,
            }
            for r in reservations_qs.order_by("queue_position")
        ]

        # Recently borrowed (last 5 returned)
        recently_borrowed = [
            {
                "loan_id":     loan.id,
                "title":       loan.book.title,
                "author":      loan.book.author.name,
                "borrow_date": str(loan.borrow_date),
                "return_date": str(loan.return_date) if loan.return_date else None,
            }
            for loan in member_loans
            .filter(status="returned")
            .order_by("-return_date")[:5]
        ]

        # Account activity (last 8 events)
        recent_activity = []
        for loan in member_loans.order_by("-borrow_date")[:4]:
            recent_activity.append({
                "type":  loan.status,
                "title": loan.book.title,
                "date":  str(loan.borrow_date),
                "note":  f"Due {loan.due_date}",
            })
        for br in (
            BookRequest.objects
            .select_related("book")
            .filter(member=member)
            .exclude(status="pending")
            .order_by("-processed_at")[:4]
        ):
            recent_activity.append({
                "type":  f"request_{br.status}",
                "title": br.book.title,
                "date":  str(br.processed_at.date()) if br.processed_at else "",
                "note":  f"Request {br.status}",
            })
        recent_activity.sort(key=lambda x: x["date"], reverse=True)

        data = {
            "role": "member",

            # Summary counts
            "active_loans":            active_loans,
            "overdue_loans":           overdue_loans,
            "total_loans":             total_loans,
            "reservations_count":      reservations_qs.count(),
            "outstanding_fees_amount": str(outstanding_fees_amount),
            "pending_requests":        pending_requests,
            "pending_return_requests": pending_return_requests,

            # Detail sections
            "currently_borrowed":      currently_borrowed,
            "overdue_books":           overdue_books,
            "upcoming_due":            upcoming_due,
            "outstanding_fees":        outstanding_fees,
            "payment_history":         payment_history,
            "pending_book_requests":   pending_book_requests,
            "reservations":            reservations,
            "recently_borrowed":       recently_borrowed,
            "recent_activity":         recent_activity[:8],
        }

        return Response(
            data,
            status=status.HTTP_200_OK,
        )

# =========================================================
# MEMBER FEE VIEW
# =========================================================
class MemberFeeView(APIView):

    """
    Member-only fee listing.

    Members can view only fees belonging to
    their own loans.

    Includes:

        late
        damage
        lost

    Payment is handled separately through:

        MemberPaymentView
        PaymentVerificationView
    """

    permission_classes = [
        IsAuthenticatedUser,
    ]

    # =====================================================
    # GET MEMBER FEES
    # =====================================================

    def get(
        self,
        request,
    ):

        # -------------------------------------------------
        # ONLY MEMBERS
        # -------------------------------------------------

        if getattr(
            request.user,
            "role",
            None
        ) != "member":

            return Response(
                {
                    "detail": (
                        "Only members can access "
                        "their fees."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # -------------------------------------------------
        # MEMBER PROFILE
        # -------------------------------------------------

        try:

            member = (
                Member.objects
                .get(
                    user=request.user,
                )
            )

        except Member.DoesNotExist:

            return Response(
                {
                    "detail": (
                        "Member profile not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # -------------------------------------------------
        # MEMBER'S OWN FEES
        # -------------------------------------------------

        fees = (
            Fee.objects
            .select_related(
                "loan",
                "loan__book",
                "loan__member",
            )
            .filter(
                loan__member=member,
            )
            .order_by(
                "-created_at",
            )
        )

        serializer = FeeSerializer(
            fees,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )
# =========================================================
# SIMPLE PROJECT PAYMENT
# =========================================================

class MemberPaymentView(APIView):

    """
    Simple project payment system.

    This is NOT a real payment gateway.

    Flow:

        Member
            ↓
        Select pending fee
            ↓
        Select payment method
            ↓
        Confirm payment
            ↓
        Payment created
            ↓
        Fee marked as paid

    Supported methods:

        upi
        card
        netbanking
    """

    permission_classes = [
        IsAuthenticatedUser,
    ]

    def post(
        self,
        request,
        fee_id,
    ):

        # =====================================================
        # ROLE CHECK
        # =====================================================

        if getattr(
            request.user,
            "role",
            None,
        ) != "member":

            return Response(
                {
                    "detail": (
                        "Only members can make "
                        "fee payments."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # =====================================================
        # MEMBER PROFILE
        # =====================================================

        try:

            member = (
                Member.objects
                .get(
                    user=request.user,
                )
            )

        except Member.DoesNotExist:

            return Response(
                {
                    "detail": (
                        "Member profile not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # =====================================================
        # PAYMENT METHOD
        # =====================================================

        payment_method = request.data.get(
            "payment_method",
        )

        allowed_methods = [
            "upi",
            "card",
            "netbanking",
        ]

        if payment_method not in allowed_methods:

            return Response(
                {
                    "detail": (
                        "Payment method must be "
                        "upi, card or netbanking."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # =====================================================
        # ATOMIC PAYMENT
        # =====================================================

        with transaction.atomic():

            # -------------------------------------------------
            # LOCK FEE
            # -------------------------------------------------

            try:

                fee = (
                    Fee.objects
                    .select_for_update()
                    .select_related(
                        "loan",
                        "loan__book",
                        "loan__member",
                    )
                    .get(
                        id=fee_id,
                        loan__member=member,
                    )
                )

            except Fee.DoesNotExist:

                return Response(
                    {
                        "detail": "Fee not found."
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # -------------------------------------------------
            # CHECK FEE STATUS
            # -------------------------------------------------

            if fee.status != "pending":

                return Response(
                    {
                        "detail": (
                            "This fee has already been "
                            "paid or is not payable."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # -------------------------------------------------
            # VALIDATE AMOUNT
            # -------------------------------------------------

            amount = Decimal(
                str(fee.amount)
            )

            if amount <= 0:

                return Response(
                    {
                        "detail": (
                            "Fee amount must be "
                            "greater than zero."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # -------------------------------------------------
            # CHECK EXISTING SUCCESSFUL PAYMENT
            # -------------------------------------------------

            existing_payment = (
                Payment.objects
                .filter(
                    fee=fee,
                    status="successful",
                )
                .first()
            )

            if existing_payment:

                return Response(
                    {
                        "detail": (
                            "This fee has already "
                            "been paid."
                        ),
                        "payment": PaymentSerializer(
                            existing_payment
                        ).data,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # -------------------------------------------------
            # CREATE LOCAL TRANSACTION ID
            # -------------------------------------------------

            import uuid

            transaction_id = (
                f"LMS-{uuid.uuid4().hex[:12].upper()}"
            )

            # -------------------------------------------------
            # CREATE PAYMENT
            # -------------------------------------------------
            #
            # gateway_order_id is retained because the
            # existing Payment model contains that field.
            #
            # It is now simply used as a local project
            # reference, NOT as a real gateway order.

            payment = Payment.objects.create(
                fee=fee,
                amount=amount,
                status="successful",
                payment_method=payment_method,
                transaction_id=transaction_id,
                gateway_order_id=(
                    f"SIMPLE-{transaction_id}"
                ),
                paid_at=timezone.now(),
            )

            # -------------------------------------------------
            # MARK FEE AS PAID
            # -------------------------------------------------

            fee.status = "paid"

            fee.paid_at = timezone.now()

            fee.save(
                update_fields=[
                    "status",
                    "paid_at",
                ],
            )

        # ── notify member ──────────────────────────────
        create_notification(
            user=request.user,
            notif_type='payment_successful',
            title='Payment Successful',
            message=(
                f'Your payment of ₹{amount} for '
                f'"{fee.loan.book.title}" was successful. '
                f'Transaction ID: {transaction_id}.'
            ),
        )
        # ───────────────────────────────────────────────

        # =====================================================
        # RESPONSE
        # =====================================================

        return Response(
            {
                "detail": (
                    "Payment completed successfully."
                ),
                "payment": PaymentSerializer(
                    payment
                ).data,
                "fee": FeeSerializer(
                    fee
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


# =========================================================
# PAYMENT VERIFICATION
# =========================================================

class PaymentVerificationView(APIView):

    """
    Kept only for compatibility with older frontend
    versions.

    Simple project payments do not require external
    gateway verification.
    """

    permission_classes = [
        IsAuthenticatedUser,
    ]

    def post(
        self,
        request,
    ):

        return Response(
            {
                "detail": (
                    "External payment verification is "
                    "not required for the simple project "
                    "payment system."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
class MemberPaymentHistoryView(APIView):

    permission_classes = [
        IsAuthenticatedUser
    ]

    def get(self, request):

        if getattr(
            request.user,
            "role",
            None
        ) != "member":

            return Response(
                {
                    "detail": (
                        "Only members can access "
                        "payment history."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            member = Member.objects.get(
                user=request.user
            )
        except Member.DoesNotExist:
            return Response(
                {
                    "detail": "Member profile not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        payments = (
            Payment.objects
            .select_related(
                "fee",
                "fee__loan",
                "fee__loan__book",
            )
            .filter(
                fee__loan__member=member
            )
            .order_by("-created_at")
        )

        serializer = PaymentSerializer(
            payments,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# RESERVATION HELPER
# =========================================================

def _notify_next_reservation(book):
    """
    When a copy becomes available, mark the first
    waiting reservation as 'available' and set
    an expiry window of 3 days.
    """

    next_reservation = (
        Reservation.objects
        .select_for_update()
        .filter(
            book=book,
            status='waiting',
        )
        .order_by('reserved_at')
        .first()
    )

    if next_reservation:

        next_reservation.status = 'available'

        next_reservation.notified_at = timezone.now()

        next_reservation.expires_at = (
            timezone.now() + timedelta(days=3)
        )

        next_reservation.save(
            update_fields=[
                'status',
                'notified_at',
                'expires_at',
            ]
        )

        # ── notify member ──────────────────────────────
        member_user = next_reservation.member.user if next_reservation.member else None
        if member_user:
            create_notification(
                user=member_user,
                notif_type='reservation_available',
                title='Reserved Book Now Available',
                message=(
                    f'"{next_reservation.book.title}" is now '
                    f'available for you to borrow. '
                    f'You have 3 days to pick it up.'
                ),
            )
        # ───────────────────────────────────────────────

        # Recalculate queue positions for remaining waiters
        _recalculate_queue(book)


def _recalculate_queue(book):
    """Recalculate queue_position for all waiting reservations."""

    waiting = (
        Reservation.objects
        .filter(
            book=book,
            status='waiting',
        )
        .order_by('reserved_at')
    )

    for index, reservation in enumerate(waiting, start=1):

        if reservation.queue_position != index:

            reservation.queue_position = index

            reservation.save(
                update_fields=['queue_position']
            )


# =========================================================
# MEMBER RESERVATION VIEW
# =========================================================


class MemberReservationView(APIView):

    """
    Members create and manage their reservations.

    GET  /reservations/         → list member's reservations
    POST /reservations/         → create reservation (book must have 0 available)
    DELETE /reservations/<id>/  → cancel reservation
    """

    permission_classes = [
        IsAuthenticatedUser,
    ]

    # =====================================================
    # LIST MEMBER RESERVATIONS
    # =====================================================

    def get(self, request):

        if request.user.role != 'member':

            return Response(
                {'error': 'Only members can view reservations.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:

            member = Member.objects.get(user=request.user)

        except Member.DoesNotExist:

            return Response(
                {'error': 'Member profile not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        reservations = (
            Reservation.objects
            .select_related('book', 'book__author', 'book__category', 'member')
            .filter(member=member)
            .order_by('-reserved_at')
        )

        serializer = ReservationSerializer(reservations, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)

    # =====================================================
    # CREATE RESERVATION
    # =====================================================

    @transaction.atomic
    def post(self, request):

        if request.user.role != 'member':

            return Response(
                {'error': 'Only members can create reservations.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:

            member = Member.objects.select_for_update().get(user=request.user)

        except Member.DoesNotExist:

            return Response(
                {'error': 'Member profile not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not member.is_active:

            return Response(
                {'error': 'Your account is inactive.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        book_id = request.data.get('book')

        if not book_id:

            return Response(
                {'error': 'Book ID is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            book = Book.objects.select_for_update().get(id=book_id)

        except Book.DoesNotExist:

            return Response(
                {'error': 'Book not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Cannot reserve a book that is available
        if book.available > 0:

            return Response(
                {'error': 'This book is currently available. You can borrow it directly.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Already has an active loan for this book
        active_loan = Loan.objects.filter(
            member=member,
            book=book,
            status__in=['borrowed', 'overdue'],
        ).exists()

        if active_loan:

            return Response(
                {'error': 'You already have this book borrowed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Already has an active reservation
        existing = Reservation.objects.filter(
            member=member,
            book=book,
            status__in=['waiting', 'available'],
        ).first()

        if existing:

            return Response(
                {
                    'error': 'You already have an active reservation for this book.',
                    'reservation': ReservationSerializer(existing).data,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calculate queue position
        queue_position = (
            Reservation.objects
            .filter(book=book, status='waiting')
            .count() + 1
        )

        reservation = Reservation.objects.create(
            book=book,
            member=member,
            status='waiting',
            queue_position=queue_position,
        )

        return Response(
            {
                'message': f'You have been added to the waitlist. You are #{queue_position} in the queue.',
                'reservation': ReservationSerializer(reservation).data,
            },
            status=status.HTTP_201_CREATED,
        )


# =========================================================
# CANCEL RESERVATION VIEW
# =========================================================


class CancelReservationView(APIView):

    """
    DELETE /reservations/<id>/cancel/  → cancel a single reservation
    """

    permission_classes = [
        IsAuthenticatedUser,
    ]

    @transaction.atomic
    def delete(self, request, reservation_id):

        if request.user.role != 'member':

            return Response(
                {'error': 'Only members can cancel reservations.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:

            member = Member.objects.get(user=request.user)

        except Member.DoesNotExist:

            return Response(
                {'error': 'Member profile not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:

            reservation = (
                Reservation.objects
                .select_for_update()
                .get(id=reservation_id, member=member)
            )

        except Reservation.DoesNotExist:

            return Response(
                {'error': 'Reservation not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if reservation.status not in ['waiting', 'available']:

            return Response(
                {'error': 'This reservation cannot be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        was_available = reservation.status == 'available'

        reservation.status = 'cancelled'

        reservation.save(update_fields=['status'])

        # If the cancelled reservation was 'available',
        # notify the next person in the queue
        if was_available:

            book = Book.objects.select_for_update().get(pk=reservation.book_id)

            _notify_next_reservation(book)

        _recalculate_queue(reservation.book)

        return Response(
            {'message': 'Reservation cancelled successfully.'},
            status=status.HTTP_200_OK,
        )


# =========================================================
# RESERVATION QUEUE INFO (for books page)
# =========================================================


class BookReservationQueueView(APIView):

    """
    GET /books/<book_id>/reservation-queue/
    Returns the queue length for a specific book.
    """

    permission_classes = [
        IsAuthenticatedUser,
    ]

    def get(self, request, book_id):

        try:

            book = Book.objects.get(pk=book_id)

        except Book.DoesNotExist:

            return Response(
                {'error': 'Book not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        queue_count = Reservation.objects.filter(
            book=book,
            status='waiting',
        ).count()

        return Response(
            {'book_id': book_id, 'queue_length': queue_count},
            status=status.HTTP_200_OK,
        )


# =========================================================
# LIBRARIAN ANALYTICS
# =========================================================


class LibrarianAnalyticsView(APIView):

    """
    Librarian-only analytics endpoint.

    Returns aggregated data for all dashboard charts:

        - borrowing_trends   (daily/monthly loan counts)
        - top_books          (most borrowed books)
        - popular_categories (loans per category)
        - active_members     (members with most loans)
        - overdue_stats      (overdue / returned-late summary)
        - book_availability  (available vs borrowed copies)
        - fee_analytics      (pending/paid fees by type)
    """

    permission_classes = [
        IsAdminOrLibrarian,
    ]

    def get(self, request):

        range_param = request.query_params.get('range', '30')

        try:
            days = int(range_param)
        except (ValueError, TypeError):
            days = 30

        # clamp to allowed values
        if days not in [7, 30, 180, 365]:
            days = 30

        today = timezone.localdate()
        start_date = today - timedelta(days=days - 1)

        # =================================================
        # BORROWING TRENDS
        # =================================================

        if days <= 30:
            # daily granularity
            trends_qs = (
                Loan.objects
                .filter(borrow_date__gte=start_date)
                .annotate(period=TruncDay('borrow_date'))
                .values('period')
                .annotate(count=Count('id'))
                .order_by('period')
            )
            borrowing_trends = [
                {
                    'date': item['period'].strftime('%Y-%m-%d'),
                    'loans': item['count'],
                }
                for item in trends_qs
            ]
        else:
            # monthly granularity
            trends_qs = (
                Loan.objects
                .filter(borrow_date__gte=start_date)
                .annotate(period=TruncMonth('borrow_date'))
                .values('period')
                .annotate(count=Count('id'))
                .order_by('period')
            )
            borrowing_trends = [
                {
                    'date': item['period'].strftime('%b %Y'),
                    'loans': item['count'],
                }
                for item in trends_qs
            ]

        # =================================================
        # TOP BORROWED BOOKS
        # =================================================

        top_books_qs = (
            Loan.objects
            .values('book__id', 'book__title')
            .annotate(loan_count=Count('id'))
            .order_by('-loan_count')[:10]
        )

        top_books = [
            {
                'book_id': item['book__id'],
                'title': item['book__title'],
                'loans': item['loan_count'],
            }
            for item in top_books_qs
        ]

        # =================================================
        # POPULAR CATEGORIES
        # =================================================

        popular_categories_qs = (
            Loan.objects
            .filter(book__category__isnull=False)
            .values('book__category__id', 'book__category__name')
            .annotate(loan_count=Count('id'))
            .order_by('-loan_count')[:10]
        )

        popular_categories = [
            {
                'category_id': item['book__category__id'],
                'name': item['book__category__name'],
                'loans': item['loan_count'],
            }
            for item in popular_categories_qs
        ]

        # =================================================
        # ACTIVE MEMBERS
        # =================================================

        active_members_qs = (
            Loan.objects
            .values('member__id', 'member__name')
            .annotate(loan_count=Count('id'))
            .order_by('-loan_count')[:10]
        )

        active_members = [
            {
                'member_id': item['member__id'],
                'name': item['member__name'],
                'loans': item['loan_count'],
            }
            for item in active_members_qs
        ]

        # =================================================
        # OVERDUE STATISTICS
        # =================================================

        currently_overdue = Loan.objects.filter(
            status='overdue'
        ).count()

        returned_late = Loan.objects.filter(
            status__in=['returned', 'lost'],
            return_date__isnull=False,
            due_date__isnull=False,
            return_date__gt=F('due_date'),
        ).count()

        total_returned = Loan.objects.filter(
            status__in=['returned', 'lost'],
        ).count()

        on_time_returned = total_returned - returned_late

        overdue_stats = {
            'currently_overdue': currently_overdue,
            'returned_late': returned_late,
            'on_time_returned': on_time_returned,
            'total_returned': total_returned,
        }

        # =================================================
        # BOOK AVAILABILITY
        # =================================================

        availability_qs = (
            Book.objects
            .aggregate(
                total_copies=Sum('quantity'),
                available_copies=Sum('available'),
            )
        )

        total_copies = availability_qs['total_copies'] or 0
        available_copies = availability_qs['available_copies'] or 0
        borrowed_copies = total_copies - available_copies

        book_availability = {
            'total_copies': total_copies,
            'available_copies': available_copies,
            'borrowed_copies': borrowed_copies,
        }

        # =================================================
        # FEE & PAYMENT ANALYTICS
        # =================================================

        fee_summary_qs = (
            Fee.objects
            .values('fee_type', 'status')
            .annotate(
                count=Count('id'),
                total=Sum('amount'),
            )
        )

        fee_by_type = {}
        for item in fee_summary_qs:
            ft = item['fee_type']
            st = item['status']
            if ft not in fee_by_type:
                fee_by_type[ft] = {
                    'fee_type': ft,
                    'pending': 0,
                    'paid': 0,
                    'waived': 0,
                    'pending_amount': 0,
                    'paid_amount': 0,
                    'waived_amount': 0,
                }
            fee_by_type[ft][st] = item['count']
            fee_by_type[ft][f'{st}_amount'] = float(
                item['total'] or 0
            )

        pending_total = float(
            Fee.objects.filter(status='pending')
            .aggregate(t=Sum('amount'))['t'] or 0
        )

        paid_total = float(
            Fee.objects.filter(status='paid')
            .aggregate(t=Sum('amount'))['t'] or 0
        )

        waived_total = float(
            Fee.objects.filter(status='waived')
            .aggregate(t=Sum('amount'))['t'] or 0
        )

        fee_analytics = {
            'pending_total': pending_total,
            'paid_total': paid_total,
            'waived_total': waived_total,
            'by_type': list(fee_by_type.values()),
        }

        # =================================================
        # RESPONSE
        # =================================================

        return Response(
            {
                'range_days': days,
                'borrowing_trends': borrowing_trends,
                'top_books': top_books,
                'popular_categories': popular_categories,
                'active_members': active_members,
                'overdue_stats': overdue_stats,
                'book_availability': book_availability,
                'fee_analytics': fee_analytics,
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# NOTIFICATION VIEWSET
# =========================================================


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):

    """
    GET  /notifications/              → list user's notifications
    GET  /notifications/<id>/         → single notification
    GET  /notifications/unread-count/ → unread badge count
    POST /notifications/<id>/mark-read/     → mark one as read
    POST /notifications/mark-all-read/      → mark all as read
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_queryset(self):
        return (
            Notification.objects
            .filter(user=self.request.user)
            .order_by('-created_at')
        )

    # --------------------------------------------------
    # UNREAD COUNT
    # --------------------------------------------------

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = (
            Notification.objects
            .filter(user=request.user, is_read=False)
            .count()
        )
        return Response({'unread_count': count}, status=status.HTTP_200_OK)

    # --------------------------------------------------
    # MARK ONE AS READ
    # --------------------------------------------------

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response(
            NotificationSerializer(notif).data,
            status=status.HTTP_200_OK,
        )

    # --------------------------------------------------
    # MARK ALL AS READ
    # --------------------------------------------------

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        updated = (
            Notification.objects
            .filter(user=request.user, is_read=False)
            .update(is_read=True)
        )
        return Response(
            {'marked_read': updated},
            status=status.HTTP_200_OK,
        )
