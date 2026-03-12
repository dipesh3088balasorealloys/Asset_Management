# BAL Connect — IT Asset Management System

A full-stack web application for managing IT assets, software licenses, employee assignments, services, backups, and e-waste disposal across multiple plant locations.

Built with **React 19**, **Express.js**, and **MySQL 8.0** with stored procedures.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│                  │     │                  │     │                      │
│   React 19 SPA  │────▶│  Express.js API  │────▶│  MySQL 8.0 Database  │
│   (Vite 7.x)    │     │  (REST + JWT)    │     │  (Stored Procedures) │
│                  │     │                  │     │                      │
└─────────────────┘     └──────┬───────────┘     └──────────────────────┘
     Port 5173                 │ Port 3000
                               │
                         ┌─────▼───────────┐
                         │  SAP Corporate   │
                         │  Employee DB     │
                         │  (READ-ONLY)     │
                         └─────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 7.x, Recharts, Axios |
| **Backend** | Express.js, Node.js, JWT, Helmet, express-rate-limit |
| **Database** | MySQL 8.0 with 18 stored procedures |
| **Email** | Nodemailer + Office 365 SMTP |
| **Export** | CSV, Excel (ExcelJS), PDF (PDFKit) |
| **Auth** | JWT + bcryptjs, role-based access control |

---

## Features

### Core Modules

- **Asset Management** — Track laptops, desktops, and IT equipment with serial numbers, vendor info, warranty dates, pricing, and stock levels
- **Assignment Tracking** — Assign assets and licenses to employees with department and location mapping. Supports multi-asset assignments
- **License Management** — Software license inventory with expiry tracking, vendor management, and utilization monitoring
- **Service & Subscription Tracking** — Manage SaaS, cloud, maintenance, and support contracts with cost analysis by billing cycle
- **E-Waste Disposal** — Record disposed assets with billing details, vendor info, and photo attachments
- **Backup Management** — Track database backups, server backups, and employee data backups (email, OneDrive, desktop)

### System Features

- **Dashboard** — Real-time summary with charts for asset distribution, category breakdown, and location-wise analytics
- **Reports** — Asset utilization, license utilization, service cost breakdown, employee summary, renewal alerts, and location summary
- **Role-Based Access Control** — Three roles: `admin` (full access), `manager` (create/edit), `viewer` (read-only)
- **Audit Log** — Immutable trail of all actions (CREATE, UPDATE, DELETE, ASSIGN, UNASSIGN, IMPORT, LOGIN) with old/new value diffs and global search
- **User Management** — Admin panel to create users, assign roles, reset passwords, and deactivate accounts
- **Multi-Location Support** — Filter and manage assets across multiple plant locations with location-based access restrictions
- **Import/Export** — Bulk import from CSV/Excel files. Export to CSV, Excel, and PDF formats with downloadable templates
- **Employee Lookup** — Live search against SAP corporate employee database for assignment forms
- **Email Notifications** — Automated assignment notifications via Office 365 SMTP

---

## Database Schema

### Tables (17)

| Category | Tables |
|----------|--------|
| **Core** | `assets`, `assignments`, `assignment_assets`, `assignment_licenses`, `licenses`, `services`, `ewaste` |
| **Reference** | `locations`, `departments`, `user_locations` |
| **System** | `users`, `audit_log`, `email_log`, `ewaste_photos` |
| **Backup** | `db_backups`, `server_backups`, `employee_backups` |

### Stored Procedures (18)

| Procedure | Purpose |
|-----------|---------|
| `asset_list` | Paginated asset listing with filters (category, stock status, location, search) |
| `assignment_list` | Paginated assignment listing with department and location filters |
| `assignment_create` | Transactional assignment creation with asset/license linking |
| `assignment_get` | Full assignment details with linked assets and licenses |
| `assignment_remove` | Deactivate assignment and release assets back to pool |
| `audit_list` | Audit log with action, entity, user, date range, and global search filters |
| `license_list` | License listing with vendor, expiry status, and search filters |
| `service_list` | Service listing with type, status filters |
| `service_cost_breakdown` | Aggregated cost analysis by service type and billing cycle |
| `ewaste_list` | E-waste records with photo counts |
| `ewaste_get` | Single e-waste record with all photos |
| `user_list` | User listing with role filter |
| `user_create` | New user registration with unique validation |
| `user_update` | Update user profile, role, and active status |
| `report_dashboard_summary` | Complete dashboard statistics |
| `db_backup_list` | Database backup schedule listing |
| `server_backup_list` | Server backup record listing |
| `employee_backup_list` | Employee data backup listing |

