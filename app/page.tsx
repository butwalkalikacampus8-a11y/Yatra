'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BusFront, Users, MapPin, Clock, Navigation, Smartphone, ArrowRight, Zap, Shield, Star } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function Home() {
  const { currentUser, signOut } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleRoleSwitch = async (role: 'driver' | 'passenger') => {
    if (currentUser) {
      // Sign out first, then redirect to auth with the new role
      await signOut();
      window.location.href = `/auth?role=${role}&switch_role=true`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Hero Section */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 md:pt-32 md:pb-48">
          {/* Badge */}
          <div className="flex justify-center mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-400/20 backdrop-blur-sm">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </div>
              <span className="text-sm font-medium text-cyan-400">Now Live in Butwal</span>
            </div>
          </div>

          {/* Main Heading */}
          <div className="text-center space-y-8 mb-16">
            <h1 className="text-6xl md:text-8xl font-black text-white leading-none tracking-tighter">
              Track Buses.
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Live & Free.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
              Real-time bus tracking for Butwal. No apps, no hassle.
              <br className="hidden md:block" />
              Just open your browser and see where your bus is.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-20">
            {isClient && currentUser ? (
              <>
                <Button
                  size="lg"
                  onClick={() => handleRoleSwitch('passenger')}
                  className="group w-full sm:w-auto h-16 px-10 text-lg font-semibold rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-2xl shadow-cyan-500/50 border-0 transition-all duration-300 hover:scale-105"
                >
                  <Users className="w-6 h-6 mr-3" />
                  Track Your Bus
                  <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  onClick={() => handleRoleSwitch('driver')}
                  variant="outline"
                  className="group w-full sm:w-auto h-16 px-10 text-lg font-semibold rounded-2xl bg-white/5 border-2 border-white/20 text-white hover:bg-white/10 hover:border-white/40 backdrop-blur-sm transition-all duration-300"
                >
                  <BusFront className="w-6 h-6 mr-3" />
                  I'm a Driver
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth?role=passenger">
                  <Button
                    size="lg"
                    className="group w-full sm:w-auto h-16 px-10 text-lg font-semibold rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-2xl shadow-cyan-500/50 border-0 transition-all duration-300 hover:scale-105"
                  >
                    <Users className="w-6 h-6 mr-3" />
                    Track Your Bus
                    <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/auth?role=driver">
                  <Button
                    size="lg"
                    variant="outline"
                    className="group w-full sm:w-auto h-16 px-10 text-lg font-semibold rounded-2xl bg-white/5 border-2 border-white/20 text-white hover:bg-white/10 hover:border-white/40 backdrop-blur-sm transition-all duration-300"
                  >
                    <BusFront className="w-6 h-6 mr-3" />
                    I'm a Driver
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">Live</div>
              <div className="text-sm text-slate-400 font-medium">Updates</div>
            </div>
            <div className="text-center border-x border-white/10">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">Free</div>
              <div className="text-sm text-slate-400 font-medium">Forever</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">Easy</div>
              <div className="text-sm text-slate-400 font-medium">One-Tap</div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="url(#wave-gradient)" />
            <defs>
              <linearGradient id="wave-gradient" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0f172a" stopOpacity="0" />
                <stop offset="1" stopColor="#0f172a" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative bg-slate-950 py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-block mb-6">
              <span className="px-4 py-2 rounded-full bg-blue-500/10 border border-blue-400/20 text-sm font-semibold text-blue-400">
                FEATURES
              </span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
              Built for Nepal
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Every feature designed to make your daily commute smoother
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/20 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Navigation className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Real-Time GPS</h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  See exactly where buses are right now. Updated every 3 seconds with pinpoint accuracy.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Instant Booking</h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  One tap on the map. That's it. No forms, no waiting, no confusion. Just book and go.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">All Routes</h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Devinagar, Tilottama, Manigram, Sunauli. Every major route in Butwal covered.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="group relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700/50 hover:border-green-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-green-500/20 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Live Status</h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Know if you're waiting, picked up, or dropped off. Both drivers and passengers stay informed.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="group relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700/50 hover:border-orange-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/20 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No App Needed</h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Works on any browser. Phone, tablet, computer. No downloads, no storage hassle.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="group relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700/50 hover:border-yellow-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-500/20 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/20 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <BusFront className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Visual Tracking</h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Color-coded bus icons 🚌🚎 make finding your ride instant and intuitive.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="relative bg-gradient-to-b from-slate-950 to-slate-900 py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
              Simple as 1-2-3
            </h2>
            <p className="text-xl text-slate-400">
              Three steps to never miss your bus again
            </p>
          </div>

          <div className="space-y-12">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="flex-shrink-0">
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full animate-pulse"></div>
                  <div className="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center">
                    <span className="text-6xl font-black text-white">1</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-3xl font-bold text-white mb-3">Driver Goes Online</h3>
                <p className="text-xl text-slate-400 leading-relaxed">
                  Bus driver opens the app and starts sharing their location. That's all they need to do.
                </p>
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center">
              <div className="w-1 h-16 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-12">
              <div className="flex-shrink-0">
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full animate-pulse delay-300"></div>
                  <div className="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center">
                    <span className="text-6xl font-black text-white">2</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 text-center md:text-right">
                <h3 className="text-3xl font-bold text-white mb-3">You See the Bus</h3>
                <p className="text-xl text-slate-400 leading-relaxed">
                  The bus appears on your map instantly. Watch it move in real-time as it approaches.
                </p>
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center">
              <div className="w-1 h-16 bg-gradient-to-b from-purple-500 to-green-500 rounded-full"></div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="flex-shrink-0">
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full animate-pulse delay-700"></div>
                  <div className="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center">
                    <span className="text-6xl font-black text-white">3</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-3xl font-bold text-white mb-3">Tap to Book</h3>
                <p className="text-xl text-slate-400 leading-relaxed">
                  Click the bus icon on the map. You're booked. The driver gets notified immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative bg-slate-900 py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-12">
            <div className="flex justify-center gap-2 mb-8">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-8 h-8 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
              Start tracking buses
              <br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                right now
              </span>
            </h2>
            <p className="text-2xl text-slate-300 mb-12">
              Free. Simple. Built for Butwal.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            {isClient && currentUser ? (
              <>
                <Button
                  size="lg"
                  onClick={() => handleRoleSwitch('passenger')}
                  className="group w-full sm:w-auto h-20 px-12 text-xl font-bold rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-2xl shadow-cyan-500/50 transition-all duration-300 hover:scale-105"
                >
                  <Users className="w-7 h-7 mr-3" />
                  Get Started Now
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  onClick={() => handleRoleSwitch('driver')}
                  variant="outline"
                  className="w-full sm:w-auto h-20 px-12 text-xl font-bold rounded-2xl bg-white/5 border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
                >
                  <BusFront className="w-7 h-7 mr-3" />
                  Join as Driver
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth?role=passenger">
                  <Button
                    size="lg"
                    className="group w-full sm:w-auto h-20 px-12 text-xl font-bold rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-2xl shadow-cyan-500/50 transition-all duration-300 hover:scale-105"
                  >
                    <Users className="w-7 h-7 mr-3" />
                    Get Started Now
                    <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
                  </Button>
                </Link>
                <Link href="/auth?role=driver">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-20 px-12 text-xl font-bold rounded-2xl bg-white/5 border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
                  >
                    <BusFront className="w-7 h-7 mr-3" />
                    Join as Driver
                  </Button>
                </Link>
              </>
            )}
          </div>

          <p className="text-slate-500 mt-12 text-sm">
            No credit card required • No app download • Works everywhere
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="relative bg-slate-950 border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <BusFront className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">VehicleTracker Nepal</div>
                <div className="text-sm text-slate-500">Nepal's Vehicle Tracking System</div>
              </div>
            </div>
            <div className="text-sm text-slate-500">
              © 2025 VehicleTracker Nepal. Made By अपरिचित..
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}