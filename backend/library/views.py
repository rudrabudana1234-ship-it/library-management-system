from rest_framework import viewsets, status, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils import timezone
from django.db.models import Count, Q, Sum

from .models import Author, Book, Member, Loan
from .serializers import (
    AuthorSerializer,
    BookSerializer,
    MemberSerializer,
    LoanSerializer
)

from .permissions import IsAuthenticatedUser

from accounts.permissions import (
    IsAdmin,
    IsLibrarian,
    IsMember,
    IsAdminOrLibrarian,
    IsMemberOwnerOrAdmin,
    IsMemberOwnerOrAdminOrLibrarian,
    IsLoanOwnerOrAdminOrLibrarian,
)


class AuthorViewSet(viewsets.ModelViewSet):

    queryset = Author.objects.all()
    serializer_class = AuthorSerializer

    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def get_permissions(self):

        if self.action in [
            'create',
            'update',
            'partial_update'
        ]:
            permission_classes = [IsAdminOrLibrarian]

        elif self.action == 'destroy':
            permission_classes = [IsAdmin]

        else:
            permission_classes = [IsAuthenticatedUser]

        return [permission() for permission in permission_classes]


class BookViewSet(viewsets.ModelViewSet):

    queryset = Book.objects.all().select_related('author')
    serializer_class = BookSerializer

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter
    ]

    search_fields = [
        'title',
        'isbn',
        'author__name'
    ]

    ordering_fields = [
        'title',
        'available',
        'created_at'
    ]

    def get_permissions(self):

        if self.action in [
            'create',
            'update',
            'partial_update'
        ]:
            permission_classes = [IsAdminOrLibrarian]

        elif self.action == 'destroy':
            permission_classes = [IsAdmin]

        else:
            permission_classes = [IsAuthenticatedUser]

        return [permission() for permission in permission_classes]

class MemberViewSet(viewsets.ModelViewSet):

    queryset = Member.objects.all()
    serializer_class = MemberSerializer

    # ==========================================
    # SEARCH + FILTERING + ORDERING
    # ==========================================

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    # Search fields
    search_fields = [
        'name',
        'email',
        'phone',
    ]

    # Fields allowed for sorting
    ordering_fields = [
        'name',
        'email',
        'joined_date',
    ]

    # Default ordering
    ordering = [
        'name'
    ]

    # ==========================================
    # ROLE-BASED QUERYSET
    # ==========================================

    def get_queryset(self):

        # Admin and Librarian
        # can see all members
        if self.request.user.role in [
            'admin',
            'librarian'
        ]:
            queryset = Member.objects.all()

        # Ordinary member
        # can see only their own profile
        else:
            queryset = Member.objects.filter(
                user=self.request.user
            )

        # ======================================
        # ACTIVE / INACTIVE FILTER
        # ======================================

        is_active = self.request.query_params.get(
            'is_active'
        )

        if is_active == 'true':

            queryset = queryset.filter(
                is_active=True
            )

        elif is_active == 'false':

            queryset = queryset.filter(
                is_active=False
            )

        return queryset

    # ==========================================
    # ROLE-BASED PERMISSIONS
    # ==========================================

    def get_permissions(self):

        # -------------------------------
        # CREATE
        # -------------------------------
        # Only Admin and Librarian
        # can create members

        if self.action == 'create':

            permission_classes = [
                IsAdminOrLibrarian
            ]

        # -------------------------------
        # DELETE
        # -------------------------------
        # Admin or member owner

        elif self.action == 'destroy':

            permission_classes = [
                IsMemberOwnerOrAdmin
            ]

        # -------------------------------
        # OTHER ACTIONS
        # -------------------------------
        # Admin / Librarian / Owner

        else:

            permission_classes = [
                IsMemberOwnerOrAdminOrLibrarian
            ]

        return [
            permission()
            for permission in permission_classes
        ]
