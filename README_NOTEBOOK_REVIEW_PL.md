# Notatnik autora — oprawa książki

Stan: 19 listopada 2026. Poprawiona oprawa na podstawie referencji Mariusza.

Dyskretny napis „Dotknij książki” / „Touch the book” pulsuje na istniejącym zdjęciu głównym. Cała książka na fotografii pozostaje dotykalnym obszarem, bez dużej ramki przycisku. Preferencja ograniczenia ruchu wyłącza pulsowanie i animacje.

Czytnik ma ciemną oprawę, widoczny grzbiet, warstwy papieru, zakrzywione brzegi kremowej kartki oraz subtelny ruch otwierania i przewracania. Nagłówek, języki, małe zakładki i nawigacja są częścią kartki. Widok dopasowuje się do rzeczywiście widocznej wysokości przeglądarki. Duże ekrany pokazują otwartą książkę z kartą tytułową po lewej.

## Treść i obsługa

- Zachowano wszystkie 60 zatwierdzonych cytatów i 3 refleksje Mariusza, bez zmiany danych, kolejności i autorów. Oba akapity refleksji Człowiek pozostają na jednej kartce.
- Zwykły układ ma 65 stron. Jeżeli cały wstęp nie mieści się przy czytelnym rozmiarze tekstu, zostaje podzielony na dwie kartki, bez skracania treści. W tym wariancie czytnik ma 66 stron.
- Tekst dopasowuje się natychmiast przy zmianie kartki. Na sprawdzonym ekranie 320 × 568 cytaty, podpisy i przyciski są widoczne jednocześnie. Powiększony tekst i wyjątkowo niski ekran zachowują możliwość przewinięcia, zamiast obcinać treść.
- Pełne źródło i kontekst otwierają się w osobnym oknie. Nagłówek Notatnik autora prowadzi do początku. Działają poprzednia/następna, klawisze lewo/prawo, Home/End, Escape, historia przeglądarki oraz powrót fokusu.
- PL/EN zachowują identyfikator kartki. Kopiowanie obejmuje tekst, autora, źródło, rok, oznaczenie przekładu i adres źródła. Awaryjne ręczne kopiowanie ma osobne okno.
- Grafika PNG 1080 × 1350 px nadal ma prawidłowego autora, źródło i oddzielny podpis kolekcji. Oznaczenia przekładów i redakcyjnych wersji EN są zachowane.
- Pełna kolekcja jest również dostępna jako zwykły HTML pod /notebook/ i /pl/notebook/.

## Weryfikacja

Przeglądarką sprawdzono wszystkie 63 kartki z cytatami i refleksjami w PL i EN, wstęp, jego kontynuację i zakończenie. Kontrola obejmowała rzeczywistą wysokość treści względem dostępnej kartki przy 320 × 568, układ 390 × 720 oraz widok komputerowy. Sprawdzono również źródło w osobnym oknie, podgląd grafiki, języki i nawigację. Były to kontrole układów przeglądarki, nie testy na fizycznych telefonach.

```bash
python scripts/build_notebook_pages.py
npm test
npm run build:preview
```

Dane kolekcji są w `data/notebook.json`. Po ich zmianie należy odtworzyć zwykłe strony powyższym generatorem. Zmiany oprawy nie modyfikują esejów, portretu ani workera ciekawości.
