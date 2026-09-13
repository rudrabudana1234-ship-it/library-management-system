import React from "react";
import {
    BrowserRouter,
    Routes,
    Route,
} from "react-router-dom";

import Navbar from "./components/navbar";

import Home from "./pages/home";
import Login from "./pages/login";
import Signup from "./pages/signup";
import Dashboard from "./pages/dashboard";

import Books from "./pages/books";
import Members from "./pages/members";
import Loans from "./pages/loans";
import MyLoans from "./pages/myloans";

import Authors from "./pages/authors";

import ForgotPassword from "./pages/forgotpassword";
import ResetPassword from "./pages/resetpassword";
import ChangePassword from "./pages/changepassword";

import Admin from "./pages/admin";

function App() {
    return (
        <BrowserRouter>

            <Navbar />

            <Routes>

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
                    path="/dashboard"
                    element={<Dashboard />}
                />

                <Route
                    path="/books"
                    element={<Books />}
                />

                <Route
                    path="/members"
                    element={<Members />}
                />

                <Route
                    path="/authors"
                    element={<Authors />}
                />

                <Route
                    path="/loans"
                    element={<Loans />}
                />

                <Route
                    path="/my-loans"
                    element={<MyLoans />}
                />

                <Route
                    path="/forgot-password"
                    element={<ForgotPassword />}
                />

                <Route
                    path="/reset-password/:uid/:token"
                    element={<ResetPassword />}
                />

                <Route
                    path="/change-password"
                    element={<ChangePassword />}
                />

                <Route
                    path="/admin"
                    element={<Admin />}
                />

            </Routes>

        </BrowserRouter>
    );
}

export default App;