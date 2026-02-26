# LAUTECH Rentals Platform - Product Requirements Document

## Project Overview
A production-ready rental listing platform for students at Ladoke Akintola University of Technology (LAUTECH), Ogbomosho, Nigeria.

**Target Market:** Students looking for verified hostels and apartments in LAUTECH area.

## Architecture
- **Frontend:** React (CRA + Craco) with Shadcn/UI components
- **Backend-as-a-Service:** Supabase (Auth, Database, Storage)
- **Payments:** KoralPay integration
- **Deployment:** Vercel (frontend-only, no separate backend)

## User Personas

### 1. Students (Users)
- Age: 18-30 years, tech-savvy, mobile-first, budget-conscious
- Need verified, affordable accommodation

### 2. Property Agents
- Verified individuals who list properties
- Manage listings and inspections

### 3. Platform Admins
- Manage user roles, approve properties and agents
- Monitor platform revenue

## Core Requirements

### Authentication & Roles
- Supabase Auth (email/password)
- Role-based access: user, agent, admin
- Auto-profile creation on signup via trigger

### Agent Verification Flow
1. User submits ID card, selfie, and address
2. Admin reviews documents
3. Approved → user becomes agent

### Property Management
- CRUD operations for properties
- Approval workflow (pending → approved/rejected)
- Types: hostel, apartment

### Token System
- 1,000 NGN = 1 token via KoralPay
- Tokens used to unlock owner contacts

### Inspection System
- 2,000 NGN fixed fee via KoralPay
- Auto-assigned to property's agent

## What's Been Implemented

### Phase 1 - Frontend MVP (Feb 26, 2026)
- [x] Complete frontend UI with all pages
- [x] Supabase client integration (auth, database queries)
- [x] Supabase API helper functions in src/lib/api.js
- [x] Home page with hero section and CTA
- [x] Browse properties with filters (type, price range, search)
- [x] Property details with image gallery, contact unlock, inspection request
- [x] User profile with tabs (unlocks, inspections, transactions, settings)
- [x] Buy tokens page with quantity selector and KoralPay checkout
- [x] Agent dashboard (property CRUD, assigned inspections)
- [x] Admin dashboard (stats, users, verifications, properties, inspections, transactions)
- [x] Become Agent verification form
- [x] Payment callback verification page
- [x] Modern responsive UI (blue/green theme, mobile-first)
- [x] Desktop and mobile navigation with role-based menus
- [x] Payment simulation for testing

### Vercel Deployment Readiness (Feb 26, 2026)
- [x] Build succeeds (yarn build)
- [x] .nvmrc pinned to Node 20
- [x] vercel.json with SPA rewrite rules
- [x] engines field in package.json
- [x] .npmrc with legacy-peer-deps=true
- [x] Removed unused axios dependency
- [x] Fixed all error handling patterns (removed Axios patterns)
- [x] Fixed BecomeAgent user argument bug

## Prioritized Backlog

### P0 - Critical (For Production)
- [ ] Configure real Supabase project credentials
- [ ] Configure real KoralPay API keys
- [ ] Run Supabase SQL schema (supabase_schema.sql)
- [ ] Enable auth trigger for auto user profile creation
- [ ] Test full auth flow with real Supabase

### P1 - High Priority
- [ ] Supabase Storage for file uploads (agent verification docs, property images)
- [ ] KoralPay webhook via Supabase Edge Functions
- [ ] Row Level Security (RLS) policies (schema has them defined)
- [ ] Email notifications
- [ ] Password reset

### P2 - Nice to Have
- [ ] Property map view
- [ ] Push notifications
- [ ] Review/rating system for agents
- [ ] Dark mode toggle
- [ ] Export reports to CSV

## Database Schema
Defined in /app/supabase_schema.sql with tables:
users, wallets, agent_verification_requests, properties, transactions, unlocks, inspections, inspection_transactions

## Environment Variables (for Vercel)
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_ANON_KEY
- REACT_APP_KORALPAY_PUBLIC_KEY
