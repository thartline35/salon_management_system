# Twisted Roots Salon Management System
A comprehensive salon management system built with React and TypeScript, designed to streamline appointment booking, staff management, and customer communications for modern salons.
## 📋 Project Overview: 
This application was conceptualized, designed, architected, developed, debugged, and launched entirely by a single developer. From initial client requirements gathering to production deployment, this represents a complete full-stack development lifecycle managed independently.

## 🌟 Features Summary

### Multi-User Interface

* Admin Dashboard: Complete salon oversight with metrics, staff management, and appointment control
* Stylist Portal: Personal schedule management, work-in request handling, and photo gallery
* Customer Booking: Intuitive appointment booking with real-time availability

## Core Functionality Summary

* Appointment Management: Create, edit, and cancel appointments with conflict prevention
* Staff Management: Add staff with custom availability schedules and specialties
* Service Management: Comprehensive service catalog with pricing and duration
* Work-In Requests: Allow customers to request flexible appointment times
* Call-In Appointments: Quick appointment creation for phone bookings
* Photo Gallery: Stylist portfolios with before/after photo support
* Smart Notifications: SMS and email communication system

## Dashboard & Analytics Summary

Real-time metrics (daily appointments, revenue, client count)
Pending request alerts
Appointment status tracking
Staff availability overview

## 🚀 Getting Started
Prerequisites

* Node.js (v16 or higher)
* npm or yarn
* Supabase account and project

## Installation

1. Clone the repository
```bash
git clone [repository-url]
cd twisted-roots-salon
```

2. Install dependencies
```bash
npm install
```

3. Environment Setup
Create a .env.local file with your Supabase credentials:
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Database Setup
Set up the following tables in your Supabase database:

* customers - Customer information
* staff_members - Staff profiles and availability
* services - Service catalog
* appointments - Appointment records
* work_in_requests - Work-in appointment requests
* gallery_images - Stylist photo galleries


5. Start the application
```bash
npm start
```

## 🎯 Usage
### Admin Access

* Login: Use credentials ```twistedroots / weLoveTammyJean:)```
* Dashboard: View real-time salon metrics and pending requests
* Staff Management: Add/edit staff with custom schedules
* Service Management: Manage service catalog and pricing
* Appointments: Create call-in appointments and manage bookings

### Stylist Portal

* Login: Select your name and use password ```stylist123```
* Schedule: View and manage your appointments
* Work-In Requests: Approve or modify customer requests
* Gallery: Upload and manage your portfolio photos

### Customer Booking

* Service Selection: Browse available services with pricing
* Stylist Choice: View stylist profiles and galleries
* Time Selection: Real-time availability checking
* Work-In Requests: Request flexible appointment times
* Confirmation: Automated notification system

## 🛠️ Technical Architecture
### Frontend Stack

* React 18 with TypeScript for type safety
* Tailwind CSS for responsive styling
* Lucide React for consistent iconography
* Custom hooks for data management and state

### Backend Integration

* Supabase for database and real-time features
* Custom notification service for SMS/email
* Time slot validation to prevent double-bookings
* Database helpers with error handling

### Key Components

* SalonManagementSystem: Main application controller
* useProductionDataManagement: Data layer with CRUD operations
* timeSlotUtils: Appointment scheduling and conflict resolution
* Modal components for forms and interactions
* Notification system with auto-dismissal

### State Management

* React hooks for local state
* Custom data management hook for database operations
* Real-time updates through Supabase integration
* Optimistic UI updates with error handling

## 📱 Features Deep Dive
### Smart Scheduling

* Double-booking prevention with time slot validation
* Generates available times based on staff schedules
* Handles service duration and buffer times
* Real-time availability updates

### Work-In Request System

* Customers can request flexible appointments
* Staff receive notifications for approval
* Two-way communication system
* Alternative time suggestions

### Gallery Management

* Before/after photo support
* Drag-and-drop upload interface
* Image optimization and storage
* Portfolio showcase for customers

### Notification System

* SMS and email support
* Appointment confirmations
* Work-in request notifications
* Cancellation alerts

## 🔧 Configuration
### Staff Availability
Configure staff schedules with:

* Daily availability windows
* Custom hours per day
* Unavailable days
* Special scheduling rules

### Service Management
Set up services with:

* Duration and pricing
* Service categories
* Descriptions and images
* Booking requirements

### Notification Preferences
Configure communication:

* SMS/email templates
* Automatic notifications
* Customer contact preferences
* Staff notification settings

## 🎨 Customization
### Styling

* Tailwind CSS for easy theme customization
* Gradient backgrounds and modern UI
* Responsive design for all devices
* Custom color schemes per user type

### Business Logic

* Configurable appointment durations
* Custom service categories
* Flexible staff scheduling
* Adaptable notification templates

## 🔒 Security
* Environment variable protection
* Input validation and sanitization
* Database security through Supabase RLS
* User authentication and authorization

## 📊 Database Schema
The system uses the following main entities:

* Customers: Contact info and preferences
* Staff Members: Profiles, schedules, and specialties
* Services: Catalog with pricing and duration
* Appointments: Booking records with status tracking
* Work-In Requests: Flexible appointment requests
* Gallery Images: Stylist portfolio management

### 🚀 Deployment
1. Production Build
```bash
npm run build
```

2. Environment Variables
Ensure all production environment variables are set:

* Supabase URL and keys
* Notification service credentials
* Domain and security settings

### 🤝 Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

# 🏆 Development Highlights

This project showcases end-to-end development capabilities:

* Requirements Analysis: Collaborated with salon owner to identify business needs
* System Design: Architected scalable multi-user interface with role-based access
* Database Design: Created normalized schema with efficient relationships
* Frontend Development: Built responsive React application with TypeScript
* Backend Integration: Implemented Supabase integration with real-time features
* UI/UX Design: Designed intuitive interfaces for different user types
* Testing & Debugging: Comprehensive testing and bug resolution
* Deployment: Production deployment and ongoing maintenance

### 🙏 Acknowledgments

Built for Twisted Roots Salon/
Supabase for backend infrastructure/
React and TypeScript communities/
Tailwind CSS for styling framework/


_For support or questions, please contact the developer. To see more of my work, visit https://tammyhartline.tech_
# Test commit
