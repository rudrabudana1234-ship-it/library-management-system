from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    AuthorViewSet,
    BookViewSet,
    MemberViewSet,
    LoanViewSet,
    DashboardView,
    RecentBookSearchView,
    AIBookSearchView,
    BookRequestView,
    LibrarianBookRequestActionView,
    LibrarianReturnRequestView,
    LibrarianFeeView,
    MemberFeeView,
    MemberPaymentView,
    PaymentVerificationView,
    MemberPaymentHistoryView,
    MemberReservationView,
    CancelReservationView,
    BookReservationQueueView,
    LibrarianAnalyticsView,
    NotificationViewSet,
)

# =========================================================
# ROUTER
# =========================================================
router = DefaultRouter()

router.register(
    r'categories',
    CategoryViewSet,
    basename='category'
)

router.register(
    r'authors',
    AuthorViewSet,
    basename='author'
)

router.register(
    r'books',
    BookViewSet,
    basename='book'
)

router.register(
    r'members',
    MemberViewSet,
    basename='member'
)

router.register(
    r'loans',
    LoanViewSet,
    basename='loan'
)

router.register(
    r'notifications',
    NotificationViewSet,
    basename='notification'
)

# =========================================================
# URL PATTERNS
# =========================================================

urlpatterns = [

    # =====================================================
    # ROUTER APIs
    # =====================================================

    path(
        '',
        include(router.urls)
    ),

    # =====================================================
    # DASHBOARD
    # =====================================================

    path(
        'dashboard/',
        DashboardView.as_view(),
        name='dashboard'
    ),

    # =====================================================
    # RECENT BOOK SEARCHES
    # =====================================================

    path(
        'books/recent-searches/',
        RecentBookSearchView.as_view(),
        name='recent-book-searches',
    ),

    # =====================================================
    # AI BOOK SEARCH
    # =====================================================

    path(
        'books/ai-search/',
        AIBookSearchView.as_view(),
        name='ai-book-search',
    ),

    # =====================================================
    # MEMBER BOOK REQUESTS
    # =====================================================

    path(
        'book-requests/',
        BookRequestView.as_view(),
        name='book-requests',
    ),

    # =====================================================
    # LIBRARIAN BOOK REQUEST ACTION
    # =====================================================

    path(
        'book-requests/<int:request_id>/action/',
        LibrarianBookRequestActionView.as_view(),
        name='book-request-action',
    ),

        # =====================================================
    # MEMBER RETURN REQUEST
    # =====================================================

    # Handled through:
    #
    # POST /api/loans/<id>/request-return/
    #

    # =====================================================
    # LIBRARIAN RETURN REQUESTS
    # =====================================================

    path(
        'return-requests/',
        LibrarianReturnRequestView.as_view(),
        name='return-requests',
    ),

    path(
        'return-requests/<int:request_id>/',
        LibrarianReturnRequestView.as_view(),
        name='return-request-action',
    ),

    # =====================================================
    # LIBRARIAN FEES
    # =====================================================

    path(
        'fees/',
        LibrarianFeeView.as_view(),
        name='fees',
    ),

    path(
        'fees/<int:fee_id>/',
        LibrarianFeeView.as_view(),
        name='fee-action',
    ),


    path('member-fees/', MemberFeeView.as_view(), name='member-fees'),

    path('payments/', MemberPaymentHistoryView.as_view(), name='member-payment-history'),

    path('payments/create/<int:fee_id>/', MemberPaymentView.as_view(), name='member-payment-create'),

    path('payments/verify/', PaymentVerificationView.as_view(), name='payment-verify'),

    # =====================================================
    # RESERVATIONS
    # =====================================================

    path(
        'reservations/',
        MemberReservationView.as_view(),
        name='member-reservations',
    ),

    path(
        'reservations/<int:reservation_id>/cancel/',
        CancelReservationView.as_view(),
        name='cancel-reservation',
    ),

    path(
        'books/<int:book_id>/reservation-queue/',
        BookReservationQueueView.as_view(),
        name='book-reservation-queue',
    ),

    # =====================================================
    # LIBRARIAN ANALYTICS
    # =====================================================

    path(
        'analytics/',
        LibrarianAnalyticsView.as_view(),
        name='librarian-analytics',
    ),
]