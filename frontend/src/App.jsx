import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";

function Dashboard() {
    return <h1>Dashboard</h1>;
}

function Books() {
    return <h1>Books</h1>;
}

function Authors() {
    return <h1>Authors</h1>;
}

function Members() {
    return <h1>Members</h1>;
}

function Loans() {
    return <h1>Loans</h1>;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route path="/" element={<Navigate to="/dashboard" />} />

                <Route path="/dashboard" element={<Dashboard />} />

                <Route path="/books" element={<Books />} />

                <Route path="/authors" element={<Authors />} />

                <Route path="/members" element={<Members />} />

                <Route path="/loans" element={<Loans />} />

            </Routes>
            <Navbar />
        </BrowserRouter>
    );
}

export default App;