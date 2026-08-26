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
)

router = DefaultRouter()

router.register(
    r'categories',
    CategoryViewSet
)

router.register(
    r'authors',
    AuthorViewSet
)

router.register(
    r'books',
    BookViewSet
)

router.register(
    r'members',
    MemberViewSet
)

router.register(
    r'loans',
    LoanViewSet
)

urlpatterns = [

    path(
        '',
        include(router.urls)
    ),

    path(
        'dashboard/',
        DashboardView.as_view(),
        name='dashboard'
    ),

    path(
    "books/recent-searches/",
    RecentBookSearchView.as_view(),
    name="recent-book-searches",
    ),

]