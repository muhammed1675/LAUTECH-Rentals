# LAUTECH Rentals Platform - Product Requirements Document

## Project Overview
A production-ready rental listing platform for students at Ladoke Akintola University of Technology (LAUTECH), Ogbomosho, Nigeria.

**Target Market:** Students looking for verified hostels and apartments in LAUTECH area.

## Architecture
- **Frontend:** React with Shadcn/UI components
- **Backend:** FastAPI + MongoDB
- **Payments:** KoralPay integration (placeholder credentials)
- **Auth:** JWT-based authentication

## User Personas

### 1. Students (Users)
- Age: 18-30 years
- Tech-savvy, mobile-first
- Budget-conscious
- Need verified, affordable accommodation

### 2. Property Agents
- Verified individuals who list properties
- Manage property listings and inspections
- Earn through property visibility

### 3. Platform Admins
- Manage user roles and permissions
- Approve/reject properties and agent verifications
- Monitor platform revenue and operations

## Core Requirements (Static)

### Authentication & Roles
- User registration with default "user" role
- JWT-based authentication
- Role-based access control (user, agent, admin)
- Manual role assignment by admin via database

### Agent Verification Flow
1. User submits ID card, selfie, and address
2. Admin reviews documents
3. Admin approves → user becomes agent

### Property Management
- CRUD operations for properties
- Property approval workflow
- Types: hostel, apartment
- Fields: title, description, price, location, images, owner contact

### Token System
- ₦1,000 = 1 token via KoralPay
- Tokens used to unlock owner contacts
- Wallet balance tracked per user

### Inspection System
- ₦2,000 fixed fee via KoralPay
- Auto-assigned to property's agent
- Status tracking: pending → assigned → completed

## What's Been Implemented ✅

### Phase 1 - MVP (Feb 26, 2026)
- [x] Complete backend API with 30+ endpoints
- [x] User registration and authentication
- [x] Role-based access control
- [x] Agent verification request system
- [x] Property CRUD with approval workflow
- [x] Token purchase flow with KoralPay placeholder
- [x] Property contact unlock system
- [x] Inspection request system
- [x] Modern responsive UI (blue/green theme)
- [x] Home page with hero section
- [x] Browse properties with filters
- [x] Property details with image gallery
- [x] User profile with tabs (unlocks, inspections, transactions)
- [x] Buy tokens page
- [x] Agent dashboard
- [x] Admin dashboard with full management capabilities
- [x] Mobile-first design with bottom navigation
- [x] Payment simulation endpoint for testing

### Database Collections
- users
- wallets
- agent_verification_requests
- properties
- transactions
- unlocks
- inspections
- inspection_transactions

## Prioritized Backlog

### P0 - Critical (For Production)
- [ ] Configure actual KoralPay API keys
- [ ] Set up Supabase for production database
- [ ] Configure webhook endpoints for payment verification
- [ ] Add image upload to Supabase Storage

### P1 - High Priority
- [ ] Email notifications for key actions
- [ ] Password reset functionality
- [ ] Rate limiting on API endpoints
- [ ] Search by location autocomplete

### P2 - Nice to Have
- [ ] Property map view integration
- [ ] Push notifications
- [ ] Review/rating system for agents
- [ ] Dark mode toggle
- [ ] Export transaction reports to CSV

## Test Accounts (Development)

| Role | Email | Password |
|------|-------|----------|
| User | test@example.com | test123 |
| Agent | agent@example.com | agent123 |
| Admin | admin@example.com | admin123 |

## API Endpoints Summary

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Properties
- GET /api/properties (public, approved only)
- GET /api/properties/{id} (authenticated)
- POST /api/properties (agent/admin)
- PUT /api/properties/{id}
- DELETE /api/properties/{id} (admin)
- POST /api/properties/{id}/approve (admin)
- POST /api/properties/{id}/unlock

### Tokens & Wallet
- GET /api/wallet
- POST /api/tokens/purchase

### Inspections
- POST /api/inspections
- GET /api/inspections
- GET /api/inspections/assigned
- PUT /api/inspections/{id}

### Admin
- GET /api/admin/stats
- GET /api/users
- PUT /api/users/{id}/role
- PUT /api/users/{id}/suspend
- GET /api/agent-verification/pending
- POST /api/agent-verification/{id}/review

## Next Steps
1. Obtain KoralPay production API keys
2. Set up Supabase project and migrate database
3. Configure webhooks for payment verification
4. Deploy to Vercel
5. Set up monitoring and error tracking
