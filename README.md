# Тайлан илгээх, үнэлгээ өгөх систем

Official report submission and evaluation system for managing reports, reviews, scoring, and geographic information.

## Stack

- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT with session cookies

## Features

### User Roles
- **Sender:** Submit reports and view feedback
- **Review Manager:** Assign reports to evaluators, manage workflow
- **Evaluator:** Review and score assigned reports
- **Admin:** System administration and configuration

### Core Functionality
- Role-based access control
- Report submission and tracking
- Dynamic evaluation criteria
- Geographic location mapping
- Real-time evaluation progress
- Activity logging
- Notification system
- Export capabilities (PDF, Excel)

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone and install dependencies**
```bash
npm install
```

2. **Configure environment variables**
```bash
# .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/tailan"
JWT_SECRET="your-secret-key"
```

3. **Set up database**
```bash
# Generate Prisma client
npx prisma generate

# Create and seed database
npx prisma migrate dev --name init
npx prisma db seed
```

4. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:3000`

### Demo Credentials

**Sender:**
- Email: `sender1@tailan.mn`
- Password: `Sender123!`

**Review Manager:**
- Email: `manager@tailan.mn`
- Password: `Manager123!`

**Evaluator:**
- Email: `evaluator1@tailan.mn`
- Password: `Eval123!1`

**Admin:**
- Email: `admin@tailan.mn`
- Password: `Admin123!`

## Project Structure

```
/app                 # Next.js app directory
  /api              # API routes
  /login            # Authentication pages
  /sender           # Sender dashboard
  /reviewer         # Review manager dashboard
  /evaluator        # Evaluator dashboard
  /admin            # Admin dashboard
/components         # Reusable React components
/lib               # Utilities and helpers
  /prisma          # Database schema and migrations
```

## Database Schema

Key tables:
- `companies` - Organizations
- `users` - Users with roles
- `reports` - Submitted reports
- `report_types` - Dynamic report categories
- `evaluation_criteria` - Scoring criteria
- `report_assignments` - Evaluator assignments
- `evaluations` - Evaluation scores
- `notifications` - System notifications
- `activity_logs` - Action history

## UI Design

- **Primary Navy:** #0B2A4A
- **Button Navy:** #0F4C81
- **Aqua Accent:** #22D3EE
- **Background:** #EAFBFF
- **Surfaces:** #FFFFFF

## Status Badges

- Ноорог (Draft) - Gray
- Илгээгдсэн (Submitted) - Blue
- Гишүүдэд оноосон (Assigned) - Cyan
- Хянагдаж байна (In Review) - Yellow
- Засвар шаардсан (Needs Revision) - Orange
- Үнэлгээ дууссан (Completed) - Green
- Батлагдсан (Approved) - Green
- Татгалзсан (Rejected) - Red

## License

Proprietary
