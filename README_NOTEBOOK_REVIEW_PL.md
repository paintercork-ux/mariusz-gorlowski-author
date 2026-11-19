# Zanim przyszłość nas minie — wersja do oceny

Stan: 19 listopada 2026. Wersja przygotowana na osobnej gałęzi. Publikacja produkcyjna następuje po ocenie gotowego podglądu przez Mariusza.

Kliknięcie czarnej książki na istniejącej fotografii strony głównej otwiera czytnik. Układ obejmuje 65 stron: tytuł i wstęp, trzy rozdziały po 20 wybranych cytatów oraz jednej refleksji Mariusza, następnie zakończenie. Yudkowsky otwiera rozdział Człowiek, a zaakceptowany zamiennik Harariego pozostaje na siódmej pozycji Przyszłości.

## Obsługa

- PL i EN mają te same identyfikatory kartek. Przełączenie języka zachowuje rozdział i miejsce czytania.
- Przyciski rozdziałów, poprzednia/następna oraz klawisze lewo/prawo przewracają kartki. Home i End prowadzą do wstępu i zakończenia. Escape zamyka najpierw podgląd grafiki, następnie książkę. Zamknięcie oddaje fokus i pozycję przewinięcia stronie głównej.
- Skopiowany tekst zawiera właściwego autora, źródło, rok, oznaczenie przekładu i adres źródła. Przy niedostępnym schowku dostępny jest tekst do ręcznego zaznaczenia.
- Grafika PNG ma 1080 × 1350 px. Nazwisko filozofa i bibliografia pozostają na grafice; podpis kolekcji jest osobnym elementem. Dodatkowe trzy myśli należą do Mariusza. Na obsługujących urządzeniach dostępne jest udostępnienie pliku; osobny podgląd obrazu umożliwia także zapis z menu przeglądarki.
- Małe ekrany pokazują pojedynczą kartkę. Dłuższe kartki przewijają się wewnątrz czytnika; nawigacja pozostaje dostępna. Preferencja ograniczenia animacji jest respektowana.
- Adresy `/#notebook/<id>` i `/pl/#notebook/<id>` otwierają konkretną kartkę. Strony `/notebook/` oraz `/pl/notebook/` zawierają również cały wybór jako zwykły HTML.

## Treść i źródła

`data/notebook.json` zawiera jeden wspólny zestaw danych dla czytnika, schowka, grafiki oraz zwykłych stron HTML. Zatwierdzonych polskich brzmień nie zmieniono. Własna refleksja Człowiek zachowuje oba akapity na jednej kartce.

Źródła pierwotne i bibliografia są dostępne przy każdej pozycji. Przy klasykach zachowano historyczny kontekst. Teksty angielskie wykorzystują oryginalne brzmienia, gdy są tak oznaczone; własne przekłady noszą oznaczenie `Editorial English translation.`. H15, M06, F03, F04 i F16 są jawnie oznaczone `Editorial English rendering.` — są wiernym redakcyjnym oddaniem zaakceptowanych fragmentów, a nie deklaracją dosłownego brzmienia istniejącego wydania EN.

Nowe trzy refleksje, wstęp i zakończenie są treścią tego notatnika. Nie dodano fragmentów nieopublikowanych rękopisów ani odłożonej Debaty Trzech Architektur.

Po zmianie danych należy uruchomić:

```bash
python scripts/build_notebook_pages.py
npm test
npm run build:preview
```

## Weryfikacja

Sprawdzono dane wszystkich 63 kartek w obu językach, zgodność polskich brzmień z zaakceptowanym rejestrem, kolejność i podpisy. Testy obejmują kompletność rozdziałów, atrybucję, trwałe identyfikatory, dwie części refleksji Człowiek oraz obecność całego wyboru w HTML. Dotychczasowe testy licznika ciekawości przechodzą.

Kontrola w przeglądarce obejmuje otwarcie ze zdjęcia, wstęp, rozdziały, klawiaturę, zachowanie kartki przy PL/EN, schowek (sprawdzona rzeczywista zawartość), grafikę zewnętrznego autora i Mariusza, pobranie rzeczywistego pliku PNG, Escape, powrót fokusu i układy 390 × 844 oraz 320 × 568. Układy telefoniczne sprawdzono przez ramki przeglądarki, nie na fizycznych telefonach.

Po publikacji notatnika kolejną pracą jest gotowy angielski esej Am I Still Me? na autorskie FB i LinkedIn, a następnie przygotowanie reklamy na Indie po ustaleniu budżetu i czasu.
