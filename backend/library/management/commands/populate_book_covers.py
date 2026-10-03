"""Populate covers for every Book in the LMS catalogue.

Real covers are fetched from Open Library when a matching ISBN/title is found.
Books without a public cover get a clean SVG catalogue cover generated locally.

Run once from the Django backend:
    python manage.py populate_book_covers

Use --force to replace existing covers.
"""

from io import BytesIO
from pathlib import Path
from urllib.parse import quote

import requests
from django.apps import apps
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils.text import slugify


OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json"
OPEN_LIBRARY_COVER_ISBN = "https://covers.openlibrary.org/isbn/{isbn}-L.jpg"
OPEN_LIBRARY_COVER_ID = "https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"


class Command(BaseCommand):
    help = "Download public book covers where available and create fallback catalogue covers for every book."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Replace covers that already exist.",
        )

    def handle(self, *args, **options):
        force = options["force"]
        Book = self.find_model("Book")

        books = Book.objects.select_related("author", "category").order_by("id")
        total = books.count()

        if total == 0:
            self.stdout.write(self.style.WARNING("No books found in the catalogue."))
            return

        session = requests.Session()
        session.headers.update(
            {
                "User-Agent": "LibraryManagementSystemDemo/1.0",
                "Accept": "image/jpeg,image/png,image/*;q=0.8,*/*;q=0.5",
            }
        )

        downloaded = 0
        generated = 0
        skipped = 0
        failed = 0

        self.stdout.write(f"Processing {total} books...")

        for index, book in enumerate(books, start=1):
            self.stdout.write(
                f"[{index}/{total}] {book.title}",
                ending="",
            )

            if book.cover and not force:
                skipped += 1
                self.stdout.write(" -> already has a cover")
                continue

            try:
                image_bytes, extension, source = self.fetch_real_cover(session, book)

                if image_bytes:
                    filename = self.cover_filename(book, extension)
                    book.cover.save(filename, ContentFile(image_bytes), save=False)
                    book.save(update_fields=["cover"])
                    downloaded += 1
                    self.stdout.write(f" -> downloaded ({source})")
                    continue

                svg = self.build_fallback_cover(book)
                filename = self.cover_filename(book, "svg")
                book.cover.save(filename, ContentFile(svg.encode("utf-8")), save=False)
                book.save(update_fields=["cover"])
                generated += 1
                self.stdout.write(" -> generated catalogue cover")

            except Exception as exc:
                failed += 1
                self.stdout.write(self.style.ERROR(f" -> failed: {exc}"))

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Cover population complete."))
        self.stdout.write(f"Real/downloaded covers : {downloaded}")
        self.stdout.write(f"Generated fallback covers: {generated}")
        self.stdout.write(f"Skipped existing covers   : {skipped}")
        self.stdout.write(f"Failed                    : {failed}")

    @staticmethod
    def find_model(name):
        matches = [
            model
            for model in apps.get_models()
            if model.__name__.lower() == name.lower()
        ]

        if not matches:
            raise LookupError(f"Could not find model '{name}'.")

        if len(matches) > 1:
            raise LookupError(
                "Multiple models named "
                f"'{name}' were found: "
                + ", ".join(
                    f"{m._meta.app_label}.{m.__name__}" for m in matches
                )
            )

        return matches[0]

    @staticmethod
    def cover_filename(book, extension):
        title_slug = slugify(book.title) or f"book-{book.pk}"
        return f"book_covers/{title_slug}-{book.pk}.{extension}"

    def fetch_real_cover(self, session, book):
        isbn = str(getattr(book, "isbn", "") or "").strip()

        if isbn:
            url = OPEN_LIBRARY_COVER_ISBN.format(isbn=quote(isbn))
            response = session.get(url, timeout=12)

            if response.ok and response.content and not self.looks_like_missing_cover(response):
                return response.content, "jpg", "ISBN"

        title = str(getattr(book, "title", "") or "").strip()
        author = str(getattr(getattr(book, "author", None), "name", "") or "").strip()

        if not title:
            return None, None, None

        params = {
            "title": title,
            "author": author,
            "limit": 5,
            "fields": "title,author_name,cover_i,isbn",
        }
        search = session.get(OPEN_LIBRARY_SEARCH, params=params, timeout=12)
        search.raise_for_status()
        data = search.json()

        docs = data.get("docs") or []

        # Prefer an exact-ish title match with a cover id.
        normalized_title = title.casefold().strip()
        candidate = None
        for doc in docs:
            doc_title = str(doc.get("title") or "").casefold().strip()
            if doc.get("cover_i") and doc_title == normalized_title:
                candidate = doc
                break

        if candidate is None:
            candidate = next(
                (doc for doc in docs if doc.get("cover_i")),
                None,
            )

        if not candidate or not candidate.get("cover_i"):
            return None, None, None

        cover_url = OPEN_LIBRARY_COVER_ID.format(
            cover_id=candidate["cover_i"]
        )
        response = session.get(cover_url, timeout=12)

        if response.ok and response.content and not self.looks_like_missing_cover(response):
            return response.content, "jpg", "Open Library search"

        return None, None, None

    @staticmethod
    def looks_like_missing_cover(response):
        """Open Library can return a small placeholder image for missing covers."""
        content_type = str(response.headers.get("Content-Type", "")).lower()
        if "image" not in content_type:
            return True
        return len(response.content) < 5000

    @staticmethod
    def escape_xml(value):
        return (
            str(value)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&apos;")
        )

    def build_fallback_cover(self, book):
        title = self.escape_xml(book.title)
        author = self.escape_xml(
            getattr(getattr(book, "author", None), "name", "Library Collection")
        )
        category = self.escape_xml(
            getattr(getattr(book, "category", None), "name", "Library")
        )

        # SVG intentionally avoids external assets, fonts and network requests.
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1350" viewBox="0 0 900 1350">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#172554"/>
      <stop offset="55%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
  </defs>

  <rect width="900" height="1350" fill="url(#bg)"/>
  <circle cx="720" cy="170" r="150" fill="#ffffff" opacity="0.06"/>
  <circle cx="140" cy="1180" r="220" fill="#ffffff" opacity="0.04"/>
  <rect x="90" y="110" width="720" height="5" rx="3" fill="url(#accent)"/>

  <text x="90" y="195" fill="#bae6fd" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" letter-spacing="5">LIBRARY COLLECTION</text>

  <text x="90" y="490" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700">
    <tspan x="90" dy="0">{title[:28]}</tspan>
    <tspan x="90" dy="82">{title[28:56]}</tspan>
    <tspan x="90" dy="82">{title[56:84]}</tspan>
  </text>

  <rect x="90" y="780" width="170" height="54" rx="27" fill="#0f172a" opacity="0.65"/>
  <text x="175" y="816" text-anchor="middle" fill="#e0f2fe" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">{category[:18]}</text>

  <text x="90" y="1040" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="34">{author[:36]}</text>
  <text x="90" y="1120" fill="#94a3b8" font-family="Arial, Helvetica, sans-serif" font-size="24">Library Management System</text>
  <rect x="90" y="1180" width="720" height="3" fill="#475569"/>
  <text x="90" y="1240" fill="#94a3b8" font-family="Arial, Helvetica, sans-serif" font-size="22">Demo catalogue cover</text>
</svg>'''
        return svg