class LoanViewSet(viewsets.ModelViewSet):

    queryset = Loan.objects.all().select_related(
        'book',
        'member'
    )

    serializer_class = LoanSerializer

    # =========================
    # SEARCH + FILTERING
    # =========================

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]

    filterset_fields = [
    'status',
    'book',
    'member',
    ]

    search_fields = [
        'book__title',
        'member__name',
        'status'
    ]

    ordering_fields = [
        'borrow_date',
        'due_date',
        'return_date',
        'status'
    ]

    ordering = [
        '-borrow_date'
    ]

    # =========================
    # ROLE-BASED QUERYSET
    # =========================

    def get_queryset(self):

        # Admin + Librarian
        # Can see all loans
        if self.request.user.role in [
            'admin',
            'librarian'
        ]:
            return self.queryset

        # Member
        # Can see only their own loans
        return self.queryset.filter(
            member__user=self.request.user
        )

    # =========================
    # ROLE-BASED PERMISSIONS
    # =========================

    def get_permissions(self):

        # Create loan
        if self.action == 'create':

            permission_classes = [
                IsAdminOrLibrarian
            ]

        # Return + overdue
        elif self.action in [
            'return_book',
            'overdue'
        ]:

            permission_classes = [
                IsAdminOrLibrarian
            ]

        # Update/delete
        elif self.action in [
            'update',
            'partial_update',
            'destroy'
        ]:

            permission_classes = [
                IsAdmin
            ]

        # List/retrieve
        else:

            permission_classes = [
                IsLoanOwnerOrAdminOrLibrarian
            ]

        return [
            permission()
            for permission in permission_classes
        ]

    # =========================
    # CREATE / ISSUE BOOK
    # =========================

    def create(self, request, *args, **kwargs):

        book_id = request.data.get('book')

        try:

            book = Book.objects.get(
                id=book_id
            )

        except Book.DoesNotExist:

            return Response(
                {
                    "error": "Book not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Check availability
        if book.available <= 0:

            return Response(
                {
                    "error": "Book is not available"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        loan = serializer.save()

        # Reduce available copies
        book.available -= 1
        book.save()

        return Response(
            LoanSerializer(loan).data,
            status=status.HTTP_201_CREATED
        )

    # =========================
    # RETURN BOOK
    # =========================

    @action(
        detail=True,
        methods=['post']
    )
    def return_book(
        self,
        request,
        pk=None
    ):

        loan = self.get_object()

        if loan.status == 'returned':

            return Response(
                {
                    "error": "Book already returned"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        loan.status = 'returned'
        loan.return_date = timezone.now().date()

        loan.save()

        # Increase available copies
        book = loan.book

        book.available += 1
        book.save()

        return Response({

            "message": "Book returned successfully",

            "loan": LoanSerializer(
                loan
            ).data

        })

    # =========================
    # OVERDUE LOANS
    # =========================

    @action(
        detail=False,
        methods=['get']
    )
    def overdue(self, request):

        today = timezone.now().date()

        overdue_loans = self.queryset.filter(
            status='borrowed',
            due_date__lt=today
        )

        # Update status
        overdue_loans.update(
            status='overdue'
        )

        serializer = self.get_serializer(
            overdue_loans,
            many=True
        )

        return Response(
            serializer.data
        )

class DashboardView(APIView):

    permission_classes = [IsAuthenticatedUser]

    def get(self, request):

        # --------------------------------
        # ADMIN / LIBRARIAN DASHBOARD
        # --------------------------------

        if request.user.role in ['admin', 'librarian']:

            total_books = Book.objects.count()

            total_available = Book.objects.aggregate(
                total=Count(
                    'id',
                    filter=Q(available__gt=0)
                )
            )['total'] or 0

            total_copies = Book.objects.aggregate(
                total=Sum('quantity')
            )['total'] or 0

            total_members = Member.objects.filter(
                is_active=True
            ).count()

            total_loans = Loan.objects.count()

            active_loans = Loan.objects.filter(
                status='borrowed'
            ).count()

            overdue_loans = Loan.objects.filter(
                status='overdue'
            ).count()

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

            return Response(data)

        # --------------------------------
        # MEMBER DASHBOARD
        # --------------------------------

        try:
            member = Member.objects.get(
                user=request.user
            )

        except Member.DoesNotExist:

            return Response(
                {
                    "role": "member",
                    "message": "Member profile not found.",
                    "active_loans": 0,
                    "overdue_loans": 0,
                    "total_loans": 0,
                }
            )

        member_loans = Loan.objects.filter(
            member=member
        )

        active_loans = member_loans.filter(
            status='borrowed'
        ).count()

        overdue_loans = member_loans.filter(
            status='overdue'
        ).count()

        total_loans = member_loans.count()

        data = {
            "role": "member",
            "active_loans": active_loans,
            "overdue_loans": overdue_loans,
            "total_loans": total_loans,
        }

        return Response(data)