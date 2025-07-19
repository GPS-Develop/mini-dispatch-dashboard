# Mini Dispatch Dashboard

A comprehensive dispatch management system built with Next.js 15 and Supabase for trucking companies to efficiently manage loads, drivers, and pay statements with advanced AI-powered features.

## ✨ Key Features

### 🚛 Load Management
- **Complete Load Lifecycle**: Create, track, and manage loads from pickup to delivery
- **Multi-location Support**: Handle multiple pickup and delivery locations per load
- **Real-time Status Updates**: Track loads through Scheduled → In-Transit → Delivered states
- **Advanced Filtering**: Filter by status, driver, date ranges, and search functionality
- **Load Documentation**: Upload and manage load-related documents with automatic compression

### 🤖 AI-Powered PDF Processing
- **Intelligent Document Extraction**: Upload PDFs (BOL, rate confirmations) and auto-fill load forms
- **Google Gemini Integration**: Advanced AI vision and NLP for accurate data extraction
- **Smart Form Population**: Automatically extracts reference IDs, locations, rates, and broker information
- **Document Compression**: Automatic PDF compression to optimize storage and performance

### 👥 Driver Management
- **Comprehensive Driver Profiles**: Manage driver information, contact details, and pay rates
- **Status Tracking**: Real-time driver availability (Available/On Load) with automatic updates
- **Account Management**: Create driver accounts with secure authentication
- **Performance Monitoring**: Track driver assignments and load history

### 💰 Pay Statement Management
- **Automated Pay Calculations**: Generate detailed pay statements with gross pay, additions, and deductions
- **PDF Export**: Professional PDF generation for pay statements
- **Date Range Filtering**: Filter pay statements by driver and date periods
- **Trip Integration**: Link pay statements to actual load trips with pickup dates

### 🔐 Security & Authentication
- **Role-based Access**: Separate admin and driver interfaces with appropriate permissions
- **Secure Authentication**: Supabase Auth with automatic session management
- **Protected Routes**: Middleware-based route protection and automatic redirects
- **Driver Status Validation**: Automatic logout for inactive drivers

### 📱 Modern User Experience
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Performance Optimized**: Code splitting, lazy loading, and optimized bundle sizes
- **Error Handling**: Comprehensive error boundaries and user-friendly error messages
- **Real-time Updates**: Live activity feeds and status updates

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Real-time subscriptions)
- **Styling**: Tailwind CSS 4, CSS Modules for component-specific styles
- **AI Integration**: Google Gemini AI for PDF processing and data extraction
- **PDF Processing**: jsPDF, html2canvas, iLovePDF for compression
- **File Storage**: Vercel Blob storage for document management
- **Authentication**: Supabase Auth UI with custom middleware

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **Package Manager**: npm or yarn
- **Supabase Account**: For database and authentication
- **Google AI API Key**: For AI PDF processing (optional but recommended)

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/mini-dispatch-dashboard.git
cd mini-dispatch-dashboard
```

2. **Install dependencies**:
```bash
npm install
```

3. **Environment Setup**:
Create `.env.local` file with the following variables:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google AI for PDF Processing (Optional)
GOOGLE_API_KEY=your_google_ai_api_key

# Blob Storage (Optional)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

4. **Database Setup**:
- Follow the `supabase-config-guide.md` for complete database schema setup
- Ensure all required tables and RLS policies are configured

5. **Start Development Server**:
```bash
npm run dev
```

6. **Access Application**:
Open [http://localhost:3000](http://localhost:3000) and log in with your Supabase credentials

## 📁 Project Structure

```
mini-dispatch-dashboard/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── add-load/          # Load creation with AI PDF upload
│   │   ├── api/               # API routes
│   │   │   ├── ai-extract-pdf/    # AI PDF processing endpoint
│   │   │   ├── compress-pdf/      # PDF compression service
│   │   │   ├── drivers/           # Driver management APIs
│   │   │   └── admins/            # Admin management APIs
│   │   ├── driver/            # Driver dashboard and views
│   │   ├── drivers/           # Driver management interface
│   │   ├── loads/             # Load management dashboard
│   │   ├── pay-statements/    # Pay statement management
│   │   └── login/             # Authentication pages
│   ├── components/            # Reusable UI components
│   │   ├── AiPdfUpload/      # AI-powered PDF upload component
│   │   ├── DocumentUploadModal/ # Document management
│   │   ├── ErrorBoundary/    # Error handling components
│   │   └── [other-components]/
│   ├── contexts/              # React Context providers
│   │   ├── AuthContext.tsx   # Authentication state management
│   │   ├── AppDataContext.tsx # Application data context
│   │   └── UIContext.tsx     # UI state management
│   ├── features/              # Feature-based component organization
│   │   ├── loads/            # Load management feature
│   │   ├── drivers/          # Driver management feature
│   │   └── paystatements/    # Pay statement feature
│   ├── hooks/                 # Custom React hooks
│   │   ├── useLoadOperations.ts # Load-specific operations
│   │   ├── useDriverStatus.ts   # Driver status management
│   │   └── useAppData.ts       # Application data hooks
│   ├── types/                 # TypeScript type definitions
│   ├── utils/                 # Utility functions
│   │   ├── supabase/         # Supabase client configurations
│   │   ├── pdfUtils.ts       # PDF processing utilities
│   │   ├── validation.ts     # Form validation helpers
│   │   └── typeConversions.ts # Data transformation utilities
│   └── config/                # Configuration files
│       └── aiConfig.ts       # AI/ML configuration
├── public/                    # Static assets
├── middleware.ts              # Next.js middleware for auth
└── [config files]            # TypeScript, ESLint, Tailwind configs
```

## 🗄️ Database Schema

The application uses Supabase with the following core tables:

### Core Tables
- **`loads`** - Complete load information with status tracking
- **`drivers`** - Driver profiles with authentication integration
- **`pickups`** - Multiple pickup locations per load
- **`deliveries`** - Multiple delivery locations per load
- **`pay_statements`** - Driver pay statements with detailed breakdowns
- **`lumper_services`** - Lumper service tracking and payments

### Supporting Tables
- **`recent_activities`** - Activity feed and audit trail
- **`load_documents`** - Document storage with compression metadata
- **`brokers`** - Broker information and autocomplete data

Refer to `supabase-config-guide.md` for complete database setup instructions.

## 🧪 Available Scripts

- **`npm run dev`** - Start development server with hot reload
- **`npm run build`** - Build optimized production bundle
- **`npm run start`** - Start production server
- **`npm run lint`** - Run ESLint with Next.js configuration
- **`npm test`** - Run Jest test suite
- **`npm run test:watch`** - Run tests in watch mode for development

## 🧪 Testing

This project includes comprehensive unit tests covering critical business functionality:

### Test Coverage
- **31 passing tests** across 4 test suites
- **Business Logic**: Validation, data transformations, calculations
- **Component Testing**: UI components with React Testing Library  
- **File Processing**: PDF validation and security checks
- **Type Safety**: Database/frontend data conversions

### Test Categories
```typescript
// Business Logic Tests
✅ Phone number sanitization and validation
✅ Driver pay rate validation (supports decimals, rejects negatives)
✅ PDF file validation (25MB limit, type checking, magic numbers)
✅ Data type conversions (database ↔ frontend)

