from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from backend.accounts.permissions import IsAdminOrLibrarian, IsAdmin
from rest_framework.views import APIView
from .models import User
from .serializers import (RegisterSerializer, LoginSerializer, UserSerializer, AdminCreateUserSerializer)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data,status=status.HTTP_200_OK)


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class LogoutView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {
                    'error': 'Refresh token is required.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {
                    'message': 'Logout successful.'
                },
                status=status.HTTP_205_RESET_CONTENT
            )

        except Exception:
            return Response(
                {
                    'error': 'Invalid refresh token.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

class BookCreateView(APIView):
    permission_classes = [IsAdminOrLibrarian, IsAuthenticated]
    def post(self, request):
        return Response({
            "message": "Book created successfully"
        })

class AdminCreateUserView(APIView):

    permission_classes = [IsAdmin]

    def post(self, request):

        serializer = AdminCreateUserSerializer(
            data=request.data
        )

        if serializer.is_valid():

            user = serializer.save()

            return Response(
                {
                    'message': 'User created successfully.',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'role': user.role,
                    }
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )