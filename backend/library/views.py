from datetime import datetime

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
)

from .serializers import (
    CategorySerializer,
    AuthorSerializer,
    BookSerializer,
    MemberSerializer,
    LoanSerializer,
    BookRequestSerializer,
    RecentSearchSerializer,
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

    Supports:

    - Book CRUD
    - Category filtering
    - Author filtering
    - Availability filtering
    - Search
    - Ordering
    - Pagination
    - Optimized author/category queries
    """

    queryset = (
        Book.objects
        .select_related(
            "author",
            "category",
        )
        .all()
    )

    serializer_class = BookSerializer

    # =====================================================
    # FILTER BACKENDS
    # =====================================================

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    # =====================================================
    # FILTERING
    # =====================================================

    filterset_fields = [
        "category",
        "author",
        "available",
    ]

    # =====================================================
    # SEARCH
    # =====================================================

    search_fields = [
        "title",
        "isbn",
        "author__name",
        "category__name",
    ]

    # =====================================================
    # ORDERING
    # =====================================================

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

    # =====================================================
    # PERMISSIONS
    # =====================================================

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
    # QUERYSET
    # =====================================================

    def get_queryset(self):

        queryset = (
            Book.objects
            .select_related(
                "author",
                "category",
            )
            .all()
        )

        return queryset

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
        """
        Advanced book search endpoint.

        Searches books by:
        - title
        - ISBN
        - author name
        - category name

        Prefix matching is supported, so typing the
        first few characters can return matching books.
        """

        query = request.query_params.get(
            "q",
            ""
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
    """
    Returns book suggestions while the user types.

    Supports:
    - Title
    - ISBN
    - Author
    - Category
    """

    query = request.query_params.get(
        "q",
        ""
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
# RECENT BOOK SEARCH VIEW
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
                user=request.user
            )
            .order_by(
                "-searched_at"
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
            ""
        ).strip()

        if not query:

            return Response(
                {
                    "error": (
                        "Search query is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ================================================
        # REMOVE EXISTING SEARCH
        # ================================================

        RecentSearch.objects.filter(
            user=request.user,
            query__iexact=query,
        ).delete()

        # ================================================
        # CREATE NEW SEARCH
        # ================================================

        recent_search = RecentSearch.objects.create(
            user=request.user,
            query=query,
        )

        # ================================================
        # KEEP ONLY 10 SEARCHES
        # ================================================

        old_searches = (
            RecentSearch.objects
            .filter(
                user=request.user
            )
            .order_by(
                "-searched_at"
            )[10:]
        )

        old_search_ids = list(
            old_searches.values_list(
                "id",
                flat=True
            )
        )

        if old_search_ids:

            RecentSearch.objects.filter(
                id__in=old_search_ids
            ).delete()

        serializer = RecentSearchSerializer(
            recent_search
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )

# =========================================================
# MEMBER VIEWSET
# =========================================================

class MemberViewSet(viewsets.ModelViewSet):

    queryset = Member.objects.all()

    serializer_class = MemberSerializer

    # =====================================================
    # SEARCH / FILTER / ORDER
    # =====================================================

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

    # =====================================================
    # ROLE-BASED QUERYSET
    # =====================================================

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
                user=self.request.user
            )
        )

    # =====================================================
    # ROLE-BASED PERMISSIONS
    # =====================================================

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

    Supports:

    - Loan CRUD
    - Advanced search
    - Book filtering
    - Member filtering
    - Status filtering
    - Ordering
    - Pagination
    - Optimized book/member queries
    - Role-based access
    - Transaction-safe issue/return flow
    """

    queryset = (
        Loan.objects
        .select_related(
            "book",
            "member",
        )
        .all()
    )

    serializer_class = LoanSerializer

    # =====================================================
    # FILTER / SEARCH / ORDER
    # =====================================================

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    # =====================================================
    # FILTERING
    # =====================================================

    filterset_fields = [
        "status",
        "book",
        "member",
        "borrow_date",
        "due_date",
        "return_date",
    ]

    # =====================================================
    # SEARCH
    # =====================================================

    search_fields = [
        "book__title",
        "book__isbn",
        "member__name",
        "member__email",
        "member__phone",
        "status",
    ]

    # =====================================================
    # ORDERING
    # =====================================================

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

    # =====================================================
    # ROLE-BASED QUERYSET
    # =====================================================

    def get_queryset(self):

        queryset = (
            Loan.objects
            .select_related(
                "book",
                "member",
            )
            .all()
        )

        # -----------------------------------------------
        # ADMIN / LIBRARIAN
        # -----------------------------------------------

        if self.request.user.role in [
            "admin",
            "librarian",
        ]:

            return queryset

        # -----------------------------------------------
        # MEMBER
        # -----------------------------------------------

        return queryset.filter(
            member__user=self.request.user
        )

    # =====================================================
    # ROLE-BASED PERMISSIONS
    # =====================================================

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
    # CREATE / ISSUE BOOK
    # =====================================================

    @transaction.atomic
    def create(
        self,
        request,
        *args,
        **kwargs,
    ):

        book_id = request.data.get(
            "book"
        )

        if not book_id:

            return Response(
                {
                    "error": "Book ID is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            book = (
                Book.objects
                .select_for_update()
                .get(
                    id=book_id
                )
            )

        except Book.DoesNotExist:

            return Response(
                {
                    "error": "Book not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # =================================================
        # AVAILABILITY CHECK
        # =================================================

        if book.available <= 0:

            return Response(
                {
                    "error": "Book is not available.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # =================================================
        # SERIALIZER VALIDATION
        # =================================================

        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        # =================================================
        # CREATE LOAN
        # =================================================

        loan = serializer.save()

        # =================================================
        # DECREASE AVAILABLE COPIES
        # =================================================

        book.available -= 1

        book.save(
            update_fields=[
                "available",
            ]
        )

        return Response(
            LoanSerializer(
                loan
            ).data,
            status=status.HTTP_201_CREATED,
        )

    # =====================================================
    # RETURN BOOK
    # =====================================================

    @action(
        detail=True,
        methods=["post"],
    )
    @transaction.atomic
    def return_book(
        self,
        request,
        pk=None,
    ):

        try:

            loan = (
                Loan.objects
                .select_for_update()
                .select_related("book")
                .get(
                    pk=pk
                )
            )

        except Loan.DoesNotExist:

            return Response(
                {
                    "error": "Loan not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # =================================================
        # ALREADY RETURNED
        # =================================================

        if loan.status == "returned":

            return Response(
                {
                    "error": "Book already returned.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # =================================================
        # UPDATE LOAN
        # =================================================

        loan.status = "returned"

        loan.return_date = (
            timezone.now().date()
        )

        loan.save(
            update_fields=[
                "status",
                "return_date",
            ]
        )

        # =================================================
        # UPDATE BOOK
        # =================================================

        book = (
            Book.objects
            .select_for_update()
            .get(
                id=loan.book.id
            )
        )

        book.available += 1

        if book.available > book.quantity:

            book.available = book.quantity

        book.save(
            update_fields=[
                "available",
            ]
        )

        return Response(
            {
                "message": (
                    "Book returned successfully."
                ),
                "loan": LoanSerializer(
                    loan
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    # =====================================================
    # OVERDUE LOANS
    # =====================================================

    @action(
        detail=False,
        methods=["get"],
    )
    def overdue(
        self,
        request,
    ):

        today = timezone.now().date()

        overdue_loans = (
            self.get_queryset()
            .filter(
                status="borrowed",
                due_date__lt=today,
            )
        )

        overdue_loans.update(
            status="overdue"
        )

        serializer = self.get_serializer(
            overdue_loans,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )
# =========================================================
# BOOK REQUEST VIEW
# =========================================================

class BookRequestView(APIView):

    """
    Members:
        - Create book requests
        - View their own requests

    Librarians:
        - View all requests

    Admin:
        - No access
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

        # =================================================
        # LIBRARIAN
        # =================================================

        if request.user.role == "librarian":

            requests = (
                BookRequest.objects
                .select_related(
                    "book",
                    "member",
                )
                .all()
            )

        # =================================================
        # MEMBER
        # =================================================

        elif request.user.role == "member":

            try:

                member = Member.objects.get(
                    user=request.user
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
                    "member",
                )
                .filter(
                    member=member
                )
            )

        # =================================================
        # ADMIN / OTHER
        # =================================================

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

    def post(
        self,
        request,
    ):

        if request.user.role != "member":

            return Response(
                {
                    "error": (
                        "Only members can request books."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # =================================================
        # MEMBER PROFILE
        # =================================================

        try:

            member = Member.objects.get(
                user=request.user
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

        # =================================================
        # BOOK ID
        # =================================================

        book_id = request.data.get(
            "book"
        )

        if not book_id:

            return Response(
                {
                    "error": "Book ID is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # =================================================
        # BOOK
        # =================================================

        try:

            book = Book.objects.get(
                id=book_id
            )

        except Book.DoesNotExist:

            return Response(
                {
                    "error": "Book not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # =================================================
        # AVAILABILITY
        # =================================================

        if book.available <= 0:

            return Response(
                {
                    "error": (
                        "This book is currently "
                        "not available."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # =================================================
        # DUPLICATE PENDING REQUEST
        # =================================================

        existing_request = (
            BookRequest.objects
            .filter(
                member=member,
                book=book,
                status="pending",
            )
            .exists()
        )

        if existing_request:

            return Response(
                {
                    "error": (
                        "You already have a pending "
                        "request for this book."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # =================================================
        # ACTIVE LOAN CHECK
        # =================================================

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

        # =================================================
        # CREATE REQUEST
        # =================================================

        book_request = (
            BookRequest.objects.create(
                member=member,
                book=book,
            )
        )

        serializer = BookRequestSerializer(
            book_request
        )

        return Response(
            {
                "message": (
                    "Book request submitted "
                    "successfully."
                ),
                "request": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


# =========================================================
# LIBRARIAN BOOK REQUEST MANAGEMENT
# =========================================================

class LibrarianBookRequestActionView(APIView):

    permission_classes = [
        IsLibrarian,
    ]

    # =====================================================
    # APPROVE / REJECT
    # =====================================================

    @transaction.atomic
    def patch(
        self,
        request,
        request_id,
    ):

        try:

            book_request = (
                BookRequest.objects
                .select_for_update()
                .select_related(
                    "book",
                    "member",
                )
                .get(
                    id=request_id
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

        # =================================================
        # REQUEST ALREADY PROCESSED
        # =================================================

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

        action_type = request.data.get(
            "action"
        )

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
                ]
            )

            return Response(
                {
                    "message": (
                        "Book request rejected."
                    ),
                    "request": BookRequestSerializer(
                        book_request
                    ).data,
                },
                status=status.HTTP_200_OK,
            )

        # =================================================
        # APPROVE
        # =================================================

        if action_type == "approve":

            # =============================================
            # LOCK BOOK
            # =============================================

            book = (
                Book.objects
                .select_for_update()
                .get(
                    id=book_request.book.id
                )
            )

            # =============================================
            # AVAILABILITY
            # =============================================

            if book.available <= 0:

                return Response(
                    {
                        "error": (
                            "This book is no longer "
                            "available."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # =============================================
            # ACTIVE LOAN CHECK
            # =============================================

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

            # =============================================
            # DUE DATE
            # =============================================

            due_date = request.data.get(
                "due_date"
            )

            if not due_date:

                return Response(
                    {
                        "error": (
                            "Due date is required "
                            "when approving a request."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:

                parsed_due_date = (
                    datetime.strptime(
                        due_date,
                        "%Y-%m-%d",
                    ).date()
                )

            except ValueError:

                return Response(
                    {
                        "error": (
                            "Due date must be in "
                            "YYYY-MM-DD format."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # =============================================
            # DUE DATE VALIDATION
            # =============================================

            if (
                parsed_due_date
                < timezone.now().date()
            ):

                return Response(
                    {
                        "error": (
                            "Due date cannot be "
                            "in the past."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # =============================================
            # CREATE LOAN
            # =============================================

            loan = Loan.objects.create(
                book=book,
                member=book_request.member,
                due_date=parsed_due_date,
                status="borrowed",
            )

            # =============================================
            # DECREASE AVAILABLE
            # =============================================

            book.available -= 1

            book.save(
                update_fields=[
                    "available",
                ]
            )

            # =============================================
            # UPDATE REQUEST
            # =============================================

            book_request.status = "approved"

            book_request.processed_at = (
                timezone.now()
            )

            book_request.save(
                update_fields=[
                    "status",
                    "processed_at",
                ]
            )

            return Response(
                {
                    "message": (
                        "Book request approved "
                        "and loan created successfully."
                    ),
                    "request": BookRequestSerializer(
                        book_request
                    ).data,
                    "loan": LoanSerializer(
                        loan
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
        # ADMIN / LIBRARIAN DASHBOARD
        # =================================================

        if request.user.role in [
            "admin",
            "librarian",
        ]:

            total_books = (
                Book.objects.count()
            )

            total_available = (
                Book.objects.aggregate(
                    total=Count(
                        "id",
                        filter=Q(
                            available__gt=0
                        ),
                    )
                )["total"]
                or 0
            )

            total_copies = (
                Book.objects.aggregate(
                    total=Sum("quantity")
                )["total"]
                or 0
            )

            total_members = (
                Member.objects
                .filter(
                    is_active=True
                )
                .count()
            )

            total_loans = (
                Loan.objects.count()
            )

            active_loans = (
                Loan.objects
                .filter(
                    status="borrowed"
                )
                .count()
            )

            overdue_loans = (
                Loan.objects
                .filter(
                    status="overdue"
                )
                .count()
            )

            data = {
                "role": request.user.role,
                "total_books": total_books,
                "available_books": total_available,
                "total_copies": total_copies,
                "total_members": total_members,
                "active_loans": active_loans,
                "overdue_loans": overdue_loans,
                "total_loans": total_loans,
            }

            return Response(
                data,
                status=status.HTTP_200_OK,
            )

        # =================================================
        # MEMBER DASHBOARD
        # =================================================

        try:

            member = Member.objects.get(
                user=request.user
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
                },
                status=status.HTTP_200_OK,
            )

        member_loans = Loan.objects.filter(
            member=member
        )

        active_loans = (
            member_loans
            .filter(
                status="borrowed"
            )
            .count()
        )

        overdue_loans = (
            member_loans
            .filter(
                status="overdue"
            )
            .count()
        )

        total_loans = (
            member_loans.count()
        )

        data = {
            "role": "member",
            "active_loans": active_loans,
            "overdue_loans": overdue_loans,
            "total_loans": total_loans,
        }

        return Response(
            data,
            status=status.HTTP_200_OK,
        )