---

## API Endpoints (65+)

| Module | Base Path | Operations |
|--------|-----------|------------|
| Auth | `/api/auth` | Login, Register, Profile, Change Password |
| Assets | `/api/assets` | CRUD, Low-stock alerts |
| Assignments | `/api/assignments` | CRUD with asset/license linking |
| Licenses | `/api/licenses` | CRUD, Expiry alerts |
| Services | `/api/services` | CRUD, Cost summary |
| E-Waste | `/api/ewaste` | CRUD, Photo upload/delete |
| Backups | `/api/backups` | Server, DB, Employee backup CRUD |
| Users | `/api/users` | List, Update, Deactivate, Reset password |
| Reports | `/api/reports` | Dashboard, Utilization, Costs, Renewals |
| Import | `/api/import` | Assets, Licenses, Services, Assignments |
| Export | `/api/export` | CSV, Excel, PDF for all entities |
| Audit | `/api/audit` | Log listing, Entity history |
| Locations | `/api/locations` | Location listing |
| Employees | `/api/employees` | SAP employee search |

---

## Project Structure

```
asset-management-app/
├── client/                     # React Frontend
│   ├── src/
│   │   ├── pages/              # 11 page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AssetHub.jsx
│   │   │   ├── Assignments.jsx
│   │   │   ├── LicenseCenter.jsx
│   │   │   ├── Services.jsx
│   │   │   ├── EWaste.jsx
│   │   │   ├── Backup.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── AuditLog.jsx
│   │   │   ├── UserManagement.jsx
│   │   │   └── Login.jsx
│   │   ├── components/         # Shared components (Sidebar, Layout)
│   │   ├── context/            # Auth context provider
│   │   └── utils/              # Axios config, helpers
│   └── vite.config.js
│
├── src/                        # Express Backend
│   ├── controllers/            # Route handlers
│   ├── services/               # Business logic + stored procedure calls
│   ├── routes/                 # API route definitions
│   ├── middleware/              # Auth, audit log, validation
│   ├── config/                 # Database connection pools
│   ├── utils/                  # DB helpers, email, logger
│   └── server.js               # Entry point
│
├── prisma/
│   └── schema.prisma           # Database schema definition
│
├── sql/                        # SQL scripts and seeds
├── docs/                       # HTML documentation dashboard
└── .env                        # Environment configuration
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8.0
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/dipesh3088balasorealloys/Asset_Management.git
cd Asset_Management/asset-management-app

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..
```

### Configuration

Create a `.env` file in the `asset-management-app` directory:

```env
# Server
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:5173

# Database (MySQL)
DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASS=your-db-password
DB_NAME=asset_mgmt

# External Employee Database (READ-ONLY)
EXT_DB_HOST=your-ext-db-host
EXT_DB_PORT=3306
EXT_DB_USER=your-ext-db-user
EXT_DB_PASS=your-ext-db-password
EXT_DB_NAME=your-ext-db-name

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h

# SMTP
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email
SMTP_PASS=your-email-password
EMAIL_FROM_NAME=BAL Connect
EMAIL_FROM_ADDRESS=your-email
```

### Run

```bash
# Start backend
npm run dev

# Start frontend (in another terminal)
cd client && npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Security

- JWT token authentication with 24-hour expiry
- Password hashing with bcryptjs
- Helmet security headers
- Rate limiting on login endpoint
- Role-based route protection
- Input validation with express-validator
- Soft delete pattern (no permanent data loss)
- Audit trail for all data modifications

---

## License

Internal use — Balasore Alloys Ltd.
