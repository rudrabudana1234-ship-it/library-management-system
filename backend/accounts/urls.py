from django.urls import path

from .views import (
    AdminRoleManagementView,
    RegisterView,
    LibrarianRegisterView,
    LoginView,
    MeView,
    LogoutView,
    AdminCreateUserView,
    LibrarianRequestListView,
    LibrarianRequestActionView,
    AdminDashboardView,
    AdminLibrarianListView,
    AdminLibrarianStatusView,
    ForgotPasswordView,
    ResetPasswordView,
    ChangePasswordView,
)


urlpatterns = [

    # ==========================================
    # AUTHENTICATION
    # ==========================================

    path(
        'register/',
        RegisterView.as_view(),
        name='register'
    ),

    path(
        'librarian-register/',
        LibrarianRegisterView.as_view(),
        name='librarian-register'
    ),

    path(
        'login/',
        LoginView.as_view(),
        name='login'
    ),

    path(
        'me/',
        MeView.as_view(),
        name='me'
    ),

    path(
        'logout/',
        LogoutView.as_view(),
        name='logout'
    ),

    # ==========================================
    # PASSWORD RESET
    # ==========================================

    path(
        'forgot-password/',
        ForgotPasswordView.as_view(),
        name='forgot-password'
    ),

    path(
        'reset-password/<uidb64>/<token>/',
        ResetPasswordView.as_view(),
        name='reset-password'
    ),

    path(
    'change-password/',
    ChangePasswordView.as_view(),
    name='change-password'
  ), 

    # ==========================================
    # ADMIN
    # ==========================================

    path(
        'admin/create-user/',
        AdminCreateUserView.as_view(),
        name='admin-create-user'
    ),

    path(
        'admin/users/<int:user_id>/role/',
        AdminRoleManagementView.as_view(),
        name='admin-user-role'
    ),

    # ==========================================
    # LIBRARIAN REQUESTS
    # ==========================================

    path(
        'admin/librarian-requests/',
        LibrarianRequestListView.as_view(),
        name='admin-librarian-requests'
    ),

    path(
        'admin/librarian-requests/<int:user_id>/',
        LibrarianRequestActionView.as_view(),
        name='admin-librarian-request-action'
    ),

    # ==========================================
    # ADMIN DASHBOARD
    # ==========================================

    path(
        'admin/dashboard/',
        AdminDashboardView.as_view(),
        name='admin-dashboard'
    ),

    # ==========================================
    # LIBRARIAN MANAGEMENT
    # ==========================================

    path(
        'admin/librarians/',
        AdminLibrarianListView.as_view(),
        name='admin-librarians'
    ),

    path(
        'admin/librarians/<int:user_id>/status/',
        AdminLibrarianStatusView.as_view(),
        name='admin-librarian-status'
    ),
]