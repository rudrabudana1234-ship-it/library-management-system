from decimal import Decimal
from datetime import timedelta
from uuid import uuid4

from django.apps import apps
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.contrib.auth import get_user_model


def find_model(name):
    """Find a model by class name without hardcoding the library app label."""
    matches = [
        model for model in apps.get_models()
        if model.__name__.lower() == name.lower()
    ]

    if not matches:
        raise LookupError(
            f"Could not find model '{name}'. "
            f"Make sure the Django app containing it is installed."
        )

    if len(matches) > 1:
        raise LookupError(
            f"Multiple models named '{name}' were found: "
            + ", ".join(
                f"{m._meta.app_label}.{m.__name__}" for m in matches
            )
        )

    return matches[0]


class Command(BaseCommand):
    help = "Create realistic demo data for the Library Management System."

    DEMO_USERNAMES = {
        "admin_test",
        "librarian_test",
        "librarian2_test",
        "member_arjun",
        "member_neha",
        "member_rohan",
        "member_ananya",
        "member_vivek",
    }

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete the demo users and related demo data before reseeding.",
        )

    def handle(self, *args, **options):
        User = get_user_model()

        Category = find_model("Category")
        Author = find_model("Author")
        Book = find_model("Book")
        Member = find_model("Member")
        Loan = find_model("Loan")
        ReturnRequest = find_model("ReturnRequest")
        Fee = find_model("Fee")
        Payment = find_model("Payment")
        BookRequest = find_model("BookRequest")
        Reservation = find_model("Reservation")
        Notification = find_model("Notification")
        RecentSearch = find_model("RecentSearch")

        with transaction.atomic():
            if options["reset"]:
                self.stdout.write("Removing previous demo users...")
                User.objects.filter(
                    username__in=self.DEMO_USERNAMES
                ).delete()

            users = self.seed_users(User)
            categories = self.seed_categories(Category)
            authors = self.seed_authors(Author)
            books = self.seed_books(Book, authors, categories)

            # Add 40 more books using 40 different categories that are
            # already present in the database but are not represented by
            # the original demo books. This keeps the catalogue diverse
            # without hardcoding category names.
            books.update(
                self.seed_additional_books(
                    Book,
                    Category,
                    Author,
                    authors,
                    books,
                )
            )

            members = self.seed_members(Member, users)

            loans = self.seed_loans(
                Loan,
                books,
                members,
            )

            self.seed_book_requests(
                BookRequest,
                books,
                members,
            )

            self.seed_reservations(
                Reservation,
                books,
                members,
            )

            fees = self.seed_fees(
                Fee,
                loans,
            )

            self.seed_payments(
                Payment,
                fees,
            )

            self.seed_return_requests(
                ReturnRequest,
                loans,
            )

            self.seed_notifications(
                Notification,
                users,
            )

            self.seed_recent_searches(
                RecentSearch,
                users,
            )

            self.finalize_book_availability(
                books
            )

            # Ensure every book created by this seed has a useful
            # description, including any existing demo books whose
            # description field was previously blank.
            self.ensure_book_descriptions(Book, books)

        self.stdout.write(self.style.SUCCESS(""))
        self.stdout.write(
            self.style.SUCCESS(
                "Demo LMS data created/updated successfully."
            )
        )
        self.stdout.write("")
        self.stdout.write("Demo login accounts:")
        self.stdout.write("  Admin:      admin_test / Admin@123")
        self.stdout.write("  Librarian:  librarian_test / Lib@12345")
        self.stdout.write("  Librarian2: librarian2_test / Lib@12345")
        self.stdout.write("  Arjun:      member_arjun / Member@123")
        self.stdout.write("  Neha:       member_neha / Member@123")
        self.stdout.write("  Rohan:      member_rohan / Member@123")
        self.stdout.write("  Ananya:     member_ananya / Member@123")
        self.stdout.write("  Vivek:      member_vivek / Member@123")
        self.stdout.write("")
        self.stdout.write(
            "Tip: use --reset to remove only these demo accounts and reseed."
        )

    # ============================================================
    # Generic helpers
    # ============================================================

    def set_if_exists(self, obj, field_name, value):
        if hasattr(obj, field_name):
            setattr(obj, field_name, value)

    def save_if_changed(self, obj, fields=None):
        obj.save(update_fields=fields) if fields else obj.save()

    # ============================================================
    # USERS
    # ============================================================

    def make_user(self, User, username, email, password, role=None,
                  first_name="", last_name=""):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email},
        )

        changed = []

        if hasattr(user, "email") and user.email != email:
            user.email = email
            changed.append("email")

        if hasattr(user, "first_name") and user.first_name != first_name:
            user.first_name = first_name
            changed.append("first_name")

        if hasattr(user, "last_name") and user.last_name != last_name:
            user.last_name = last_name
            changed.append("last_name")

        if role and hasattr(user, "role") and user.role != role:
            user.role = role
            changed.append("role")

        if hasattr(user, "is_active") and not user.is_active:
            user.is_active = True
            changed.append("is_active")

        if created or not user.check_password(password):
            user.set_password(password)
            changed.append("password")

        if changed:
            self.save_if_changed(user, changed)

        return user

    def seed_users(self, User):
        return {
            "admin": self.make_user(
                User,
                "admin_test",
                "admin.test@lms.com",
                "Admin@123",
                role="admin",
                first_name="Admin",
                last_name="User",
            ),
            "librarian": self.make_user(
                User,
                "librarian_test",
                "rahul.lib@lms.com",
                "Lib@12345",
                role="librarian",
                first_name="Rahul",
                last_name="Sharma",
            ),
            "librarian2": self.make_user(
                User,
                "librarian2_test",
                "priya.lib@lms.com",
                "Lib@12345",
                role="librarian",
                first_name="Priya",
                last_name="Verma",
            ),
            "arjun": self.make_user(
                User,
                "member_arjun",
                "arjun@lms.com",
                "Member@123",
                role="member",
                first_name="Arjun",
                last_name="Mehta",
            ),
            "neha": self.make_user(
                User,
                "member_neha",
                "neha@lms.com",
                "Member@123",
                role="member",
                first_name="Neha",
                last_name="Patel",
            ),
            "rohan": self.make_user(
                User,
                "member_rohan",
                "rohan@lms.com",
                "Member@123",
                role="member",
                first_name="Rohan",
                last_name="Singh",
            ),
            "ananya": self.make_user(
                User,
                "member_ananya",
                "ananya@lms.com",
                "Member@123",
                role="member",
                first_name="Ananya",
                last_name="Gupta",
            ),
            "vivek": self.make_user(
                User,
                "member_vivek",
                "vivek@lms.com",
                "Member@123",
                role="member",
                first_name="Vivek",
                last_name="Jain",
            ),
        }

    # ============================================================
    # CATEGORIES
    # ============================================================

    def seed_categories(self, Category):
        data = [
            ("Computer Science", "Computer science and systems."),
            ("Artificial Intelligence", "AI, neural networks and intelligent systems."),
            ("Machine Learning", "Machine learning theory and practice."),
            ("Data Science", "Data analysis, statistics and data tools."),
            ("Web Development", "Frontend and backend web technologies."),
            ("Database Systems", "Relational and distributed databases."),
            ("Mathematics", "Mathematics and applied mathematics."),
            ("Physics", "Physics and engineering physics."),
            ("Engineering", "Engineering fundamentals and applications."),
            ("Programming", "Programming languages and coding."),
            ("Cyber Security", "Security, privacy and secure systems."),
            ("Software Engineering", "Software design, testing and maintainability."),
        ]

        result = {}

        for name, description in data:
            obj, _ = Category.objects.get_or_create(
                name=name,
                defaults={"description": description},
            )

            if hasattr(obj, "description") and obj.description != description:
                obj.description = description
                obj.save(update_fields=["description"])

            result[name] = obj

        return result

    # ============================================================
    # AUTHORS
    # ============================================================

    def seed_authors(self, Author):
        data = {
            "Andrew S. Tanenbaum": "Computer networks and operating systems author.",
            "Martin Kleppmann": "Distributed systems and data-intensive applications.",
            "Thomas H. Cormen": "Algorithms and data structures author.",
            "Charles Severance": "Python and programming educator.",
            "Aurélien Géron": "Machine learning and deep learning practitioner.",
            "Ian Goodfellow": "Deep learning researcher and author.",
            "François Chollet": "Deep learning and Keras author.",
            "Wes McKinney": "Python data analysis and pandas creator.",
            "James Stewart": "Calculus textbook author.",
            "Gilbert Strang": "Linear algebra educator and author.",
            "E. Balagurusamy": "Programming and C author.",
            "Bjarne Stroustrup": "Creator of C++ and C++ author.",
            "Robert C. Martin": "Software engineering and clean-code author.",
            "Eric Matthes": "Python programming educator.",
            "Al Sweigart": "Python automation author.",
            "Abraham Silberschatz": "Database and operating systems author.",
            "Stuart Russell": "Artificial intelligence researcher and author.",
            "David Halliday": "Physics textbook author.",
        }

        result = {}

        for name, bio in data.items():
            obj, _ = Author.objects.get_or_create(
                name=name,
                defaults={"bio": bio},
            )

            if hasattr(obj, "bio") and obj.bio != bio:
                obj.bio = bio
                obj.save(update_fields=["bio"])

            result[name] = obj

        return result

    # ============================================================
    # BOOKS
    # ============================================================

    def seed_books(self, Book, authors, categories):
        data = [
            {
                "title": "Computer Networks",
                "author": "Andrew S. Tanenbaum",
                "category": "Computer Science",
                "isbn": "9780132126953",
                "published_date": "2021-03-01",
                "quantity": 5,
                "available": 4,
                "edition": "6th Edition",
                "edition_year": 2021,
                "description": (
                    "A comprehensive introduction to computer networking, "
                    "protocols, network architecture, wireless networks and security."
                ),
            },
            {
                "title": "Designing Data-Intensive Applications",
                "author": "Martin Kleppmann",
                "category": "Database Systems",
                "isbn": "9781449373320",
                "published_date": "2017-03-16",
                "quantity": 3,
                "available": 3,
                "edition": "1st Edition",
                "edition_year": 2017,
                "description": (
                    "A practical guide to reliable, scalable and maintainable "
                    "data-intensive applications, databases and distributed systems."
                ),
            },
            {
                "title": "Introduction to Algorithms",
                "author": "Thomas H. Cormen",
                "category": "Computer Science",
                "isbn": "9780262046305",
                "published_date": "2022-07-05",
                "quantity": 4,
                "available": 0,
                "edition": "4th Edition",
                "edition_year": 2022,
                "description": (
                    "Covers algorithms and data structures including sorting, "
                    "searching, graphs, dynamic programming and computational complexity."
                ),
            },
            {
                "title": "Python for Everybody",
                "author": "Charles Severance",
                "category": "Programming",
                "isbn": "9781530057062",
                "published_date": "2020-01-01",
                "quantity": 5,
                "available": 4,
                "edition": "3rd Edition",
                "edition_year": 2020,
                "description": (
                    "An introduction to Python programming covering variables, "
                    "functions, loops, data structures, files and web data."
                ),
            },
            {
                "title": "Hands-On Machine Learning",
                "author": "Aurélien Géron",
                "category": "Machine Learning",
                "isbn": "9781098125974",
                "published_date": "2022-10-01",
                "quantity": 4,
                "available": 4,
                "edition": "3rd Edition",
                "edition_year": 2022,
                "description": (
                    "A practical guide to machine learning using Python, "
                    "scikit-learn, Keras and TensorFlow. Covers supervised learning, "
                    "unsupervised learning, regression, classification, clustering, "
                    "feature engineering and model evaluation."
                ),
            },
            {
                "title": "Deep Learning",
                "author": "Ian Goodfellow",
                "category": "Artificial Intelligence",
                "isbn": "9780262035613",
                "published_date": "2016-11-18",
                "quantity": 2,
                "available": 1,
                "edition": "1st Edition",
                "edition_year": 2016,
                "description": (
                    "A comprehensive introduction to deep learning covering neural "
                    "networks, optimization, convolutional networks, sequence models "
                    "and representation learning."
                ),
            },
            {
                "title": "Deep Learning with Python",
                "author": "François Chollet",
                "category": "Artificial Intelligence",
                "isbn": "9781617296864",
                "published_date": "2021-10-01",
                "quantity": 3,
                "available": 2,
                "edition": "2nd Edition",
                "edition_year": 2021,
                "description": (
                    "Hands-on deep learning with Python, neural networks, computer "
                    "vision, sequence processing and practical model development."
                ),
            },
            {
                "title": "Python for Data Analysis",
                "author": "Wes McKinney",
                "category": "Data Science",
                "isbn": "9781098104030",
                "published_date": "2022-10-01",
                "quantity": 4,
                "available": 4,
                "edition": "3rd Edition",
                "edition_year": 2022,
                "description": (
                    "Practical data analysis with Python covering pandas, NumPy, "
                    "data cleaning, transformation, visualization and time series."
                ),
            },
            {
                "title": "Calculus",
                "author": "James Stewart",
                "category": "Mathematics",
                "isbn": "9781285741550",
                "published_date": "2015-01-01",
                "quantity": 3,
                "available": 2,
                "edition": "8th Edition",
                "edition_year": 2015,
                "description": (
                    "Calculus covering limits, derivatives, integrals, applications, "
                    "series and multivariable calculus."
                ),
            },
            {
                "title": "Introduction to Linear Algebra",
                "author": "Gilbert Strang",
                "category": "Mathematics",
                "isbn": "9780980232776",
                "published_date": "2016-01-01",
                "quantity": 3,
                "available": 3,
                "edition": "5th Edition",
                "edition_year": 2016,
                "description": (
                    "Linear algebra fundamentals including matrices, vector spaces, "
                    "eigenvalues, eigenvectors and applications."
                ),
            },
            {
                "title": "Programming in ANSI C",
                "author": "E. Balagurusamy",
                "category": "Programming",
                "isbn": "9789352605312",
                "published_date": "2019-01-01",
                "quantity": 5,
                "available": 5,
                "edition": "8th Edition",
                "edition_year": 2019,
                "description": (
                    "A beginner-friendly guide to C programming, functions, arrays, "
                    "pointers, structures, files and problem solving."
                ),
            },
            {
                "title": "The C++ Programming Language",
                "author": "Bjarne Stroustrup",
                "category": "Programming",
                "isbn": "9780321563842",
                "published_date": "2013-05-13",
                "quantity": 4,
                "available": 4,
                "edition": "4th Edition",
                "edition_year": 2013,
                "description": (
                    "Comprehensive reference and introduction to modern C++ "
                    "programming, object-oriented programming and the standard library."
                ),
            },
            {
                "title": "Clean Code",
                "author": "Robert C. Martin",
                "category": "Software Engineering",
                "isbn": "9780132350884",
                "published_date": "2008-08-01",
                "quantity": 3,
                "available": 3,
                "edition": "1st Edition",
                "edition_year": 2008,
                "description": (
                    "A practical guide to writing readable and maintainable software "
                    "with principles for functions, classes, error handling and refactoring."
                ),
            },
            {
                "title": "Python Crash Course",
                "author": "Eric Matthes",
                "category": "Programming",
                "isbn": "9781718502703",
                "published_date": "2023-01-01",
                "quantity": 5,
                "available": 5,
                "edition": "3rd Edition",
                "edition_year": 2023,
                "description": (
                    "A project-based introduction to Python programming, data structures, "
                    "testing, APIs and practical applications."
                ),
            },
            {
                "title": "Automate the Boring Stuff with Python",
                "author": "Al Sweigart",
                "category": "Programming",
                "isbn": "9781593279929",
                "published_date": "2022-01-01",
                "quantity": 4,
                "available": 4,
                "edition": "3rd Edition",
                "edition_year": 2022,
                "description": (
                    "Practical Python automation covering files, spreadsheets, web "
                    "scraping, email, PDFs and repetitive tasks."
                ),
            },
            {
                "title": "Database System Concepts",
                "author": "Abraham Silberschatz",
                "category": "Database Systems",
                "isbn": "9780078022159",
                "published_date": "2020-01-01",
                "quantity": 3,
                "available": 3,
                "edition": "7th Edition",
                "edition_year": 2020,
                "description": (
                    "Database concepts including relational models, SQL, transactions, "
                    "storage, indexing and database design."
                ),
            },
            {
                "title": "Operating System Concepts",
                "author": "Abraham Silberschatz",
                "category": "Computer Science",
                "isbn": "9781119800361",
                "published_date": "2018-01-01",
                "quantity": 4,
                "available": 4,
                "edition": "10th Edition",
                "edition_year": 2018,
                "description": (
                    "Operating system concepts covering processes, threads, memory, "
                    "storage, file systems and security."
                ),
            },
            {
                "title": "Artificial Intelligence: A Modern Approach",
                "author": "Stuart Russell",
                "category": "Artificial Intelligence",
                "isbn": "9780134610993",
                "published_date": "2021-04-01",
                "quantity": 3,
                "available": 3,
                "edition": "4th Edition",
                "edition_year": 2021,
                "description": (
                    "A broad introduction to artificial intelligence including agents, "
                    "search, reasoning, machine learning and decision making."
                ),
            },
            {
                "title": "Fundamentals of Physics",
                "author": "David Halliday",
                "category": "Physics",
                "isbn": "9781119454196",
                "published_date": "2021-01-01",
                "quantity": 4,
                "available": 4,
                "edition": "12th Edition",
                "edition_year": 2021,
                "description": (
                    "Fundamentals of physics covering mechanics, waves, thermodynamics, "
                    "electricity, optics and modern physics."
                ),
            },
        ]

        result = {}

        for item in data:
            defaults = {
                "author": authors[item["author"]],
                "category": categories[item["category"]],
                "published_date": parse_date(item["published_date"]),
                "quantity": item["quantity"],
                "available": item["available"],
                "edition": item["edition"],
                "edition_year": item["edition_year"],
                "description": item["description"],
            }

            book, _ = Book.objects.get_or_create(
                isbn=item["isbn"],
                defaults={
                    "title": item["title"],
                    **defaults,
                },
            )

            changed = []

            for field, value in {
                "title": item["title"],
                **defaults,
            }.items():
                if hasattr(book, field) and getattr(book, field) != value:
                    setattr(book, field, value)
                    changed.append(field)

            if changed:
                book.save(update_fields=changed)

            result[item["title"]] = book

        return result

    # ============================================================
    # ADDITIONAL DEMO BOOKS
    # ============================================================

    def seed_additional_books(
        self,
        Book,
        Category,
        Author,
        authors,
        existing_books,
    ):
        """Add 40 extra books across different existing categories.

        Categories are read from the database so the method works with the
        user's existing dummy-category set instead of assuming fixed names.
        The first 40 categories not already represented by the seed books are
        selected to maximize catalogue diversity.
        """

        represented_category_ids = {
            book.category_id
            for book in existing_books.values()
            if getattr(book, "category_id", None)
        }

        categories = list(
            Category.objects
            .exclude(id__in=represented_category_ids)
            .order_by("id")[:40]
        )

        if len(categories) < 40:
            raise ValueError(
                "At least 40 additional categories are required to add "
                "40 new books. Please make sure your dummy data contains "
                "at least 40 categories not already used by the base books."
            )

        author_list = list(
            Author.objects
            .order_by("id")
        )

        if not author_list:
            fallback_author = Author.objects.create(
                name="Library Demo Author",
                bio="Author created for LMS demonstration data.",
            )
            author_list = [fallback_author]

        title_templates = [
            "Foundations of {category}",
            "Introduction to {category}",
            "Modern {category}",
            "Practical Guide to {category}",
            "Essentials of {category}",
            "The {category} Handbook",
            "Principles of {category}",
            "Contemporary {category}",
        ]

        description_templates = [
            (
                "An accessible introduction to {category}, covering its "
                "key concepts, terminology, foundational methods and practical "
                "applications. Useful for students building a strong base and "
                "for quick revision before exams."
            ),
            (
                "A student-friendly guide to {category} that explains the "
                "major principles, common techniques, worked examples and "
                "real-world applications. Suitable for classroom study and "
                "self-learning."
            ),
            (
                "A practical reference for {category}, bringing together "
                "important ideas, methods, examples and problem-solving "
                "approaches. Designed for learners who want both conceptual "
                "understanding and practical exposure."
            ),
            (
                "A concise yet detailed handbook on {category}, covering "
                "essential terminology, core processes, important tools and "
                "typical applications. Helpful for learning, revision and "
                "project preparation."
            ),
            (
                "A broad study resource for {category}, moving from "
                "fundamental ideas to practical use cases. The material is "
                "structured to help beginners understand the subject while "
                "also supporting further exploration."
            ),
        ]

        result = {}

        for index, category in enumerate(categories, start=1):
            isbn = f"979899{category.pk:07d}"
            title_template = title_templates[(index - 1) % len(title_templates)]
            title = title_template.format(category=category.name)

            author = author_list[(index - 1) % len(author_list)]

            quantity = 2 + ((index - 1) % 5)
            edition_number = 1 + ((index - 1) % 4)
            edition_year = 2022 + ((index - 1) % 5)
            published_year = 2019 + ((index - 1) % 6)

            suffixes = {
                1: "1st Edition",
                2: "2nd Edition",
                3: "3rd Edition",
                4: "4th Edition",
            }

            defaults = {
                "title": title,
                "author": author,
                "category": category,
                "published_date": parse_date(
                    f"{published_year}-01-01"
                ),
                "quantity": quantity,
                "available": quantity,
                "edition": suffixes[edition_number],
                "edition_year": edition_year,
                "description": description_templates[
                    (index - 1) % len(description_templates)
                ].format(category=category.name) + (
                    f" The book is included as demo catalogue data so "
                    f"{category.name.lower()} can also be explored through "
                    "the LMS search and recommendation-style matching."
                ),
            }

            book, _ = Book.objects.get_or_create(
                isbn=isbn,
                defaults=defaults,
            )

            changed = []

            for field, value in defaults.items():
                if getattr(book, field, None) != value:
                    setattr(book, field, value)
                    changed.append(field)

            if changed:
                book.save(update_fields=changed)

            result[title] = book

        return result

    # ============================================================
    # ENSURE BOOK DESCRIPTIONS
    # ============================================================

    def ensure_book_descriptions(self, Book, books):
        """Fill any blank descriptions for books created by this seed."""

        fallback = (
            "A library catalogue resource covering "
            "{category} through key concepts, practical examples, "
            "important terminology and real-world applications. "
            "Useful for students, revision and general reference."
        )

        for book in books.values():
            description = (
                str(getattr(book, "description", "") or "").strip()
            )

            if description:
                continue

            category_name = (
                getattr(getattr(book, "category", None), "name", "")
                or "general library studies"
            )

            book.description = fallback.format(
                category=category_name
            )

            book.save(update_fields=["description"])

    # ============================================================
    # MEMBERS
    # ============================================================

    def seed_members(self, Member, users):
        data = [
            ("arjun", "Arjun Mehta", "arjun@lms.com", "9876500001"),
            ("neha", "Neha Patel", "neha@lms.com", "9876500002"),
            ("rohan", "Rohan Singh", "rohan@lms.com", "9876500003"),
            ("ananya", "Ananya Gupta", "ananya@lms.com", "9876500004"),
            ("vivek", "Vivek Jain", "vivek@lms.com", "9876500005"),
        ]

        result = {}

        for key, name, email, phone in data:
            member, created = Member.objects.get_or_create(
                user=users[key],
                defaults={
                    "name": name,
                    "email": email,
                    "phone": phone,
                    "address": "Indore, Madhya Pradesh",
                    "is_active": True,
                },
            )

            changed = []

            for field, value in {
                "name": name,
                "email": email,
                "phone": phone,
                "address": "Indore, Madhya Pradesh",
                "is_active": True,
            }.items():
                if hasattr(member, field) and getattr(member, field) != value:
                    setattr(member, field, value)
                    changed.append(field)

            if changed:
                member.save(update_fields=changed)

            result[key] = member

        return result

    # ============================================================
    # LOANS
    # ============================================================

    def upsert_loan(self, Loan, book, member, borrow_date, due_date,
                    status, return_date=None):
        borrow_date = parse_date(borrow_date)
        due_date = parse_date(due_date)
        return_date = (
            parse_date(return_date)
            if return_date
            else None
        )

        loan = Loan.objects.filter(
            book=book,
            member=member,
            borrow_date=borrow_date,
        ).first()

        if loan is None:
            loan = Loan.objects.create(
                book=book,
                member=member,
                borrow_date=borrow_date,
                due_date=due_date,
                return_date=return_date,
                status=status,
            )
        else:
            loan.due_date = due_date
            loan.return_date = return_date
            loan.status = status
            loan.save(
                update_fields=[
                    "due_date",
                    "return_date",
                    "status",
                ]
            )

        return loan

    def seed_loans(self, Loan, books, members):
        today = timezone.localdate()

        active_borrow = today - timedelta(days=8)
        active_due = active_borrow + timedelta(days=14)

        overdue_borrow = today - timedelta(days=35)
        overdue_due = overdue_borrow + timedelta(days=14)

        pending_return_borrow = today - timedelta(days=10)
        pending_return_due = pending_return_borrow + timedelta(days=14)

        returned_borrow = today - timedelta(days=60)
        returned_due = returned_borrow + timedelta(days=14)
        returned_date = returned_borrow + timedelta(days=10)

        lost_borrow = today - timedelta(days=45)
        lost_due = lost_borrow + timedelta(days=14)

        damaged_borrow = today - timedelta(days=50)
        damaged_due = damaged_borrow + timedelta(days=14)
        damaged_return = damaged_borrow + timedelta(days=18)

        result = {}

        result["arjun_python"] = self.upsert_loan(
            Loan,
            books["Python for Everybody"],
            members["arjun"],
            active_borrow.isoformat(),
            active_due.isoformat(),
            "borrowed",
        )

        result["neha_algorithms"] = self.upsert_loan(
            Loan,
            books["Introduction to Algorithms"],
            members["neha"],
            overdue_borrow.isoformat(),
            overdue_due.isoformat(),
            "overdue",
        )

        result["rohan_calculus"] = self.upsert_loan(
            Loan,
            books["Calculus"],
            members["rohan"],
            pending_return_borrow.isoformat(),
            pending_return_due.isoformat(),
            "return_requested",
        )

        result["ananya_clean"] = self.upsert_loan(
            Loan,
            books["Clean Code"],
            members["ananya"],
            returned_borrow.isoformat(),
            returned_due.isoformat(),
            "returned",
            returned_date.isoformat(),
        )

        result["vivek_deep"] = self.upsert_loan(
            Loan,
            books["Deep Learning"],
            members["vivek"],
            lost_borrow.isoformat(),
            lost_due.isoformat(),
            "lost",
        )

        result["arjun_ml"] = self.upsert_loan(
            Loan,
            books["Hands-On Machine Learning"],
            members["arjun"],
            damaged_borrow.isoformat(),
            damaged_due.isoformat(),
            "returned",
            damaged_return.isoformat(),
        )

        return result

    # ============================================================
    # BOOK REQUESTS
    # ============================================================

    def upsert_book_request(self, BookRequest, member, book, status):
        request = (
            BookRequest.objects
            .filter(member=member, book=book)
            .order_by("-id")
            .first()
        )

        if request is None:
            request = BookRequest.objects.create(
                member=member,
                book=book,
                status=status,
            )
        else:
            request.status = status
            request.save(update_fields=["status"])

        return request

    def seed_book_requests(self, BookRequest, books, members):
        self.upsert_book_request(
            BookRequest,
            members["arjun"],
            books["Python for Everybody"],
            "approved",
        )

        self.upsert_book_request(
            BookRequest,
            members["neha"],
            books["Introduction to Algorithms"],
            "pending",
        )

        self.upsert_book_request(
            BookRequest,
            members["rohan"],
            books["Deep Learning"],
            "rejected",
        )

        self.upsert_book_request(
            BookRequest,
            members["ananya"],
            books["Calculus"],
            "pending",
        )

    # ============================================================
    # RESERVATIONS / WAITLIST
    # ============================================================

    def upsert_reservation(self, Reservation, book, member, status,
                           queue_position):
        reservation = Reservation.objects.filter(
            book=book,
            member=member,
        ).order_by("-id").first()

        if reservation is None:
            reservation = Reservation.objects.create(
                book=book,
                member=member,
                status=status,
                queue_position=queue_position,
            )
        else:
            reservation.status = status
            reservation.queue_position = queue_position
            reservation.save(
                update_fields=[
                    "status",
                    "queue_position",
                ]
            )

        return reservation

    def seed_reservations(self, Reservation, books, members):
        self.upsert_reservation(
            Reservation,
            books["Introduction to Algorithms"],
            members["neha"],
            "waiting",
            1,
        )

        self.upsert_reservation(
            Reservation,
            books["Introduction to Algorithms"],
            members["ananya"],
            "waiting",
            2,
        )

        self.upsert_reservation(
            Reservation,
            books["Deep Learning"],
            members["rohan"],
            "waiting",
            1,
        )

    # ============================================================
    # FEES
    # ============================================================

    def upsert_fee(self, Fee, loan, fee_type, amount, status, description):
        fee = Fee.objects.filter(
            loan=loan,
            fee_type=fee_type,
        ).order_by("-id").first()

        if fee is None:
            fee = Fee.objects.create(
                loan=loan,
                fee_type=fee_type,
                amount=Decimal(str(amount)),
                status=status,
                description=description,
            )
        else:
            fee.amount = Decimal(str(amount))
            fee.status = status
            fee.description = description

            if status == "paid" and fee.paid_at is None:
                fee.paid_at = timezone.now()

            fee.save(
                update_fields=[
                    "amount",
                    "status",
                    "description",
                    "paid_at",
                ]
            )

        return fee

    def seed_fees(self, Fee, loans):
        fees = {}

        fees["neha_late"] = self.upsert_fee(
            Fee,
            loans["neha_algorithms"],
            "late",
            "100.00",
            "pending",
            "Late return fee for overdue Introduction to Algorithms.",
        )

        fees["vivek_lost"] = self.upsert_fee(
            Fee,
            loans["vivek_deep"],
            "lost",
            "750.00",
            "pending",
            "Lost book fee for Deep Learning.",
        )

        fees["arjun_damage"] = self.upsert_fee(
            Fee,
            loans["arjun_ml"],
            "damage",
            "150.00",
            "paid",
            "Damage fee for cover and page damage.",
        )

        return fees

    # ============================================================
    # PAYMENTS
    # ============================================================

    def seed_payment(self, Payment, fee, status, method,
                     transaction_id):
        payment = Payment.objects.filter(
            fee=fee,
        ).order_by("-id").first()

        if payment is None:
            payment = Payment.objects.create(
                fee=fee,
                amount=fee.amount,
                status=status,
                payment_method=method,
                transaction_id=transaction_id,
                gateway_order_id=f"DEMO_ORDER_{uuid4().hex[:20]}",
                gateway_payment_id=(
                    f"DEMO_PAYMENT_{uuid4().hex[:20]}"
                    if status == "successful"
                    else None
                ),
                paid_at=timezone.now()
                if status == "successful"
                else None,
            )
        else:
            payment.amount = fee.amount
            payment.status = status
            payment.payment_method = method
            payment.transaction_id = transaction_id

            if status == "successful":
                payment.paid_at = timezone.now()
                if not payment.gateway_payment_id:
                    payment.gateway_payment_id = (
                        f"DEMO_PAYMENT_{uuid4().hex[:20]}"
                    )

            payment.save()

        return payment

    def seed_payments(self, Payment, fees):
        self.seed_payment(
            Payment,
            fees["arjun_damage"],
            "successful",
            "upi",
            "DEMO_TXN_ARJUN_DAMAGE",
        )

        # A failed payment leaves the fee pending, which is useful
        # for testing the payment UI.
        failed_payment, _ = Payment.objects.get_or_create(
            fee=fees["neha_late"],
            transaction_id="DEMO_TXN_NEHA_FAILED",
            defaults={
                "amount": fees["neha_late"].amount,
                "status": "failed",
                "payment_method": "card",
                "gateway_order_id": f"DEMO_ORDER_{uuid4().hex[:20]}",
            },
        )

        if failed_payment.status != "failed":
            failed_payment.status = "failed"
            failed_payment.save(update_fields=["status"])

    # ============================================================
    # RETURN REQUESTS
    # ============================================================

    def upsert_return_request(
        self,
        ReturnRequest,
        loan,
        status,
        condition,
        description="",
    ):
        request = ReturnRequest.objects.filter(
            loan=loan
        ).first()

        if request is None:
            request = ReturnRequest.objects.create(
                loan=loan,
                status=status,
                condition=condition,
                damage_description=description,
            )
        else:
            request.status = status
            request.condition = condition
            request.damage_description = description

            if status == "approved":
                request.processed_at = timezone.now()

            request.save(
                update_fields=[
                    "status",
                    "condition",
                    "damage_description",
                    "processed_at",
                ]
            )

        return request

    def seed_return_requests(self, ReturnRequest, loans):
        # Pending normal return
        self.upsert_return_request(
            ReturnRequest,
            loans["rohan_calculus"],
            "pending",
            "normal",
        )

        # Approved lost return
        self.upsert_return_request(
            ReturnRequest,
            loans["vivek_deep"],
            "approved",
            "lost",
            "Book reported lost by the member.",
        )

        # Approved damaged return
        self.upsert_return_request(
            ReturnRequest,
            loans["arjun_ml"],
            "approved",
            "damaged",
            "Cover and several pages damaged.",
        )

    # ============================================================
    # NOTIFICATIONS
    # ============================================================

    def seed_notification(
        self,
        Notification,
        user,
        notif_type,
        title,
        message,
        is_read=False,
    ):
        Notification.objects.get_or_create(
            user=user,
            notif_type=notif_type,
            title=title,
            defaults={
                "message": message,
                "is_read": is_read,
            },
        )

    def seed_notifications(self, Notification, users):
        self.seed_notification(
            Notification,
            users["arjun"],
            "book_request_approved",
            "Borrowing request approved",
            "Your borrowing request for Python for Everybody was approved.",
        )

        self.seed_notification(
            Notification,
            users["neha"],
            "loan_overdue",
            "Book overdue",
            "Your copy of Introduction to Algorithms is overdue.",
        )

        self.seed_notification(
            Notification,
            users["rohan"],
            "return_requested",
            "Return request submitted",
            "Your return request for Calculus is waiting for librarian processing.",
        )

        self.seed_notification(
            Notification,
            users["vivek"],
            "fee_generated",
            "Lost-book fee generated",
            "A lost-book fee of ₹750 has been generated for Deep Learning.",
        )

        self.seed_notification(
            Notification,
            users["arjun"],
            "payment_successful",
            "Payment successful",
            "Your payment of ₹150 was successfully recorded.",
            is_read=True,
        )

        self.seed_notification(
            Notification,
            users["ananya"],
            "reservation_available",
            "Reserved book available",
            "A reserved book is now available for borrowing.",
        )

    # ============================================================
    # RECENT SEARCHES
    # ============================================================

    def seed_recent_searches(self, RecentSearch, users):
        searches = {
            "arjun": [
                "machine learning",
                "python programming",
                "data analysis",
            ],
            "neha": [
                "algorithms",
                "computer science",
                "data structures",
            ],
            "rohan": [
                "calculus",
                "physics",
            ],
            "ananya": [
                "software engineering",
                "clean code",
            ],
            "vivek": [
                "deep learning",
                "artificial intelligence",
            ],
        }

        for key, queries in searches.items():
            for query in queries:
                RecentSearch.objects.update_or_create(
                    user=users[key],
                    query=query,
                )

    # ============================================================
    # BOOK AVAILABILITY
    # ============================================================

    def finalize_book_availability(self, books):
        # These values intentionally create different UI states.
        desired = {
            "Computer Networks": (5, 5),
            "Designing Data-Intensive Applications": (3, 3),
            "Introduction to Algorithms": (4, 0),
            "Python for Everybody": (5, 4),
            "Hands-On Machine Learning": (4, 4),
            "Deep Learning": (2, 1),
            "Deep Learning with Python": (3, 2),
            "Python for Data Analysis": (4, 4),
            "Calculus": (3, 2),
            "Introduction to Linear Algebra": (3, 3),
            "Programming in ANSI C": (5, 5),
            "The C++ Programming Language": (4, 4),
            "Clean Code": (3, 3),
            "Python Crash Course": (5, 5),
            "Automate the Boring Stuff with Python": (4, 4),
            "Database System Concepts": (3, 3),
            "Operating System Concepts": (4, 4),
            "Artificial Intelligence: A Modern Approach": (3, 3),
            "Fundamentals of Physics": (4, 4),
        }

        for title, values in desired.items():
            book = books[title]
            quantity, available = values

            changed = []

            if book.quantity != quantity:
                book.quantity = quantity
                changed.append("quantity")

            if book.available != available:
                book.available = available
                changed.append("available")

            if changed:
                book.save(update_fields=changed)
