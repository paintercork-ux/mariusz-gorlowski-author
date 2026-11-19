# QR ciekawości — zaakceptowane wdrożenie

Projekt zaakceptowany przez autora 19 listopada 2026. Licznik od myśli oddziela cienka złota linia; myśl pozostaje bez cudzysłowu.

Kod na stronie głównej ma kolor #73551f. Polskie i angielskie kody prowadzą do odpowiednich wersji /pl/curiosity/ i /curiosity/. Oba można też otworzyć kliknięciem.

Licznik zawiera uzgodnioną wartość początkową 1000. Pierwsza wizyta otrzymuje numer 1001. Losowy identyfikator zapisany w sessionStorage utrzymuje ten sam numer po odświeżeniu i zmianie języka w tej samej karcie. Nowa sesja przeglądarki jest kolejną wizytą. Wspólny zapis i przydział numerów odbywa się w SQLite Durable Object. Podgląd korzysta z lokalnego SQLite i tego samego kodu licznika.

Osobna usługa workers/curiosity-counter/wrangler.jsonc została wdrożona 19 listopada 2026 jako mariusz-author-curiosity. Adres https://mariusz-author-curiosity.getqrfinder.workers.dev/api/curiosity/visit jest ustawiony w meta curiosity-counter-endpoint w obu nowych podstronach. GitHub Pages obsługuje statyczną część strony. Błąd usługi ukrywa liczbę i pozostawia wiadomość autora dostępną.

Sprawdzone w tym etapie — odczyt obu PNG w rozmiarach 492, 176 i 88 px, pierwsze wejście 1001, powtórne żądanie, 20 równoczesnych wejść, zachowanie licznika po ponownym otwarciu bazy, odrzucenie błędnego identyfikatora i obcej domeny. Podgląd w przeglądarce przeszedł otwarcie QR, powrót, zmianę EN/PL i odświeżenie. Rozmiary 320, 390 i 414 px oraz komputer sprawdzone. Testy na fizycznych telefonach pozostają do wykonania po publikacji.
