# Center Hub

You are a Senior Product Manager, Senior Software Architect, and Senior Full Stack Engineer.

Your task is to build a production-ready SaaS web application called:

Center Management System (CMS)

This application is NOT a school website.

This application is NOT an LMS.

This application is an internal administration platform used by educational centers to manage students, monitor their academic progress, generate reports, and manage center operations.

This project must be production-ready, scalable, clean, secure, and maintainable.

====================================================

GOAL

====================================================

Build the complete project foundation only.

Do NOT implement every business feature yet.

Focus on:

• Architecture

• Authentication

• Database

• Dashboard

• Navigation

• Layout

• User Management

• Supabase Integration

• Security

• Clean Code

Everything should be ready so future modules can be added without restructuring the project.

====================================================

TECH STACK

====================================================

Frontend

- React

- TypeScript

- Vite

- Tailwind CSS

- shadcn/ui

Backend

Use Supabase only.

Use:

✓ Supabase PostgreSQL

✓ Supabase Authentication

✓ Supabase APIs

✓ Row Level Security (RLS)

✓ Storage (prepare for future document uploads)

No custom backend.

====================================================

APPLICATION TYPE

====================================================

Responsive Web Application

Desktop First

Tablet Supported

Mobile Friendly

====================================================

MULTI TENANT ARCHITECTURE

====================================================

The system must support multiple educational centers in the future.

Every center owns ONLY its own data.

Use center_id in every business table.

Never expose data from one center to another.

Prepare the architecture from day one.

====================================================

ROLES

====================================================

Prepare role system.

Roles:

Super Admin

Center Admin

Only Center Admin will be active now.

Super Admin features should already exist in architecture but remain hidden.

====================================================

AUTHENTICATION

====================================================

Use Supabase Authentication.

Requirements:

Secure Login

Forgot Password

Reset Password

Protected Routes

Session Persistence

Logout

Role-based access

Center isolation

Only authenticated users can access the dashboard.

====================================================

EMAILS

====================================================

Authentication emails must work.

Configure email templates for:

Password Reset

Welcome Email (prepare the flow)

Future email notifications should be easy to integrate.

Structure the project so notification features can later be connected.

====================================================

DATABASE

====================================================

Design a normalized relational PostgreSQL database.

Prepare scalable relationships.

Create all required foreign keys.

Prepare indexes where appropriate.

Use UUIDs.

Include timestamps.

Enable Row Level Security.

Tables should support future expansion.

====================================================

MAIN TABLES

====================================================

Centers

Users

Students

Teachers

Subjects

StudentSubjects

ProgressRecords

Attendance

Assessments

Reports

Settings

====================================================

STUDENT TABLE

====================================================

Each student must include:

Internal UUID

Student ID (Auto Generated)

Center ID

First Name

Last Name

Gender

Date of Birth

School

School Grade

Phone

Email

Parent Name

Parent Phone

Registration Date

Status

Notes

Created At

Updated At

====================================================

STUDENT ID

====================================================

Student IDs must be automatically generated.

They must be unique.

Example:

ST-000001

ST-000002

ST-000003

Never reuse deleted IDs.

====================================================

DASHBOARD

====================================================

Build a professional SaaS dashboard.

Sidebar

Dashboard

Students

Teachers

Subjects

Progress

Reports

Settings

Top cards:

Total Students

New Students

Teachers

Subjects

Charts:

Student Registrations

Recent Students

Recent Activity

====================================================

DESIGN

====================================================

Modern SaaS Design

Minimal

Professional

Fast

Clean

Excellent UX

Accessible

====================================================

CODE QUALITY

====================================================

Generate production-quality code.

Use reusable components.

Create a clean folder structure.

Avoid duplicated code.

Use best practices.

Strong typing.

Proper error handling.

====================================================

IMPORTANT

====================================================

Connect everything to Supabase.

Generate the database.

Generate the authentication.

Generate the dashboard.

Generate the layout.

Generate the navigation.

Generate all required database tables.

Generate realistic seed data.

Do NOT implement Progress Tracking logic yet.

Do NOT implement Attendance logic yet.

Do NOT implement Reports logic yet.

Prepare the foundation only.

The next prompts will build each module independently on top of this architecture.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://edu-core-base.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5249d0a2-a01b-4e51-a19c-1fa0e9a3edb8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
