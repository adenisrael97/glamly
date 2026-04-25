# GLAMLY SaaS Frontend Specification — Auth, Booking & Navigation System

## 🎯 Objective
Build and refactor a production-grade user experience for a beauty/booking platform using Next.js + Tailwind CSS.

This includes:
- Authentication system (User + Stylist)
- Booking system (appointments)
- Gift service form flow
- Fully working navigation across landing page
- Loading skeleton system for images and pages
- UI consistency aligned with modern SaaS products

This must follow **senior UI/UX + frontend engineering standards (20 years experience level)**.

---

## 🧠 Core Product Flow

### User Roles
- Normal User (customer)
- Stylist (service provider)

---

## ⚙️ Tech Stack
- Next.js (JavaScript)
- Tailwind CSS
- React state management (useState / context if needed)
- next/image (mandatory)
- Next Link / router navigation

---

## 📦 REQUIRED FEATURES

# 1. Authentication System (CRITICAL)

### Pages to create:

#### /login
- Login for both User and Stylist
- Role selector (User / Stylist)
- Email + password fields
- Error validation states
- Loading state on submit
- Redirect based on role

---

#### /register
- Register User
- Register Stylist (toggle or separate form sections)
- Fields:
  - Full name
  - Email
  - Password
  - Role selection (User / Stylist)
- Clean validation UX
- Loading state

---

# 2. Stylist Registration Page (IMPORTANT)

#### /stylist-register
- Dedicated stylist onboarding page
- Fields:
  - Name
  - Email
  - Phone
  - Skills / services offered
  - Location
- Submit button with loading state
- Clean SaaS onboarding UI

---

# 3. Booking System (CRITICAL)

#### /book-appointment

Features:
- Select service
- Select stylist
- Choose date
- Choose time
- User details
- Submit booking
- Confirmation UI

UX Requirements:
- Step-by-step layout OR clean form flow
- Loading state on submit
- Success confirmation screen

---

# 4. Gift Service Form (IMPORTANT)

#### /gift-service

Form fields:
- User name
- Recipient name
- Service type
- Date
- Message (optional)
- Phone number
- Submit button with loading state

UX:
- Clean card-style form
- Responsive layout
- Validation handling

---

# 5. Landing Page Navigation Fix (CRITICAL)

Fix all CTA buttons:

### MUST BE CORRECTLY LINKED:

- "Browse Services" → `/services`
- "Become a Stylist" → `/stylist-register`
- "Gift Service" → `/gift-service`
- Image service buttons → `/stylist`

Rules:
- Use Next.js Link or router.push
- No broken or dead links allowed
- Every clickable element must function

---

# 6. Services Page

#### /services
- List all services
- Cards for each service
- Click leads to booking page OR stylist selection

---

# 7. LOADING SYSTEM (CRITICAL UX REQUIREMENT)

Implement skeleton loaders for:

### Images
- Use shimmer skeleton placeholders
- Prevent layout shift (CLS)
- Show placeholder while image loads

### Pages
- Login / Register / Booking pages
- Use skeleton UI during transitions

Rules:
- Must feel like a modern SaaS app (Stripe/Airbnb level)
- No blank white loading screens

---

# 8. UI/UX DESIGN SYSTEM

- Mobile-first responsive design
- Clean SaaS aesthetic (modern spacing, soft shadows)
- Consistent button system
- Consistent card system
- Smooth hover and transition states
- Clear visual hierarchy

---

# 9. COMPONENT ARCHITECTURE

/components
  /ui
    Button.jsx
    Card.jsx
    Input.jsx
    Skeleton.jsx

/pages OR /app
/auth
/services
/book
/gift
/stylist

---

# 10. CODE QUALITY RULES

- No duplicated UI logic
- No inline styles
- No broken routing
- Clean functional components
- Maintainable architecture
- Production-ready code only

---

## 🚀 FINAL OUTPUT REQUIREMENTS

Claude must:

1. Build Login page (User + Stylist)
2. Build Register page (User + Stylist)
3. Build Stylist Registration page
4. Build Book Appointment page
5. Build Gift Service form page
6. Fix all landing page navigation links
7. Implement skeleton loaders (images + pages)
8. Ensure all buttons and links work correctly
9. Ensure responsive UI across all pages

---

## 🎯 FINAL GOAL

Transform the project into:

❌ basic frontend with broken navigation

➡️

✅ production-grade SaaS booking platform with proper UX, authentication flow, booking system, and polished UI like a modern startup