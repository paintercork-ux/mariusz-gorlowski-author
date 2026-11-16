MARIUSZ GORLOWSKI — STRONA AUTORSKA V3.5 — ODDZIELNIE OD QR FINDER
============================================================================
STATUS: PRYWATNE REPOZYTORIUM GOTOWE; DOMENA ZAKUPIONA; NIE OPUBLIKOWANO.

TA WERSJA UMOZLIWIA CALKOWITA SEPARACJE OD QR FINDER NA NETLIFY:
- HOSTING: GitHub Pages (oddzielne repozytorium autorskie)
- FORMULARZ: Formspree (oddzielna usluga formularzy, bez Netlify Forms)
- DOMENA: mariuszgorlowski.com — zakupiona przez autora 16.11.2026; DNS do konfiguracji
- KOD QR FINDER, NETLIFY QR FINDER, GITHUB QR FINDER I DNS QR FINDER: BEZ ZMIAN.

PRZED PUBLIKACJA (MUSI BYC ZROBIONE):
1. GOTOWE: autor kupil mariuszgorlowski.com w Porkbun 16.11.2026; koniec waznosci 16.11.2027.
2. GOTOWE: prywatne repo paintercork-ux/mariusz-gorlowski-author, niezalezne
   od qr-finder-production i qr-finder-app. Nie dotykaj tych projektow.
3. Zaloz oddzielny formularz na formspree.io z odbiorca ustawionym PRYWATNIE w panelu.
   Formspree Free ma 50 wiadomosci/mies. (stan 16.11.2026), bez abonamentu;
   dane kontaktowe autora NIE SA zapisane w HTML.
4. Zamien TYLKO 'REPLACE_WITH_YOUR_FORM_ID' w index.html na identyfikator z Formspree.
   Przed tym formularz blokuje wysylke. Obsluga AJAX i strona thank-you.html
   przeszly test logiki lokalnej (bez rzeczywistego wysylania).
5. Na GitHub Pages opublikuj wlasne, osobne repozytorium, ustaw domene i HTTPS.
   Nie korzystaj z juz istniejacego projektu ani zespolu QR FINDER na Netlify.
6. Zatwierdz privacy.html pod katem Formspree, GitHub Pages i retencji danych.
7. Wyslij jedno PRAWDZIWE zgloszenie testowe i sprawdz powiadomienie + wpis w Formspree.
8. Dopiero po dobrym tescie zgloś domenę do Google Search Console, dodaj kanoniczny
   adres domeny i mape witryny (sitemap.xml), popraw dane schema.org zgodnie z URL.

UWAGI:
- Strona i wyglad V3.4 sa ZACHOWANE, zmieniono wylacznie sposob przyjmowania wiadomosci
  i opis przetwarzania danych w polityce prywatnosci.
- Wersja robocza NIE jest jeszcze produkcyjna: czeka na konfiguracje formularza,
  sprawdzenie domeny, zatwierdzenie polityki prywatnosci i zgode na publikacje.
- Nie ujawniaj odbiorcy email w publicznych plikach ani w wiadomości do testu.
- GitHub Pages Free wymaga repozytorium publicznego; przed publikacja sprawdz jego zawartosc.
- Nowe artykuly wciaz dodaje sie przez data/publications.json i scripts/build_publications.py;
  automatyczne pobieranie nowych postow FB / LinkedIn NIE jest jeszcze wlaczone.
