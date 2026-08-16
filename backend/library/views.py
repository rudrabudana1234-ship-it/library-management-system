from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils import timezone
from django.db.models import Count, Q

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
    IsLoanOwnerOrAdminOrLibrarian
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

    filter_backends = [filters.SearchFilter]

    search_fields = [
        'name',
        'email',
        'phone'
    ]

    def get_queryset(self):

        if self.request.user.role in ['admin', 'librarian']:
            return Member.objects.all()

        return Member.objects.filter(
            user=self.request.user
        )

    def get_permissions(self):

        if self.action == 'create':

            permission_classes = [
                IsAdminOrLibrarian
            ]

        elif self.action == 'destroy':

            permission_classes = [
                IsMemberOwnerOrAdmin
            ]

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

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter
    ]

    search_fields = [
        'book__title',
        'member__name',
        'status'
    ]

    ordering_fields = [
        'borrow_date',
        'due_date'
    ]

    # -----------------------------
    # ROLE-BASED QUERYSET
    # -----------------------------

    def get_queryset(self):

        # Admin and Librarian can see all loans
        if self.request.user.role in [
            'admin',
            'librarian'
        ]:
            return self.queryset

        # Member can see only their own loans
        return self.queryset.filter(
            member__user=self.request.user
        )

    # -----------------------------
    # ROLE-BASED PERMISSIONS
    # -----------------------------

    def get_permissions(self):

        # Only Admin and Librarian can create loans
        if self.action == 'create':

            permission_classes = [
                IsAdminOrLibrarian
            ]

        # Only Admin and Librarian can return books
        elif self.action in [
            'return_book',
            'overdue'
        ]:

            permission_classes = [
                IsAdminOrLibrarian
            ]

        # Only Admin can update or delete loans
        elif self.action in [
            'update',
            'partial_update',
            'destroy'
        ]:

            permission_classes = [
                IsAdmin
            ]

        # Listing and retrieving loans
        else:

            permission_classes = [
                IsLoanOwnerOrAdminOrLibrarian
            ]

        return [
            permission()
            for permission in permission_classes
        ]

    # -----------------------------
    # CREATE / ISSUE BOOK
    # -----------------------------

    def create(self, request, *args, **kwargs):

        """Issue a book"""

        book_id = request.data.get('book')

        try:

            book = Book.objects.get(
                id=book_id
            )

        except Book.DoesNotExist:

            return Response(
                {"error": "Book not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check book availability
        if book.available <= 0:

            return Response(
                {"error": "Book is not available"},
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

    # -----------------------------
    # RETURN BOOK
    # -----------------------------

    @action(
        detail=True,
        methods=['post']
    )
    def return_book(
        self,
        request,
        pk=None
    ):

        """Return a book"""

        loan = self.get_object()

        # Check if already returned
        if loan.status == 'returned':

            return Response(
                {"error": "Book already returned"},
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

    # -----------------------------
    # OVERDUE LOANS
    # -----------------------------

    @action(
        detail=False,
        methods=['get']
    )
    def overdue(
        self,
        request
    ):

        """List all overdue loans"""

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

    permission_classes = [IsAdminOrLibrarian]

    def get(self, request):

        total_books = Book.objects.count()

        total_available = Book.objects.aggregate(
            total=Count(
                'id',
                filter=Q(available__gt=0)
            )
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
            "total_books": total_books,
            "available_books": total_available,
            "total_copies": Book.objects.aggregate(
                total=Count('quantity')
            ),
            "total_members": total_members,
            "active_loans": active_loans,
            "overdue_loans": overdue_loans,
            "total_loans": total_loans,
        }

        return Response(data)