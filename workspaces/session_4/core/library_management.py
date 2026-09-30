"""
Library Management System
Implementation of library book catalog, borrowing, returning, and title searching.
"""

class LibraryManagementApp:
    def __init__(self):
        self.books = {}

    def add_book(self, isbn: str, title: str, author: str) -> dict:
        if not isbn or not str(isbn).strip():
            raise ValueError("ISBN cannot be empty.")
        if not title or not str(title).strip():
            raise ValueError("Book title cannot be empty.")
        b_isbn = str(isbn).strip()
        if b_isbn in self.books:
            raise ValueError(f"Book with ISBN '{b_isbn}' already exists.")

        book = {
            "isbn": b_isbn,
            "title": str(title).strip(),
            "author": str(author).strip() if author else "Unknown",
            "is_borrowed": False
        }
        self.books[b_isbn] = book
        return book

    def borrow_book(self, isbn: str) -> dict:
        b_isbn = str(isbn).strip()
        if b_isbn not in self.books:
            raise ValueError(f"Book with ISBN '{b_isbn}' not found.")
        if self.books[b_isbn]["is_borrowed"]:
            raise ValueError(f"Book '{self.books[b_isbn]['title']}' is already borrowed.")

        self.books[b_isbn]["is_borrowed"] = True
        return self.books[b_isbn]

    def return_book(self, isbn: str) -> dict:
        b_isbn = str(isbn).strip()
        if b_isbn not in self.books:
            raise ValueError(f"Book with ISBN '{b_isbn}' not found.")
        if not self.books[b_isbn]["is_borrowed"]:
            raise ValueError(f"Book '{self.books[b_isbn]['title']}' was not borrowed.")

        self.books[b_isbn]["is_borrowed"] = False
        return self.books[b_isbn]

    def search_by_title(self, query: str) -> list[dict]:
        if not query or not str(query).strip():
            raise ValueError("Search query cannot be empty.")
        q = str(query).strip().lower()
        return [b for b in self.books.values() if q in b["title"].lower()]
