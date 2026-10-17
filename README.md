# 📚 Library Management System (LMS)

A full-stack **Library Management System** built using Django REST Framework and React. It simplifies library operations by providing role-based access for members, librarians, and administrators, with features for book management, borrowing, returns, reservations, fee tracking, and analytics.

## 🚀 Features

### 🔐 Authentication & Authorization
- JWT-based authentication using SimpleJWT.
- User registration and login.
- Password reset and password change functionality.
- Role-based access control for Members, Librarians, and Admins.
- Librarian registration approval and rejection workflow.
- Protected frontend routes and permission checks.

### 📖 Book Management
- Manage books, authors, categories, and book editions.
- Search and filter books.
- Search suggestions and recent-search tracking.
- Book descriptions and cover images.
- Pagination for browsing the catalogue.
- Availability tracking for book copies.

### 📋 Borrowing & Loan Management
- Members can submit borrowing requests.
- Librarians can approve or reject requests.
- Automatic loan creation after approval.
- Loan tracking with due dates and return status.
- Return requests and overdue-book management.
- Database transactions to maintain consistent book-copy counts.
- Standard loan period of 14 days.

### ⏳ Reservations & Waitlist
- Reservation support for unavailable books.
- Waitlist management.
- Availability tracking for reserved books.

### 💰 Fee & Payment Management
- Late-return, damaged-book, and lost-book fee tracking.
- Simple demo payment workflow.
- Payment history.
- Prevention of duplicate payment processing.
- Fee status and payment timestamp tracking.

**Note:** The payment functionality is a demonstration feature. No real payment gateway is integrated.

### 📊 Dashboards & Analytics
- Member dashboard.
- Librarian dashboard.
- Library analytics and statistics.
- Loan and book-availability information.
- Notifications and return-request workflows.

### 👥 Role-Based System

**Member**
- Browse, search, and filter books.
- Request books and reserve unavailable books.
- View current and previous loans.
- Track due dates and return requests.
- View fees and payment history.

**Librarian**
- Manage books, authors, and categories.
- Process borrowing requests.
- Issue and manage loans.
- Handle returns and return requests.
- Track overdue books.
- Manage applicable fees and payment verification.

**Admin**
- Manage users and librarian accounts.
- Approve or reject librarian requests.
- Oversee role-based access and permissions.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Python | Backend programming |
| Django | Backend framework |
| Django REST Framework | REST API development |
| SimpleJWT | JWT authentication |
| SQLite | Database |
| React | Frontend development |
| JavaScript | Frontend logic |
| Vite | Frontend development server |
| Bootstrap | UI styling |
| Git & GitHub | Version control |

## 📏 Core Business Rules
- Borrowing requests must be approved before a loan is created.
- Approving a borrowing request updates the available-copy count.
- Unavailable books can be handled through the reservation/waitlist workflow.
- The standard borrowing period is 14 days.
- Returning a book updates its availability according to its condition.
- Lost books are marked as lost and are not added back to available copies.
- Fees apply to late, damaged, or lost books.
- Borrowing a book does not automatically incur a fee.
- Payment functionality simulates payment completion and does not process real money.

## 🔒 Security & Configuration

- Keep secret keys, credentials, and sensitive configuration out of version control.
- Use environment variables for sensitive settings where supported.
- Verify role permissions for all protected endpoints.
- SQLite is intended for the current local development and demonstration setup.
- The project is designed as a college/demo project and is not presented as a production-hardened deployment.

## 🔮 Future Improvements

Potential improvements include:

- Expanded automated testing.
- API documentation.
- Additional accessibility improvements.
- Enhanced validation and error handling.
- Further improvements to reporting and library workflows.

## 👨‍💻 Author

Rudra Budana

Computer Science Student | Python | Django | REST APIs | Machine Learning
