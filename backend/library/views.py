from datetime import timedelta
from decimal import Decimal, InvalidOperation
import razorpay
from razorpay.errors import SignatureVerificationError

from django.conf import settings

from django.db import transaction
from django.db.models import Count, Q, Sum
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
)

from .permissions import IsAuthenticatedUser

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
        # UPDATE STATUS
        # -------------------------------------------------

        overdue_loans.update(
            status="overdue",
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

        member_loans = Loan.objects.filter(
            member=member,
        )

        active_loans = (
            member_loans
            .filter(
                status="borrowed",
            )
            .count()
        )

        overdue_loans = (
            member_loans
            .filter(
                status="overdue",
            )
            .count()
        )

        total_loans = (
            member_loans.count()
        )

        pending_requests = (
            BookRequest.objects
            .filter(
                member=member,
                status="pending",
            )
            .count()
        )

        pending_return_requests = (
            ReturnRequest.objects
            .filter(
                loan__member=member,
                status="pending",
            )
            .count()
        )

        pending_fees = (
            Fee.objects
            .filter(
                loan__member=member,
                status="pending",
            )
            .count()
        )

        data = {
            "role": "member",
            "active_loans": active_loans,
            "overdue_loans": overdue_loans,
            "total_loans": total_loans,
            "pending_requests": pending_requests,
            "pending_return_requests": (
                pending_return_requests
            ),
            "pending_fees": pending_fees,
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
class MemberPaymentView(APIView):
    """
    Creates a Razorpay order for one of the
    authenticated member's own outstanding fees.
    """

    permission_classes = [
        IsAuthenticatedUser
    ]

    def post(self, request, fee_id):

        user = request.user

        # =====================================================
        # ROLE CHECK
        # =====================================================

        if getattr(user, "role", None) != "member":
            return Response(
                {
                    "detail": "Only members can make fee payments."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # =====================================================
        # GET MEMBER PROFILE
        # =====================================================

        try:
            member = Member.objects.get(
                user=user
            )
        except Member.DoesNotExist:
            return Response(
                {
                    "detail": "Member profile not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # =====================================================
        # GET MEMBER'S FEE
        # =====================================================

        try:
            fee = (
                Fee.objects
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

        # =====================================================
        # CHECK FEE STATUS
        # =====================================================

        if fee.status != "pending":
            return Response(
                {
                    "detail": "This fee is not pending."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # =====================================================
        # CHECK RAZORPAY CONFIGURATION
        # =====================================================

        if not settings.RAZORPAY_KEY_ID:
            return Response(
                {
                    "detail": (
                        "Razorpay is not configured. "
                        "Set RAZORPAY_KEY_ID."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not settings.RAZORPAY_KEY_SECRET:
            return Response(
                {
                    "detail": (
                        "Razorpay is not configured. "
                        "Set RAZORPAY_KEY_SECRET."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # =====================================================
        # VALIDATE AMOUNT
        # =====================================================

        amount = Decimal(
            str(fee.amount)
        )

        if amount <= 0:
            return Response(
                {
                    "detail": (
                        "Fee amount must be greater "
                        "than zero."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # =====================================================
        # CREATE RAZORPAY CLIENT
        # =====================================================

        client = razorpay.Client(
            auth=(
                settings.RAZORPAY_KEY_ID,
                settings.RAZORPAY_KEY_SECRET,
            )
        )

        # Razorpay expects amount in paise
        amount_in_paise = int(
            amount * Decimal("100")
        )

        # =====================================================
        # CREATE RAZORPAY ORDER
        # =====================================================

        try:

            order = client.order.create(
                {
                    "amount": amount_in_paise,
                    "currency": "INR",
                    "receipt": (
                        f"fee_{fee.id}_"
                        f"member_{member.id}"
                    ),
                }
            )

        except Exception as exc:

            return Response(
                {
                    "detail": (
                        "Unable to create payment order."
                    ),
                    "error": str(exc),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # =====================================================
        # SAVE PAYMENT RECORD
        # =====================================================

        payment = Payment.objects.create(
            fee=fee,
            amount=amount,
            gateway_order_id=order["id"],
            status="created",
        )

        # =====================================================
        # RETURN ORDER DETAILS TO FRONTEND
        # =====================================================

        return Response(
            {
                "payment_id": payment.id,
                "fee_id": fee.id,
                "amount": str(amount),
                "amount_in_paise": amount_in_paise,
                "currency": "INR",
                "razorpay_order_id": order["id"],
                "razorpay_key_id": (
                    settings.RAZORPAY_KEY_ID
                ),
            },
            status=status.HTTP_201_CREATED,
        )
class PaymentVerificationView(APIView):
    """
    Verifies the Razorpay payment signature and,
    only after successful verification, marks the
    corresponding fee as paid.
    """

    permission_classes = [
        IsAuthenticatedUser
    ]

    def post(self, request):

        user = request.user

        if getattr(user, "role", None) != "member":
            return Response(
                {
                    "detail": (
                        "Only members can verify "
                        "their own payments."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        razorpay_order_id = request.data.get(
            "razorpay_order_id"
        )

        razorpay_payment_id = request.data.get(
            "razorpay_payment_id"
        )

        razorpay_signature = request.data.get(
            "razorpay_signature"
        )

        if not all(
            [
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
            ]
        ):
            return Response(
                {
                    "detail": (
                        "razorpay_order_id, "
                        "razorpay_payment_id and "
                        "razorpay_signature are required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            member = Member.objects.get(
                user=user
            )
        except Member.DoesNotExist:
            return Response(
                {
                    "detail": "Member profile not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            payment = (
                Payment.objects
                .select_related(
                    "fee",
                    "fee__loan",
                    "fee__loan__member",
                )
                .get(
                    gateway_order_id=razorpay_order_id,
                    fee__loan__member=member,
                )
            )

        except Payment.DoesNotExist:

            return Response(
                {
                    "detail": "Payment record not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if payment.status == "successful":

            return Response(
                {
                    "detail": "Payment already verified.",
                    "payment": PaymentSerializer(
                        payment
                    ).data,
                },
                status=status.HTTP_200_OK,
            )

        if not settings.RAZORPAY_KEY_ID:
            return Response(
                {
                    "detail": "Razorpay is not configured."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not settings.RAZORPAY_KEY_SECRET:
            return Response(
                {
                    "detail": "Razorpay is not configured."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        client = razorpay.Client(
            auth=(
                settings.RAZORPAY_KEY_ID,
                settings.RAZORPAY_KEY_SECRET,
            )
        )

        try:

            client.utility.verify_payment_signature(
                {
                    "razorpay_order_id":
                        razorpay_order_id,

                    "razorpay_payment_id":
                        razorpay_payment_id,

                    "razorpay_signature":
                        razorpay_signature,
                }
            )

        except SignatureVerificationError:

            payment.status = "failed"
            payment.save(
                update_fields=["status"]
            )

            return Response(
                {
                    "detail": (
                        "Payment signature verification failed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as exc:

            return Response(
                {
                    "detail": (
                        "Unable to verify payment."
                    ),
                    "error": str(exc),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        with transaction.atomic():

            payment.status = "successful"

            payment.gateway_payment_id = (
                razorpay_payment_id
            )

            payment.transaction_id = (
                razorpay_payment_id
            )

            payment.paid_at = timezone.now()

            payment.save(
                update_fields=[
                    "status",
                    "gateway_payment_id",
                    "transaction_id",
                    "paid_at",
                ]
            )

            fee = payment.fee

            if fee.status == "pending":

                fee.status = "paid"

                fee.paid_at = timezone.now()

                fee.save(
                    update_fields=[
                        "status",
                        "paid_at",
                    ]
                )

        return Response(
            {
                "detail": "Payment successful.",
                "payment": PaymentSerializer(
                    payment
                ).data,
                "fee": FeeSerializer(
                    fee
                ).data,
            },
            status=status.HTTP_200_OK,
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