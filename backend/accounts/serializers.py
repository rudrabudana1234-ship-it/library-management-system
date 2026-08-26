from django.contrib.auth import authenticate

from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from library.models import Member


# ==========================================
# MEMBER REGISTRATION
# ==========================================

class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    password2 = serializers.CharField(
        write_only=True
    )

    class Meta:
        model = User

        fields = [
            'username',
            'email',
            'password',
            'password2',
            'first_name',
            'last_name',
            'phone',
        ]

    def validate_email(self, value):

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )

        return value

    def validate(self, data):

        if data['password'] != data['password2']:
            raise serializers.ValidationError({
                'password': 'Passwords do not match.'
            })

        return data

    def create(self, validated_data):

        validated_data.pop('password2')

        password = validated_data.pop('password')

        user = User.objects.create_user(
            password=password,
            role='member',
            librarian_request='none',
            **validated_data
        )

        # Automatically create Member profile
        Member.objects.create(
            user=user,
            name=user.get_full_name() or user.username,
            email=user.email,
            phone=user.phone or "",
        )

        return user


# ==========================================
# LIBRARIAN REGISTRATION / RE-APPLICATION
# ==========================================

class LibrarianRegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    password2 = serializers.CharField(
        write_only=True
    )

    class Meta:
        model = User

        fields = [
            'username',
            'email',
            'password',
            'password2',
            'first_name',
            'last_name',
            'phone',
        ]

    def validate_email(self, value):

        try:
            user = User.objects.get(email=value)

        except User.DoesNotExist:
            return value

        # Existing user can re-apply only when
        # their previous librarian request was rejected.
        if user.librarian_request == 'rejected':
            return value

        raise serializers.ValidationError(
            "A user with this email already exists."
        )

    def validate(self, data):

        if data['password'] != data['password2']:
            raise serializers.ValidationError({
                'password': 'Passwords do not match.'
            })

        return data

    def create(self, validated_data):

        validated_data.pop('password2')

        password = validated_data.pop('password')

        email = validated_data['email']

        # ==========================================
        # RE-APPLICATION
        # ==========================================

        try:
            user = User.objects.get(email=email)

            if user.librarian_request == 'rejected':

                user.username = validated_data.get(
                    'username',
                    user.username
                )

                user.first_name = validated_data.get(
                    'first_name',
                    user.first_name
                )

                user.last_name = validated_data.get(
                    'last_name',
                    user.last_name
                )

                user.phone = validated_data.get(
                    'phone',
                    user.phone
                )

                user.set_password(password)

                # User remains a member until admin approval
                user.role = 'member'

                # New librarian application
                user.librarian_request = 'pending'

                user.is_active = True

                user.save(
                    update_fields=[
                        'username',
                        'first_name',
                        'last_name',
                        'phone',
                        'password',
                        'role',
                        'librarian_request',
                        'is_active',
                        'updated_at',
                    ]
                )

                return user

        except User.DoesNotExist:
            pass

        # ==========================================
        # NEW LIBRARIAN APPLICATION
        # ==========================================

        user = User.objects.create_user(
            password=password,
            role='member',
            librarian_request='pending',
            is_active=True,
            **validated_data
        )

        return user


# ==========================================
# LOGIN
# ==========================================

class LoginSerializer(serializers.Serializer):

    username = serializers.CharField()

    password = serializers.CharField(
        write_only=True
    )

    def validate(self, data):

        username = data.get('username')
        password = data.get('password')

        # Find user first so we can show
        # librarian request status.
        try:
            user = User.objects.get(
                username=username
            )

        except User.DoesNotExist:

            raise serializers.ValidationError(
                "Invalid username or password."
            )

        # Pending librarian request
        if user.librarian_request == 'pending':

            raise serializers.ValidationError(
                "Your librarian request is pending admin approval."
            )

        # Rejected librarian request
        if user.librarian_request == 'rejected':

            raise serializers.ValidationError(
                "Your librarian request was rejected by the admin."
            )

        # Authenticate
        user = authenticate(
            username=username,
            password=password
        )

        if user is None:

            raise serializers.ValidationError(
                "Invalid username or password."
            )

        if not user.is_active:

            raise serializers.ValidationError(
                "This account is inactive."
            )

        # Create JWT
        refresh = RefreshToken.for_user(user)

        refresh['username'] = user.username
        refresh['role'] = user.role

        return {
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }


