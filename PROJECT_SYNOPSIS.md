# Center Sports Science - Clinical Management System
## Project Synopsis

### Overview

The Center Sports Science Clinical Management System is a comprehensive, cloud-based healthcare management platform designed specifically for physiotherapy and sports science clinics. Built with modern web technologies, the system provides a complete solution for managing patient care, appointments, billing, staff operations, and administrative tasks in a unified, real-time environment.

### Purpose and Target Users

The system serves three primary user roles:

- **Clinical Team (Physiotherapists)**: Healthcare professionals who manage patient care, create clinical reports, schedule appointments, and track treatment progress
- **Front Desk Staff**: Administrative personnel responsible for patient registration, appointment booking, billing operations, and day-to-day clinic management
- **Administrators**: System managers who oversee staff, configure settings, manage billing cycles, generate reports, and maintain system-wide operations

### Core Features

#### 1. Patient Management
- Comprehensive patient registration with demographic and medical information
- Patient assignment system linking patients to specific clinicians
- Patient transfer functionality between clinicians with history tracking
- Status tracking (pending, ongoing, completed, cancelled)
- Patient type classification (VIP, Paid, DYES, Gethhma) with different billing rules
- Session allowance tracking for annual free session caps
- Patient import/export via CSV with duplicate detection
- Advanced filtering by status, assigned doctor, registration date, and text search

#### 2. Appointment Management
- Full calendar integration with month, week, and day views using FullCalendar
- Drag-and-drop appointment rescheduling
- Real-time availability checking and conflict detection
- Appointment status workflow (pending → ongoing → completed/cancelled)
- Integration with staff availability schedules
- Patient and staff notifications for appointment changes
- Consultation appointment tracking (first-time visits)
- Appointment history and timeline views

#### 3. Clinical Documentation
- Comprehensive physiotherapy report forms including:
  - Patient history (present, past, surgical)
  - Medical investigations (X-ray, MRI, CT, Reports)
  - Personal history (smoking, drinking, sleep, hydration, nutrition)
  - Pain assessment with VAS scale
  - Range of Motion (ROM) assessment for all joints
  - Manual Muscle Testing (MMT)
  - Clinical observations (posture, gait analysis, palpation findings)
  - Treatment plans and follow-up visit scheduling
  - Clinical diagnosis and recommendations
- Professional PDF report generation
- Auto-save functionality for all report changes
- Report filtering by assigned patients

#### 4. Billing and Financial Management
- Automated billing generation from completed appointments
- Patient type-based billing rules:
  - VIP: Standard billing for all sessions
  - Paid: Standard or discounted rates based on concession status
  - DYES: Pending bills with invoice generation
  - Gethhma: Standard billing without concession
- Billing cycle management with monthly reporting
- Invoice and receipt generation with customizable templates
- Payment tracking (Cash, UPI/Card) with UTR reference
- Pending bills management with CSV/Excel export
- Cycle-level reporting and analytics
- Automated billing notifications to patients

#### 5. Staff Management
- Role-based access control (Admin, FrontDesk, ClinicalTeam)
- Staff availability scheduling with date-specific configurations
- Full month calendar view for availability management
- Copy-to-month functionality for quick schedule replication
- Leave management system with:
  - Multiple leave types (sick, casual, annual, loss of pay)
  - Approval workflow with handover assignments
  - Leave balance tracking
  - Admin approval/disapproval with messages
- Staff assignment to patients and departments

#### 6. Notification System
- Multi-channel notifications (Email, SMS, WhatsApp, In-App)
- Appointment reminders and status change notifications
- Billing notifications for pending payments
- Leave request notifications
- Birthday reminders
- Real-time in-app notification center
- Notification preferences and channel settings

#### 7. Administrative Features
- Audit logging system with action tracking (patient imports/exports, password resets, billing notifications)
- Advanced filtering and CSV export for audit logs
- Patient data management with bulk import/export
- Staff management and role assignment
- System configuration and settings
- Report generation and analytics
- Super admin capabilities for system-wide control

#### 8. Session Allowance Management
- Annual free session cap tracking
- Automatic session usage deduction
- Pending paid sessions tracking
- Charge amount calculation
- Reset scheduling for annual cycles

### Technology Stack

**Frontend:**
- Next.js 16.0.1 (App Router with Turbopack)
- React 19.2.1
- TypeScript
- Tailwind CSS 4
- FullCalendar for calendar views
- Chart.js for analytics and reporting

**Backend & Infrastructure:**
- Firebase Firestore (NoSQL database)
- Firebase Authentication
- Firebase Admin SDK
- Next.js API Routes

**Third-Party Integrations:**
- Resend (Email service)
- Twilio (SMS service)
- WhatsApp API integration
- Sentry (Error tracking and monitoring)
- jsPDF (PDF generation)

**Development Tools:**
- ESLint for code quality
- Firebase Tools for deployment
- Cross-env for environment management

### Architecture Highlights

**Real-Time Synchronization:**
- All components use Firestore `onSnapshot` listeners for real-time data updates
- Changes made by one user are immediately visible to all authorized users
- No page refresh required for data updates

**Role-Based Security:**
- Firestore security rules enforce role-based access control
- API endpoints protected with authorization checks
- User authentication via Firebase Auth

**Staging Environment:**
- Separate staging database for testing
- Environment-based configuration switching
- Independent staging deployment pipeline

**Data Management:**
- CSV import/export for bulk patient operations
- Excel export for billing and reporting
- PDF generation for clinical reports and invoices

### Key Capabilities

1. **Automated Workflows**: Appointment completion automatically triggers billing generation based on patient type rules
2. **Conflict Prevention**: Availability and appointment conflict detection prevents double-booking
3. **Comprehensive Reporting**: Clinical reports, billing reports, audit logs, and analytics dashboards
4. **Multi-Channel Communication**: Email, SMS, and WhatsApp notifications for patients and staff
5. **Scalable Architecture**: Cloud-based infrastructure supporting multiple clinics and users
6. **Data Integrity**: Duplicate detection, validation rules, and audit trails
7. **User Experience**: Intuitive interfaces with drag-and-drop, auto-save, and real-time updates

### Deployment and Configuration

The system supports:
- Production and staging environments
- Environment variable-based configuration
- Firebase project switching
- Vercel deployment ready
- Custom domain support

### Future Enhancements

- Report templates (save/load configurations)
- Enhanced analytics and reporting dashboards
- Mobile application support
- Patient portal for self-service

---

**Project Status**: Production-ready with active development and feature enhancements

**License**: Proprietary - All rights reserved
