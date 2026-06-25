# Setup Guide - Тайлан илгээх, үнэлгээ өгөх систем

This guide will help you set up and run the full-stack reporting system.

## Prerequisites

Before starting, ensure you have installed:
- **Node.js** 18 or higher
- **PostgreSQL** 14 or higher
- **npm** or **yarn**

## Step 1: Database Setup

### Option A: PostgreSQL Local Installation

#### For Windows:
1. Download PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run the installer and follow the setup wizard
3. Remember the **postgres** user password
4. Note the port (default: 5432)

#### For macOS:
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql
```

#### For Linux:
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Create Database and User

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE tailan;

# Create user (optional, for security)
CREATE USER tailan_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE tailan TO tailan_user;

# Exit psql
\q
```

## Step 3: Configure Environment Variables

Edit the `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/tailan?schema=public"
JWT_SECRET="tailan-demo-secret-change-me"
NODE_ENV="development"
```

Replace:
- `your_password` with your PostgreSQL **postgres** user password
- `JWT_SECRET` with a strong random secret for production

## Step 4: Initialize Database Schema

Run Prisma migrations to create all tables:

```bash
# Generate Prisma client
npx prisma generate

# Create database schema
npx prisma migrate dev --name init

# Seed database with sample data
npx prisma db seed
```

This will:
- Create all required database tables
- Insert 3 sender companies
- Insert 1 reviewer organization  
- Insert system admin, review manager, and 5 evaluators
- Create 10 sample reports
- Create sample locations across Mongolia

## Step 5: Run Development Server

```bash
npm run dev
```

The application will start at `http://localhost:3000`

## Step 6: Test the Application

### Access the Home Page
Visit: **http://localhost:3000**

### Login with Demo Accounts

**Sender Organization:**
- Email: `sender1@tailan.mn`
- Password: `Sender123!`
- Dashboard: `/sender`

**Review Manager:**
- Email: `manager@tailan.mn`
- Password: `Manager123!`
- Dashboard: `/reviewer`

**Evaluator:**
- Email: `evaluator1@tailan.mn`
- Password: `Eval123!1`
- Dashboard: `/evaluator`

**System Admin:**
- Email: `admin@tailan.mn`
- Password: `Admin123!`
- Dashboard: `/admin`

## Troubleshooting

### Database Connection Error
```
Error: Can't reach database server at localhost:5432
```

**Solution:**
1. Check PostgreSQL is running
   ```bash
   # Windows
   sc query postgresql-x64-14
   
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Verify DATABASE_URL in .env is correct

3. Ensure database exists:
   ```bash
   psql -U postgres -l | grep tailan
   ```

### Port Already in Use
```
Error: Port 3000 is already in use
```

**Solution:**
```bash
# Kill the process on port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### Module Not Found Errors
```bash
# Clear dependencies and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Prisma Client Issues
```bash
# Regenerate Prisma client
npx prisma generate
```

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Database operations
npx prisma studio          # Open Prisma GUI
npx prisma migrate dev     # Create new migration
npx prisma db seed         # Seed database
```

## Project Structure

```
tailan/
├── app/                   # Next.js app directory
│   ├── api/              # API routes
│   ├── login/            # Authentication pages
│   ├── sender/           # Sender dashboard
│   ├── reviewer/         # Review manager dashboard
│   ├── evaluator/        # Evaluator dashboard
│   ├── admin/            # Admin dashboard
│   ├── geography/        # Geographic dashboard
│   └── report/           # Report detail pages
├── components/           # React components
├── lib/                  # Utilities and helpers
├── prisma/              # Database schema
│   ├── schema.prisma
│   └── seed.js
└── package.json
```

## Key Features

✅ **Role-Based Access Control** - Sender, Reviewer, Evaluator, Admin
✅ **Report Management** - Submit, assign, evaluate, and track reports
✅ **Dynamic Evaluation Criteria** - 8 customizable scoring criteria (100 points total)
✅ **Geographic Information** - Location-based report tracking with coordinates
✅ **Real-Time Notifications** - System notifications for key events
✅ **Activity Logging** - Complete audit trail of all actions
✅ **Responsive Design** - Mobile-friendly interface
✅ **Professional UI** - Aqua-themed government dashboard style

## Database Schema Overview

### Core Tables
- `companies` - Organizations (sender, reviewer, admin)
- `users` - System users with roles
- `reports` - Submitted reports with metadata
- `report_locations` - Geographic information for each report
- `report_assignments` - Evaluator assignments to reports
- `evaluations` - Evaluation scores for reports
- `evaluation_criteria` - Dynamic scoring criteria
- `notifications` - System notifications
- `activity_logs` - Action history

## Security Considerations

⚠️ **For Production:**
1. Change `JWT_SECRET` to a strong random value
2. Use environment-specific database URLs
3. Enable HTTPS/TLS
4. Implement rate limiting
5. Set up proper user authentication (OAuth, SAML, etc.)
6. Enable database backups
7. Use strong passwords for all accounts
8. Implement CORS policies

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Support

For issues or questions:
1. Check this setup guide
2. Review the README.md
3. Check application logs
4. Review Prisma schema in `prisma/schema.prisma`

---

**Last Updated:** 2026-06-24
**Version:** 0.1.0 (MVP)
