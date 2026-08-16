from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """
    Allows access only to admin users.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
        )


class IsLibrarian(BasePermission):
    """
    Allows access only to librarian users.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'librarian'
        )


class IsMember(BasePermission):
    """
    Allows access only to member users.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'member'
        )


class IsAdminOrLibrarian(BasePermission):
    """
    Allows access to admin and librarian users.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ['admin', 'librarian']
        )

class IsMemberOwnerOrAdminOrLibrarian(BasePermission):

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                'member',
                'librarian',
                'admin'
            ]
        )

    def has_object_permission(self, request, view, obj):

        # Admin and Librarian can access any Member object
        if request.user.role in ['admin', 'librarian']:
            return True

        # Member can access only their own Member object
        return obj.user == request.user


class IsMemberOwnerOrAdmin(BasePermission):

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                'member',
                'admin'
            ]
        )

    def has_object_permission(self, request, view, obj):

        if request.user.role == 'admin':
            return True

        return obj.user == request.user

class IsLoanOwnerOrAdminOrLibrarian(BasePermission):

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                'member',
                'librarian',
                'admin'
            ]
        )

    def has_object_permission(self, request, view, obj):

        if request.user.role in ['admin', 'librarian']:
            return True

        return obj.member.user == request.user