// Component Tests  
✅ Button component variants and interactions
✅ Event handling and accessibility
✅ Prop forwarding and custom styling
```

### Running Tests
```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode for development
npm test -- --coverage # Run with coverage report
```

**All tests validate real business requirements and edge cases, ensuring production-ready code quality.**

## 🏗️ Architecture Highlights

### Performance Optimizations
- **Code Splitting**: Lazy-loaded routes and components
- **Bundle Optimization**: Reduced pay statements route from 305kB
- **Query Optimization**: Batched data fetching to prevent N+1 queries
- **Memory Management**: Proper cleanup of intervals and event listeners
- **Caching**: React optimizations with memo, useMemo, and useCallback

### Security Features
- **Authentication Middleware**: Route-level protection
- **File Validation**: Magic number checking for uploads
- **CORS Configuration**: Specific allowed origins
- **Input Sanitization**: Comprehensive form validation
- **Role-based Access**: Admin and driver permission separation

### AI Integration
- **Google Gemini AI**: Advanced document processing
- **Automatic Fallback**: Multiple model attempts for reliability
- **Smart Extraction**: Structured data extraction from unstructured PDFs
- **Cost Optimization**: Efficient API usage within free tier limits

## 🎯 User Roles & Permissions

### Admin Users
- Full access to all loads, drivers, and pay statements
- Create and manage driver accounts
- Upload and process documents with AI
- Generate and export pay statements
- Access to all administrative functions

### Driver Users
- View assigned loads and delivery details
- Access personal pay statements
- Update load status (In-Transit, Delivered)
- Upload proof of delivery documents
- Limited to own data and assignments

## 🔧 Advanced Features

### AI PDF Processing
See `AI_PDF_FEATURE.md` for detailed setup and usage instructions.

### PDF Compression
Automatic document compression reduces storage costs and improves performance. See `PDF_COMPRESSION_README.md` for technical details.

### Real-time Updates
- Live status updates using Supabase subscriptions
- Automatic driver status synchronization
- Real-time activity feed updates

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Test** thoroughly with both admin and driver roles
5. **Push** to the branch (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Maintain component modularity
- Add proper error handling
- Include comprehensive tests
- Update documentation for new features

## 📄 License

This project is **private and proprietary**. All rights reserved.

## 📞 Support

For technical support or feature requests:
1. Check existing documentation files (`AI_PDF_FEATURE.md`, `PDF_COMPRESSION_README.md`, `STYLING_GUIDE.md`)
2. Review the `supabase-config-guide.md` for database issues
3. Contact the development team for additional assistance