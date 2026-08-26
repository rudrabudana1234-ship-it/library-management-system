from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import (
    force_bytes,
    force_str
)
from django.utils.http import (
    urlsafe_base64_encode,
    urlsafe_base64_decode
)

from rest_framework import generics, status
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated
)
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView

from library.models import (
    Book,
    Loan,
    Author
)

from .models import User

from .permissions import (
    IsAdminOrLibrarian,
    IsAdmin
)

from .serializers import (
    RegisterSerializer,
    LibrarianRegisterSerializer,
    LoginSerializer,
    UserSerializer,
    AdminCreateUserSerializer,
    AdminRoleUpdateSerializer,
    LibrarianRequestSerializer,
    LibrarianRequestActionSerializer,
    AdminLibrarianSerializer,
    AdminLibrarianStatusSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    ChangePasswordSerializer,
)


# ==========================================
# MEMBER REGISTRATION
# ==========================================

class RegisterView(generics.CreateAPIView):

    queryset = User.objects.all()

    serializer_class = RegisterSerializer

    permission_classes = [
        AllowAny
    ]


# ==========================================
# LIBRARIAN REGISTRATION
# ==========================================

class LibrarianRegisterView(generics.CreateAPIView):

    queryset = User.objects.all()

    serializer_class = LibrarianRegisterSerializer

    permission_classes = [
        AllowAny
    ]

    def create(
        self,
        request,
        *args,
        **kwargs
    ):

        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.save()

        return Response(
            {
                "message": (
                    "Librarian application submitted "
                    "successfully. Please wait for "
                    "admin approval."
                ),
                "username": user.username,
                "status": user.librarian_request
            },
            status=status.HTTP_201_CREATED
        )


# ==========================================
# LOGIN
# ==========================================

class LoginView(generics.GenericAPIView):

    serializer_class = LoginSerializer

    permission_classes = [
        AllowAny
    ]

    def post(self, request):

        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        return Response(
            serializer.validated_data,
            status=status.HTTP_200_OK
        )


# ==========================================
# CURRENT USER
# ==========================================

class MeView(generics.RetrieveAPIView):

    serializer_class = UserSerializer

    permission_classes = [
        IsAuthenticated
    ]

    def get_object(self):

        return self.request.user


# ==========================================
# LOGOUT
# ==========================================

