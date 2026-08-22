import { useEffect, useState } from "react";
import api from "../services/api";

function Books() {
    const [books, setBooks] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const response = await api.get("books/");

                console.log("API RESPONSE:", response.data);

                const bookList = Array.isArray(response.data.results)
                    ? response.data.results
                    : [];

                setBooks(bookList);
            } catch (error) {
                console.error(
                    "BOOK API ERROR:",
                    error.response?.data || error.message
                );
                    setError(
                    JSON.stringify(
                    error.response?.data || error.message,
        null,
        2
    )
);
            }
        };

        fetchBooks();
    }, []);

    return (
        <div>
            <h1>📚 Books</h1>

            {error && <p>{error}</p>}

            {books.length === 0 && !error && (
                <p>No books found.</p>
            )}

            {books.map((book) => (
                <div key={book.id}>
                    <h2>{book.title}</h2>
                    <p>Author: {book.author_name}</p>
                    <p>ISBN: {book.isbn}</p>
                    <p>Quantity: {book.quantity}</p>
                    <p>Available: {book.available}</p>
                    <hr />
                </div>
            ))}
        </div>
    );
}

export default Books;