# SafeMarg — Book Smart, Travel Safe

A frontend-only travel booking web app for **flights, trains and buses**, where every result is ranked by a Safety Score. Built with HTML, CSS and vanilla JavaScript (no framework, no backend).

## Features
- Search flights, trains and buses: 32 Indian cities + 12 international, searchable From/To picker, swap button, popular-route shortcuts
- Results with Safety Score, sorting (price / safety) and a "Safety 90+" filter
- Interactive seat map with premium seats, 5-minute seat-hold timer
- Payment: validated card form (live card preview) and UPI scan-and-pay QR with exact amount, promo codes (`SAFE10`, `FLAT100`)
- E-ticket with PNR, QR code, barcode, PDF download (print) and WhatsApp share
- Booking notification email to the owner (FormSubmit, no server)
- My Bookings saved in `localStorage`, dark mode (remembered), fully responsive

## Folder structure
```
index.html
css/   style.css  enhance.css  extras.css  upgrades.css
js/    config.js  script.js  enhance.js  extras.js  upgrades.js
assets/ pay-qr.png  owner.jpg
```

## Run
Open the folder in VS Code and start **Live Server** on `index.html`.

## Setup (`js/config.js`)
Set `NOTIFY_EMAIL`, put your payment QR in `assets/pay-qr.png` (or set `UPI_ID`) and your photo in `assets/owner.jpg`. Confirm the one-time FormSubmit activation email on the first booking.

## Tech
HTML5, CSS3 (variables, grid, dark theme), Vanilla JavaScript (ES6), qrcodejs, localStorage, FormSubmit.

## Future scope
Real backend and database, payment gateway, user accounts, live safety data API, multi-passenger booking, cancellation and refunds.
