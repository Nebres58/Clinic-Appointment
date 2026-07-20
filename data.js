/* ============================================================
   Riverbend Clinic — seed data
   Doctors, their departments, and working hours.
   0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
   ============================================================ */

const DOCTORS = [
  {
    id: "d1",
    name: "Dr. Ana Reyes",
    department: "General Medicine",
    initials: "",
    photo: "ana.jpeg",
    workDays: [1, 2, 3, 4, 5],
    startHour: 8,
    endHour: 16,
    slotMinutes: 30,
    lunch: [12, 13],
    blurb: "Family medicine, checkups, and referrals."
  },
  {
    id: "d2",
    name: "Dr. Liam Cruz",
    department: "General Medicine",
    initials: "",
    photo: "liam.jpeg",
    workDays: [1, 3, 5],
    startHour: 9,
    endHour: 17,
    slotMinutes: 30,
    lunch: [12, 13],
    blurb: "Adult primary care and chronic condition management."
  },
  {
    id: "d3",
    name: "Dr. Sofia Martin",
    department: "Pediatrics",
    initials: "",
    photo: "sofia.jpeg",
    workDays: [1, 2, 4, 5],
    startHour: 9,
    endHour: 15,
    slotMinutes: 30,
    lunch: [12, 12.5],
    blurb: "Newborn through teen care, vaccinations."
  },
  {
    id: "d4",
    name: "Dr. Marco Silva",
    department: "Dental",
    initials: "",
    photo: "marco.jpeg",
    workDays: [2, 3, 4, 5, 6],
    startHour: 8,
    endHour: 14,
    slotMinutes: 45,
    lunch: [11, 11.5],
    blurb: "Cleanings, fillings, and general dentistry."
  },
  {
    id: "d5",
    name: "Dr. Elena Cho",
    department: "Dermatology",
    initials: "",
    photo: "elena.jpeg",
    workDays: [1, 2, 3],
    startHour: 10,
    endHour: 16,
    slotMinutes: 30,
    lunch: [13, 13.5],
    blurb: "Skin checks, acne, and minor procedures."
  },
  {
    id: "d6",
    name: "Dr. James Wu",
    department: "Cardiology",
    initials: "",
    photo: "james.jpeg",
    workDays: [4, 5],
    startHour: 9,
    endHour: 15,
    slotMinutes: 45,
    lunch: [12, 12.5],
    blurb: "Heart health screening and consultations."
  }
];

const DEPARTMENTS = [...new Set(DOCTORS.map(d => d.department))];