# ==========================================
# USER SERIALIZER
# ==========================================

class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User

        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'phone',
            'role',
            'librarian_request',
            'profile_image',
            'created_at',
        ]

        read_only_fields = [
            'id',
            'role',
            'librarian_request',
            'created_at',
        ]


# ==========================================
# ADMIN CREATE USER
# ==========================================

class AdminCreateUserSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    class Meta:
        model = User

        fields = [
            'username',
            'email',
            'password',
            'first_name',
            'last_name',
            'phone',
            'role',
        ]

    def validate_role(self, value):

        if value not in [
            'member',
            'admin'
        ]:
            raise serializers.ValidationError(
                "Librarians must be created through "
                "the librarian application and approval process."
            )

        return value

    def validate_email(self, value):

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )

        return value

    def create(self, validated_data):

        password = validated_data.pop('password')

        user = User.objects.create_user(
            password=password,
            librarian_request='none',
            **validated_data
        )

        # Create Member profile only for members
        if user.role == 'member':

            Member.objects.create(
                user=user,
                name=user.get_full_name() or user.username,
                email=user.email,
                phone=user.phone or "",
            )

        return user


# ==========================================
# ADMIN ROLE UPDATE
# ==========================================

class AdminRoleUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = User

        fields = [
            'role'
        ]

    def validate_role(self, value):

        if value not in [
            'member',
            'librarian',
            'admin'
        ]:
            raise serializers.ValidationError(
                "Invalid role."
            )

        return value


# ==========================================
# LIBRARIAN REQUEST SERIALIZER
# ==========================================

class LibrarianRequestSerializer(serializers.ModelSerializer):

    class Meta:
        model = User

        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'phone',
            'librarian_request',
            'created_at',
        ]


# ==========================================
# LIBRARIAN REQUEST ACTION
# ==========================================

class LibrarianRequestActionSerializer(serializers.Serializer):

    action = serializers.ChoiceField(
        choices=[
            'approve',
            'reject'
        ]
    )


# ==========================================
# ADMIN LIBRARIAN LIST SERIALIZER
# ==========================================

class AdminLibrarianSerializer(serializers.ModelSerializer):

    class Meta:
        model = User

        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'phone',
            'role',
            'is_active',
            'librarian_request',
            'created_at',
        ]

        read_only_fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'phone',
            'role',
            'librarian_request',
            'created_at',
        ]


# ==========================================
# ADMIN LIBRARIAN STATUS
# ==========================================

class AdminLibrarianStatusSerializer(serializers.ModelSerializer):

    class Meta:
        model = User

        fields = [
            'is_active'
        ]


# ==========================================
# FORGOT PASSWORD
# ==========================================

class ForgotPasswordSerializer(serializers.Serializer):

    email = serializers.EmailField()


# ==========================================
# RESET PASSWORD
# ==========================================

class ResetPasswordSerializer(serializers.Serializer):

    new_password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    new_password2 = serializers.CharField(
        write_only=True
    )

    def validate(self, data):

        if data['new_password'] != data['new_password2']:

            raise serializers.ValidationError({
                'new_password': 'Passwords do not match.'
            })

        return data

# ==========================================
# CHANGE PASSWORD
# ==========================================

class ChangePasswordSerializer(serializers.Serializer):

    current_password = serializers.CharField(
        write_only=True
    )

    new_password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    new_password2 = serializers.CharField(
        write_only=True
    )

    def validate(self, data):

        user = self.context['request'].user

        # Check current password
        if not user.check_password(
            data['current_password']
        ):
            raise serializers.ValidationError({
                'current_password':
                    'Current password is incorrect.'
            })

        # Check new passwords match
        if (
            data['new_password']
            != data['new_password2']
        ):
            raise serializers.ValidationError({
                'new_password':
                    'New passwords do not match.'
            })

        # Prevent same password
        if user.check_password(
            data['new_password']
        ):
            raise serializers.ValidationError({
                'new_password':
                    'New password must be different from your current password.'
            })

        return data