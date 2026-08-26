import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoutes from "./components/RoleProtectedRoutes";

import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import Books from "./pages/books";
import Members from "./pages/members";
import Loans from "./pages/loans";
import Login from "./pages/login";
import MyLoans from "./pages/myloans";
import Unauthorised from "./pages/unauthorised";
import Signup from "./pages/signup";
import Admin from "./pages/admin";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";


function App() {
    return (
        <BrowserRouter>

            <Navbar />

            <Routes>

                {/* ========================= */}
                {/* Public Routes */}
                {/* ========================= */}

                <Route
                    path="/"
                    element={<Home />}
                />

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/signup"
                    element={<Signup />}
                />

                <Route
                    path="/forgot-password"
                    element={<ForgotPassword />}
                />

                <Route
                    path="/reset-password/:uidb64/:token"
                    element={<ResetPassword />}
                />

                <Route
                    path="/unauthorized"
                    element={<Unauthorised />}
                />


                {/* ========================= */}
                {/* All Authenticated Users */}
                {/* ========================= */}

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/books"
                    element={
                        <ProtectedRoute>
                            <Books />
                        </ProtectedRoute>
                    }
                />


                {/* ========================= */}
                {/* Librarian + Admin */}
                {/* ========================= */}

                <Route
                    path="/members"
                    element={
                        <RoleProtectedRoutes
                            allowedRoles={[
                                "librarian",
                                "admin",
                            ]}
                        >
                            <Members />
                        </RoleProtectedRoutes>
                    }
                />

                <Route
                    path="/loans"
                    element={
                        <RoleProtectedRoutes
                            allowedRoles={[
                                "librarian",
                                "admin",
                            ]}
                        >
                            <Loans />
                        </RoleProtectedRoutes>
                    }
                />


                {/* ========================= */}
                {/* Member Only */}
                {/* ========================= */}

                <Route
                    path="/my-loans"
                    element={
                        <RoleProtectedRoutes
                            allowedRoles={["member"]}
                        >
                            <MyLoans />
                        </RoleProtectedRoutes>
                    }
                />


                {/* ========================= */}
                {/* Admin */}
                {/* ========================= */}

                <Route
                    path="/admin"
                    element={
                        <RoleProtectedRoutes
                            allowedRoles={["admin"]}
                        >
                            <Admin />
                        </RoleProtectedRoutes>
                    }
                />

                <Route
                    path="/change-password"
                    element={
                        <ProtectedRoute>
                            <ChangePassword />
                        </ProtectedRoute>
                    }
                />

            </Routes>

        </BrowserRouter>
    );
}

export default App;