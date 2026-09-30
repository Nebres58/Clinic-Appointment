# Riverbend Clinic — Appointment Booking

A front-end clinic appointment system built with plain HTML, CSS, and JavaScript. Patients can browse doctors, pick an open time slot, and manage their bookings. Front desk staff get a dashboard to review, approve, complete, and cancel appointments.

No framework, no build step, and no backend. Everything runs in the browser and saves to `localStorage`.

## Features

### For patients
- **Browse doctors by department** using filter chips
- **Availability pulse**: each doctor card shows how open their next five working days are, color-coded from wide open to fully booked
- **Live time slots** generated from each doctor's working days, hours, lunch break, and slot length
- **Double-booking protection**: booked slots are disabled, and the slot is re-checked when you submit
- **Form validation** for name, email, phone, date, and time
- **Confirmation modal** with a unique confirmation ID (for example `RB-XXXXX00`)
- **My Appointments**: look up bookings by email or phone number, then reschedule or cancel upcoming visits
- **Doctor photos with fallback**: if an image fails to load, the doctor's initials are shown instead

### For staff
- **Passcode-protected dashboard** (demo lock, see [Security note](#security-note))
- **Summary stats**: Today, Upcoming, Pending Approval, Completed, Cancelled
- **Filters** by date, department, doctor, and status
- **Actions** on each appointment: Approve (doctor approval), Complete, and Cancel

### General
- Responsive layout for desktop, tablet, and phone
- Respects `prefers-reduced-motion`
- Keyboard-visible focus styles and ARIA labels on key regions

## Tech Stack

| Layer       | Technology |
| ----------- | ---------- |
| Markup      | HTML5 |
| Styling     | CSS3 (custom properties, grid, flexbox) |
| Logic       | Vanilla JavaScript (ES6+) |
| Storage     | Browser `localStorage` |
| Fonts       | Fraunces, Inter, IBM Plex Mono (Google Fonts) |

## Getting Started

### Prerequisites

- A modern web browser
- An internet connection for the Google Fonts (the app still works without it, using fallback fonts)

### Run it

```bash
# Clone the repository
git clone https://github.com/Nebres58/Clinic-Appointment.git
cd Clinic-Appointment
```

Then either:

- **Open `index.html`** directly in your browser, or
- **Serve it locally** (optional):

```bash
# Python
python -m http.server 8000

# or Node
npx serve
```

Then visit `http://localhost:8000`.

## Usage

### Booking an appointment
1. Open the **Book Appointment** tab.
2. Filter by department, then click a doctor.
3. Choose a date. Only the doctor's working days will show slots.
4. Pick an available time.
5. Enter your name, email, and phone number (add a reason for the visit if you like).
6. Click **Confirm appointment** and keep the confirmation ID.

### Managing your appointments
1. Open **My Appointments**.
2. Enter the email or phone number you booked with.
3. Use **Reschedule** or **Cancel** on any upcoming appointment.

### Staff dashboard
1. Open the **Staff** tab.
2. Enter the demo passcode: `clinic2026`
3. Filter, approve, complete, or cancel appointments.

## Project Structure

```
Clinic-Appointment/
├── index.html    # Page markup: booking, my appointments, and staff views
├── styles.css    # Design tokens and responsive styles
├── app.js        # Application logic, storage, and rendering
├── data.js       # Doctors and departments data
└── README.md
```

## Customization

- **Doctors and departments**: edit `data.js`. Each doctor defines their working days, hours, lunch break, and slot length, which drive the available slots.
- **Staff passcode**: change `ADMIN_PASSCODE` at the top of `app.js`.
- **Colors and fonts**: edit the design tokens in the `:root` block of `styles.css`.
- **Reset all data**: run `localStorage.removeItem("clinic_appointments")` in the browser console, then refresh.

## Limitations

- **Data is stored per browser.** Appointments live in `localStorage`, so they are not shared between devices or users, and clearing browser data deletes them.
- **No email or SMS notifications** are sent.
- **Not suitable for real patient data** in its current form (see below).

## Security note

The staff passcode is checked in client-side JavaScript and is visible in the source code. It is a demo lock only. Before handling real patient data, add a backend with proper authentication, a real database, and secure storage of personal information.

## Possible Improvements

- Backend API and database (for example Node.js, Django, or Firebase)
- Real authentication with staff and doctor accounts
- Email or SMS appointment reminders
- Calendar export (`.ics`)

## Author

**Nebres58** — [GitHub](https://github.com/Nebres58)
