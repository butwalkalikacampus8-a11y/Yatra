# YATRA

A real-time bus tracking and booking application built for Butwal, Nepal. This system enables passengers to track buses in real-time, book seats online, and receive proximity notifications, while drivers can manage their routes, update seat availability, and track passenger pickups.

![Next.js](https://img.shields.io/badge/Next.js-16.0.6-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.0-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-12.6.0-orange?style=flat-square&logo=firebase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwind-css)

## ✨ Features

### For Passengers
- 🗺️ **Real-time Bus Tracking** - View live locations of all active buses on an interactive map
- 🎫 **Online Seat Booking** - Book seats in advance with instant confirmation
- 📍 **Proximity Notifications** - Get notified when your bus is approaching your pickup point
- 🚦 **Live Seat Availability** - See real-time seat counts (online booked, offline occupied, available)
- 🚕 **Multi-Vehicle Support** - Track buses, taxis, bikes, and other vehicles
- 💰 **Dynamic Fare Calculation** - Automatic fare calculation based on distance and vehicle type
- 🔔 **Customizable Alerts** - Toggle notifications and vibration settings

### For Drivers
- 🎛️ **Driver Command Center** - Manage your bus status, route, and passengers
- 👥 **Passenger Management** - View and update passenger pickup/dropoff status
- 💺 **Seat Management** - Track online bookings and manually update offline occupancy
- 📊 **Real-time Stats** - Monitor total passengers, available seats, and route progress
- 🔄 **Go Online/Offline** - Control your availability with a single toggle
- 📱 **Mobile-First Design** - Optimized for use on mobile devices while driving

### Technical Highlights
- ⚡ **Real-time Sync** - Firebase Realtime Database for instant updates
- 🎨 **Premium Dark UI** - Modern glassmorphism design with smooth animations
- 🔐 **Secure Authentication** - Firebase Auth with phone/email support
- 🗺️ **Leaflet Maps** - OpenStreetMap integration (no API costs)
- 📱 **Fully Responsive** - Works seamlessly on desktop, tablet, and mobile
- 🎯 **Geofencing** - Proximity detection for arrival notifications

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Realtime Database enabled
- Firebase Authentication enabled (Phone & Email/Password providers)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bus-tracking
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**

   Create a `.env.local` file in the root directory:

   ```env
   # Firebase Client Config
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com

   # Firebase Admin SDK (for API routes)
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Seed Demo Data

To populate the database with demo buses:

```bash
# Via API endpoint
curl -X POST http://localhost:3000/api/seed

# Or use the seed button in the UI (development mode only)
```

## 📁 Project Structure

```
bus-tracking/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── bookings/        # Booking management
│   │   └── buses/           # Bus data endpoints
│   ├── auth/                # Authentication pages
│   ├── driver/              # Driver dashboard
│   ├── passenger/           # Passenger dashboard
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── driver/              # Driver-specific components
│   ├── passenger/           # Passenger-specific components
│   ├── map/                 # Map components
│   ├── shared/              # Shared components
│   └── ui/                  # UI primitives (shadcn/ui)
├── lib/                     # Utilities and configurations
│   ├── contexts/            # React contexts
│   ├── utils/               # Utility functions
│   ├── firebase.ts          # Firebase client config
│   ├── firebaseAdmin.ts     # Firebase Admin SDK
│   ├── firebaseDb.ts        # Database operations
│   ├── types.ts             # TypeScript types
│   └── constants.ts         # App constants
└── public/                  # Static assets
```

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **Database**: [Firebase Realtime Database](https://firebase.google.com/docs/database)
- **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth)
- **Maps**: [Leaflet](https://leafletjs.com/) + [React Leaflet](https://react-leaflet.js.org/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)

## 🎨 Design System

The application features a premium dark theme with:
- **Glassmorphism effects** for modern UI elements
- **Gradient accents** (cyan, blue, purple, emerald)
- **Smooth animations** and micro-interactions
- **Mobile-first responsive design**
- **Accessibility-focused** components

## 🔒 Security Features

- Session-based authentication with HTTP-only cookies
- Firebase Admin SDK for secure server-side operations
- Role-based access control (Driver/Passenger)
- Input validation with Zod schemas
- Secure booking system with seat reservation timeouts

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🚧 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Environment Modes

- **Development**: Full features, seed data available
- **Production**: Seed endpoints disabled, optimized build

## 🤝 Contributing

This is a hackathon/competition project. For collaboration:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and intended for competition/demonstration purposes.

## 🙏 Acknowledgments

- Built for Butwal, Nepal transportation system
- Designed for hackathon/competition demonstration
- Uses OpenStreetMap data via Leaflet (no API costs)
- UI inspired by modern web design best practices

## 📞 Support

For issues or questions, please open an issue in the repository.

---


