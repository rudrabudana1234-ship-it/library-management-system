from django.contrib import admin
from .models import Author, Book, Member, Loan


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']
    search_fields = ['name']


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'author', 'isbn', 'quantity', 'available']
    list_filter = ['author']
    search_fields = ['title', 'isbn']
    autocomplete_fields = ['author']


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'email', 'phone', 'is_active', 'joined_date']
    list_filter = ['is_active']
    search_fields = ['name', 'email']


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ['id', 'book', 'member', 'borrow_date', 'due_date', 'status']
    list_filter = ['status', 'borrow_date']
    search_fields = ['book__title', 'member__name']
    autocomplete_fields = ['book', 'member']