class LogoutView(generics.GenericAPIView):

    permission_classes = [
        IsAuthenticated
    ]

    def post(self, request):

        refresh_token = request.data.get(
            'refresh'
        )

        if not refresh_token:

            return Response(
                {
                    'error': (
                        'Refresh token is required.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:

            token = RefreshToken(
                refresh_token
            )

            token.blacklist()

            return Response(
                {
                    'message': (
                        'Logout successful.'
                    )
                },
                status=status.HTTP_205_RESET_CONTENT
            )

        except Exception:

            return Response(
                {
                    'error': (
                        'Invalid refresh token.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )


# ==========================================
# BOOK CREATE TEST VIEW
# ==========================================

class BookCreateView(APIView):

    permission_classes = [
        IsAdminOrLibrarian,
        IsAuthenticated
    ]

    def post(self, request):

        return Response(
            {
                "message": (
                    "Book created successfully"
                )
            }
        )


# ==========================================
# ADMIN CREATE USER
# ==========================================

class AdminCreateUserView(APIView):

    permission_classes = [
        IsAdmin
    ]

    def post(self, request):

        serializer = AdminCreateUserSerializer(
            data=request.data
        )

        if serializer.is_valid():

            user = serializer.save()

            return Response(
                {
                    "message": (
                        "User created successfully"
                    ),
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "role": user.role,
                    }
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


# ==========================================
# ADMIN ROLE MANAGEMENT
# ==========================================

class AdminRoleManagementView(APIView):

    permission_classes = [
        IsAdmin
    ]

    def patch(
        self,
        request,
        user_id
    ):

        try:

            user = User.objects.get(
                id=user_id
            )

        except User.DoesNotExist:

            return Response(
                {
                    "error": "User not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        requested_role = request.data.get(
            'role'
        )

        # Librarian role must only be granted
        # through the librarian approval workflow.
        if requested_role == 'librarian':

            return Response(
                {
                    "error": (
                        "Librarian role can only be "
                        "assigned through the librarian "
                        "request approval process."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if (
            user == request.user
            and requested_role != 'admin'
        ):

            return Response(
                {
                    "error": (
                        "You cannot remove "
                        "your own admin role."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AdminRoleUpdateSerializer(
            user,
            data=request.data,
            partial=True
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(
            {
                "message": (
                    "User role updated successfully"
                ),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": user.role
                }
            },
            status=status.HTTP_200_OK
        )


# ==========================================
# ADMIN: VIEW PENDING LIBRARIAN REQUESTS
# ==========================================

class LibrarianRequestListView(APIView):

    permission_classes = [
        IsAdmin
    ]

    def get(self, request):

        users = User.objects.filter(
            librarian_request='pending'
        ).order_by(
            '-created_at'
        )

        serializer = LibrarianRequestSerializer(
            users,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


# ==========================================
# ADMIN: APPROVE / REJECT LIBRARIAN REQUEST
# ==========================================

class LibrarianRequestActionView(APIView):

    permission_classes = [
        IsAdmin
    ]

    def patch(
        self,
        request,
        user_id
    ):

        try:

            user = User.objects.get(
                id=user_id
            )

        except User.DoesNotExist:

            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if user.librarian_request != 'pending':

            return Response(
                {
                    "error": (
                        "This user does not have "
                        "a pending librarian request."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = LibrarianRequestActionSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        action = serializer.validated_data['action']

        if action == 'approve':

            user.role = 'librarian'

            user.is_active = True

            user.librarian_request = 'approved'

            user.save(
                update_fields=[
                    'role',
                    'is_active',
                    'librarian_request',
                    'updated_at'
                ]
            )

            return Response(
                {
                    "message": (
                        "Librarian request "
                        "approved successfully."
                    ),
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "role": user.role,
                        "status": user.librarian_request
                    }
                },
                status=status.HTTP_200_OK
            )

        # ==========================================
        # REJECT
        # ==========================================

        user.role = 'member'

        user.librarian_request = 'rejected'

        user.save(
            update_fields=[
                'role',
                'librarian_request',
                'updated_at'
            ]
        )

        return Response(
            {
                "message": (
                    "Librarian request "
                    "rejected successfully."
                ),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "role": user.role,
                    "status": user.librarian_request
                }
            },
            status=status.HTTP_200_OK
        )


# ==========================================
# ADMIN DASHBOARD
# ==========================================

class AdminDashboardView(APIView):

    permission_classes = [
        IsAdmin
    ]

    def get(self, request):

        total_users = User.objects.count()

        total_members = User.objects.filter(
            role='member'
        ).count()

        total_librarians = User.objects.filter(
            role='librarian'
        ).count()

        total_books = Book.objects.count()

        total_authors = Author.objects.count()

        total_loans = Loan.objects.count()

        pending_librarian_requests = User.objects.filter(
            librarian_request='pending'
        ).count()

        return Response({

            "stats": {
                "total_users": total_users,
                "total_members": total_members,
                "total_librarians": total_librarians,
                "total_books": total_books,
                "total_authors": total_authors,
                "total_loans": total_loans,
                "pending_librarian_requests":
                    pending_librarian_requests,
            }

        })


# ==========================================
# ADMIN: VIEW LIBRARIANS
# ==========================================

class AdminLibrarianListView(APIView):

    permission_classes = [
        IsAdmin
    ]

    def get(self, request):

        librarians = User.objects.filter(
            role='librarian'
        ).order_by(
            '-created_at'
        )

        serializer = AdminLibrarianSerializer(
            librarians,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


# ==========================================
# ADMIN: ACTIVATE / DEACTIVATE LIBRARIAN
# ==========================================

class AdminLibrarianStatusView(APIView):

    permission_classes = [
        IsAdmin
    ]

    def patch(
        self,
        request,
        user_id
    ):

        try:

            librarian = User.objects.get(
                id=user_id,
                role='librarian'
            )

        except User.DoesNotExist:

            return Response(
                {
                    "error": "Librarian not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AdminLibrarianStatusSerializer(
            librarian,
            data=request.data,
            partial=True
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save(
            update_fields=[
                'is_active',
                'updated_at'
            ]
        )

        return Response(
            {
                "message": (
                    "Librarian status updated successfully."
                ),
                "librarian": {
                    "id": librarian.id,
                    "username": librarian.username,
                    "is_active": librarian.is_active
                }
            },
            status=status.HTTP_200_OK
        )


# ==========================================
# FORGOT PASSWORD
# ==========================================

class ForgotPasswordView(APIView):

    permission_classes = [
        AllowAny
    ]

    def post(self, request):

        serializer = ForgotPasswordSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        email = serializer.validated_data[
            'email'
        ]

        users = User.objects.filter(
            email=email
        )

        # Always return the same response,
        # whether the email exists or not.
        if users.exists():

            user = users.first()

            # Generate encoded user ID
            uid = urlsafe_base64_encode(
                force_bytes(user.pk)
            )

            # Generate secure password reset token
            token = default_token_generator.make_token(
                user
            )

            # Get frontend URL from settings
            frontend_url = getattr(
                settings,
                'FRONTEND_URL',
                'http://localhost:5173'
            )

            # Build reset URL
            reset_link = (
                f"{frontend_url}/reset-password/"
                f"{uid}/{token}/"
            )

            # Send password reset email
            send_mail(
                subject=(
                    'Library Management System - '
                    'Password Reset'
                ),
                message=(
                    f"Hello {user.first_name or user.username},\n\n"

                    "You requested a password reset for your "
                    "Library Management System account.\n\n"

                    "Click the link below to reset your password:\n\n"

                    f"{reset_link}\n\n"

                    "This link is valid only for a limited time "
                    "and can only be used once.\n\n"

                    "If you did not request this password reset, "
                    "you can safely ignore this email.\n\n"

                    "Regards,\n"
                    "Library Management System"
                ),
                from_email=getattr(
                    settings,
                    'DEFAULT_FROM_EMAIL',
                    None
                ),
                recipient_list=[
                    user.email
                ],
                fail_silently=False
            )

        return Response(
            {
                "message": (
                    "If an account with this email exists, "
                    "a password reset link has been sent."
                )
            },
            status=status.HTTP_200_OK
        )


# ==========================================
# RESET PASSWORD
# ==========================================

class ResetPasswordView(APIView):

    permission_classes = [
        AllowAny
    ]

    def post(
        self,
        request,
        uidb64,
        token
    ):

        serializer = ResetPasswordSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        # ==========================================
        # DECODE USER ID
        # ==========================================

        try:

            uid = force_str(
                urlsafe_base64_decode(
                    uidb64
                )
            )

            user = User.objects.get(
                pk=uid
            )

        except (
            TypeError,
            ValueError,
            OverflowError,
            User.DoesNotExist
        ):

            return Response(
                {
                    "error": (
                        "Invalid password reset link."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ==========================================
        # VALIDATE RESET TOKEN
        # ==========================================

        if not default_token_generator.check_token(
            user,
            token
        ):

            return Response(
                {
                    "error": (
                        "This password reset link is "
                        "invalid or has expired."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ==========================================
        # CHANGE PASSWORD
        # ==========================================

        user.set_password(
            serializer.validated_data[
                'new_password'
            ]
        )

        user.save(
            update_fields=[
                'password'
            ]
        )

        return Response(
            {
                "message": (
                    "Password reset successfully. "
                    "You can now login with your new password."
                )
            },
            status=status.HTTP_200_OK
        )
# ==========================================
# CHANGE PASSWORD
# ==========================================

class ChangePasswordView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def post(self, request):

        serializer = ChangePasswordSerializer(
            data=request.data,
            context={
                'request': request
            }
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = request.user

        user.set_password(
            serializer.validated_data['new_password']
        )

        user.save(
            update_fields=[
                'password'
            ]
        )

        return Response(
            {
                "message": (
                    "Password changed successfully. "
                    "Please login again with your new password."
                )
            },
            status=status.HTTP_200_OK
        )