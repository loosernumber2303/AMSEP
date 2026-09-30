import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import pytest
from core.library_management import LibraryManagementApp

def test_add_and_search_books():
    lib = LibraryManagementApp()
    lib.add_book("978-01", "Design Patterns", "Gang of Four")
    lib.add_book("978-02", "Refactoring", "Martin Fowler")

    matches = lib.search_by_title("Patterns")
    assert len(matches) == 1
    assert matches[0]["title"] == "Design Patterns"

    with pytest.raises(ValueError):
        lib.add_book("", "Invalid ISBN", "Author")
    with pytest.raises(ValueError):
        lib.add_book("978-01", "Duplicate Book", "Author")

def test_borrow_and_return_cycle():
    lib = LibraryManagementApp()
    lib.add_book("978-01", "Clean Architecture", "Robert Martin")

    borrowed = lib.borrow_book("978-01")
    assert borrowed["is_borrowed"] is True

    # Cannot borrow already borrowed book
    with pytest.raises(ValueError):
        lib.borrow_book("978-01")

    returned = lib.return_book("978-01")
    assert returned["is_borrowed"] is False

    # Cannot return book that is not borrowed
    with pytest.raises(ValueError):
        lib.return_book("978-01")

def test_missing_book_errors():
    lib = LibraryManagementApp()
    with pytest.raises(ValueError):
        lib.borrow_book("DOES_NOT_EXIST")
    with pytest.raises(ValueError):
        lib.return_book("DOES_NOT_EXIST")
    with pytest.raises(ValueError):
        lib.search_by_title("")
