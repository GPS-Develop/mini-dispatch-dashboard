# Mini Dispatch Dashboard

A modern dispatch management system built with Next.js and Supabase for trucking companies to manage loads, drivers, and pay statements.

## Features

- **Load Management**: Create, track, and manage loads with pickup/delivery locations
- **Driver Management**: Manage driver accounts, status, and assignments
- **Pay Statements**: Create and manage driver pay statements with PDF generation
- **Real-time Dashboard**: Live activity feed and upcoming loads overview
- **Document Upload**: Handle driver document uploads and management
- **Authentication**: Secure login system with Supabase Auth
- **Mobile Responsive**: Optimized for mobile and desktop use

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Styling**: Tailwind CSS 4, CSS Modules
- **PDF Generation**: jsPDF with html2canvas
- **Authentication**: Supabase Auth UI

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mini-dispatch-dashboard.git
cd mini-dispatch-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Add your Supabase credentials to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── add-load/          # Add new load page
│   ├── api/               # API routes
│   ├── driver/            # Driver-specific pages
│   ├── drivers/           # Driver management
│   ├── loads/             # Load management
│   ├── login/             # Authentication
│   └── pay-statements/    # Pay statement management
├── components/            # Reusable UI components
├── contexts/              # React contexts
├── features/              # Feature-specific components
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions and Supabase clients
```

## Database Setup

This project uses Supabase as the backend. You'll need to set up the following tables:

- `loads` - Load information
- `drivers` - Driver profiles
- `pickups` - Pickup locations
- `deliveries` - Delivery locations
- `pay_statements` - Pay statement records
- `recent_activities` - Activity tracking

Refer to `supabase-config-guide.md` for detailed database schema setup.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Key Features

### Dashboard
- Overview of upcoming loads
- Real-time activity feed
- Driver status monitoring

### Load Management
- Create loads with multiple pickup/delivery locations
- Assign drivers to loads
- Track load status and progress

### Driver Management
- Create driver accounts
- Manage driver status and information
- Track driver assignments

### Pay Statements
- Generate pay statements for drivers
- PDF export functionality
- Track payment history

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and proprietary.