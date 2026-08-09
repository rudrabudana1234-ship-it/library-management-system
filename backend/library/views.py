from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Count, Q
from .models import Author, Book, Member, Loan
from .serializers import AuthorSerializer, BookSerializer, MemberSerializer, LoanSerializer


class AuthorViewSet(viewsets.ModelViewSet):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all().select_related('author')
    serializer_class = BookSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'isbn', 'author__name']
    ordering_fields = ['title', 'available', 'created_at']


class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'email', 'phone']


class LoanViewSet(viewsets.ModelViewSet):
    queryset = Loan.objects.all().select_related('book', 'member')
    serializer_class = LoanSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['book__title', 'member__name', 'status']
    ordering_fields = ['borrow_date', 'due_date']

    def create(self, request, *args, **kwargs):
        """Issue a book"""
        book_id = request.data.get('book')
        
        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({"error": "Book not found"}, status=status.HTTP_404_NOT_FOUND)

        if book.available <= 0:
            return Response({"error": "Book is not available"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        loan = serializer.save()

        # Decrease available count
        book.available -= 1
        book.save()

        return Response(LoanSerializer(loan).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def return_book(self, request, pk=None):
        """Return a book"""
        loan = self.get_object()

        if loan.status == 'returned':
            return Response({"error": "Book already returned"}, status=status.HTTP_400_BAD_REQUEST)

        loan.status = 'returned'
        loan.return_date = timezone.now().date()
        loan.save()

        # Increase available count
        book = loan.book
        book.available += 1
        book.save()

        return Response({
            "message": "Book returned successfully",
            "loan": LoanSerializer(loan).data
        })

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """List all overdue loans"""
        today = timezone.now().date()
        overdue_loans = self.queryset.filter(
            status='borrowed',
            due_date__lt=today
        )
        
        # Optional: auto mark as overdue
        overdue_loans.update(status='overdue')

        serializer = self.get_serializer(overdue_loans, many=True)
        return Response(serializer.data)


class DashboardView(APIView):
    """Dashboard statistics"""
    
    def get(self, request):
        total_books = Book.objects.count()
        total_available = Book.objects.aggregate(total=Count('id', filter=Q(available__gt=0)))['total'] or 0
        total_members = Member.objects.filter(is_active=True).count()
        total_loans = Loan.objects.count()
        active_loans = Loan.objects.filter(status='borrowed').count()
        overdue_loans = Loan.objects.filter(status='overdue').count()

        # Also count currently borrowed books
        borrowed_books = Loan.objects.filter(status__in=['borrowed', 'overdue']).count()

        data = {
            "total_books": total_books,
            "available_books": Book.objects.filter(available__gt=0).count(),
            "total_copies": Book.objects.aggregate(total=Count('quantity')) ,  # optional
            "total_members": total_members,
            "active_loans": active_loans,
            "overdue_loans": overdue_loans,
            "total_loans": total_loans,
        }
        return Response(data)