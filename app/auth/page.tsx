'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FirebaseError } from 'firebase/app';
import { Bus, User2, Phone, ShieldCheck, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { getFirebaseAuth, signInWithEmail, createUserWithEmail, sendPasswordReset } from '@/lib/firebase';
import { getUserProfile } from '@/lib/firebaseDb';

type Role = 'driver' | 'passenger';
type AuthMethod = 'phone' | 'email';

const mapFirebaseError = (err: unknown) => {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/configuration-not-found':
        return 'Phone authentication is not fully configured. Please enable Phone provider and reCAPTCHA in Firebase console.';
      case 'auth/invalid-phone-number':
        return 'The phone number format looks incorrect. Please double-check and try again.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment before trying again.';
      case 'auth/billing-not-enabled':
        return 'Phone authentication requires Blaze (pay-as-you-go) billing in Firebase.';
      case 'auth/invalid-verification-code':
        return 'Invalid verification code. Please try again.';
      case 'auth/code-expired':
        return 'Verification code has expired. Please request a new one.';
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please sign in instead.';
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/user-not-found':
        return 'No account found with this email. Please sign up first.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check your credentials.';
      default:
        return err.message;
    }
  }
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Something went wrong. Please try again.';
};

const isFirestoreOfflineError = (err: unknown): err is FirebaseError => {
  return (
    err instanceof FirebaseError &&
    (err.code === 'unavailable' || err.message.toLowerCase().includes('client is offline'))
  );
};

const isProfileComplete = (data: any) => {
  if (!data) return false;
  if (data.role === 'driver') {
    return !!(data.name && data.vehicleNumber && data.licenseNumber && data.route);
  }
  if (data.role === 'passenger') {
    return !!(data.name);
  }
  return false;
};

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithPhone, verifyOTP, setRole } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<'role' | 'auth'>('role');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone');
  const [isSignUp, setIsSignUp] = useState(false);

  // Phone auth state
  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Email auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const fullPhone = `+977${phone.replace(/\D/g, '')}`;

  // Auto-select role from URL parameter
  useEffect(() => {
    const roleParam = searchParams.get('role') as Role | null;
    if (roleParam && (roleParam === 'driver' || roleParam === 'passenger')) {
      setSelectedRole(roleParam);
      setStep('auth');
    }
  }, [searchParams]);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setStep('auth');

    // Keep URL in sync with the selected role so links/tabs behave correctly
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set('role', role);
    const query = params.toString();
    router.replace(`/auth${query ? `?${query}` : ''}`, { scroll: false });
  };

  const handleSendOtp = async () => {
    if (isSending || confirmationResult || !selectedRole) {
      return;
    }

    if (!phone || phone.replace(/\D/g, '').length < 8) {
      toast({
        variant: 'destructive',
        title: 'Invalid phone number',
        description: 'Please enter a valid 10-digit Nepali phone number.',
      });
      return;
    }

    try {
      setIsSending(true);
      const result = await signInWithPhone(fullPhone, selectedRole);
      setConfirmationResult(result);
      setOtpOpen(true);
      toast({
        title: 'OTP sent',
        description: `Verification code sent to ${fullPhone}`,
      });
    } catch (err: unknown) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Failed to send OTP',
        description: mapFirebaseError(err),
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (codeOverride?: string) => {
    if (!confirmationResult || !selectedRole || isVerifying) return;

    const codeToVerify = (codeOverride ?? otp).replace(/\D/g, '').slice(0, 6);
    if (codeOverride && codeOverride !== otp) {
      setOtp(codeToVerify);
    }

    if (!codeToVerify || codeToVerify.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid code',
        description: 'Please enter the 6-digit verification code.',
      });
      return;
    }

    let shouldCompleteProfile = false;

    try {
      setIsVerifying(true);
      await verifyOTP(confirmationResult, codeToVerify, selectedRole);

      try {
        // Check if user needs to complete profile (skip if offline)
        const user = getFirebaseAuth().currentUser;
        if (user) {
          const userData = await getUserProfile(user.uid);
          shouldCompleteProfile = !userData || !isProfileComplete(userData);
        }
      } catch (firestoreErr) {
        if (isFirestoreOfflineError(firestoreErr)) {
          console.warn('[Auth] Skipping Firestore profile check (offline).');
          toast({
            title: 'Signed in offline',
            description: 'We will sync your profile once the connection is back.',
          });
        } else {
          throw firestoreErr;
        }
      }

      if (shouldCompleteProfile) {
        router.push(`/auth/profile?role=${selectedRole}`);
        return;
      }

      // Existing user - redirect to dashboard
      const target = selectedRole === 'driver' ? '/driver' : '/passenger';
      router.replace(target);
      toast({
        title: 'Welcome back!',
        description: 'Successfully signed in.',
      });
    } catch (err: unknown) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: mapFirebaseError(err),
      });
      setOtp('');
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-submit OTP when 6 digits are entered
  const handleOtpChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    if (digits.length === 6 && confirmationResult) {
      handleVerifyOtp(digits);
    }
  };

  // Email/Password Authentication
  const handleEmailAuth = async () => {
    if (!selectedRole || isAuthenticating) return;

    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please enter both email and password.',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Weak password',
        description: 'Password must be at least 6 characters.',
      });
      return;
    }

    try {
      setIsAuthenticating(true);

      let userCredential;
      if (isSignUp) {
        // Sign up
        userCredential = await createUserWithEmail(email, password);

        // Register user in backend (for custom claims) - Non-blocking
        let idToken = await userCredential.user.getIdToken();
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              role: selectedRole,
              userData: {
                email: email,
                phone: '',
                name: email.split('@')[0],
              },
            }),
          });

          if (!response.ok) {
            console.warn('Backend registration failed, but user was created in Firebase Auth');
          }
        } catch (err) {
          console.warn('Backend registration error:', err);
        }

        // Create session for the new user (reuse idToken from above)
        await fetch('/api/sessionLogin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, role: selectedRole }),
        });

        // Set role in context
        setRole(selectedRole);

        toast({
          title: 'Account created!',
          description: 'Please complete your profile to continue.',
        });

        // Redirect to profile page to complete setup
        router.push(`/auth/profile?role=${selectedRole}`);
      } else {
        // Sign in
        userCredential = await signInWithEmail(email, password);

        // Create session
        const idToken = await userCredential.user.getIdToken();
        await fetch('/api/sessionLogin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, role: selectedRole }),
        });

        // Check if profile exists (skip if offline)
        let shouldCompleteProfile = false;
        try {
          const userData = await getUserProfile(userCredential.user.uid);
          shouldCompleteProfile = !userData || !isProfileComplete(userData);
        } catch (firestoreErr) {
          if (isFirestoreOfflineError(firestoreErr)) {
            console.warn('[Auth] Skipping Firestore profile check (offline).');
            toast({
              title: 'Signed in offline',
              description: 'We will sync your profile once the connection is back.',
            });
          } else {
            throw firestoreErr;
          }
        }

        if (shouldCompleteProfile) {
          router.push(`/auth/profile?role=${selectedRole}`);
          return;
        }

        // Redirect to dashboard
        const target = selectedRole === 'driver' ? '/driver' : '/passenger';
        router.replace(target);

        toast({
          title: 'Welcome back!',
          description: 'Successfully signed in.',
        });
      }
    } catch (err: unknown) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: isSignUp ? 'Sign up failed' : 'Sign in failed',
        description: mapFirebaseError(err),
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email required',
        description: 'Please enter your email address.',
      });
      return;
    }

    try {
      await sendPasswordReset(email);
      toast({
        title: 'Password reset email sent',
        description: 'Check your inbox for instructions to reset your password.',
      });
    } catch (err: unknown) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Failed to send reset email',
        description: mapFirebaseError(err),
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-2xl space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-400/20 backdrop-blur-sm">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </div>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">Secure Authentication</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
            Welcome to
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Bus Tracker
            </span>
          </h1>

          <p className="text-lg text-slate-300 max-w-md mx-auto">
            {step === 'role'
              ? 'Choose your role to get started'
              : 'Sign in to continue your journey'}
          </p>
        </div>

        {step === 'role' ? (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Driver Card */}
            <div
              onClick={() => handleRoleSelect('driver')}
              className="group cursor-pointer relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-blue-400/50 transition-all duration-300 hover:scale-105">
                <div className="mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/50">
                  <Bus className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 text-center">
                  I'm a Driver
                </h3>
                <p className="text-slate-400 text-center text-sm leading-relaxed">
                  Manage your bus, track passengers, and update your location in real-time
                </p>
              </div>
            </div>

            {/* Passenger Card */}
            <div
              onClick={() => handleRoleSelect('passenger')}
              className="group cursor-pointer relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-cyan-400/50 transition-all duration-300 hover:scale-105">
                <div className="mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/50">
                  <User2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 text-center">
                  I'm a Passenger
                </h3>
                <p className="text-slate-400 text-center text-sm leading-relaxed">
                  Find nearby buses, book seats, and track your ride live
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
              {/* Back Button */}
              <button
                onClick={() => {
                  setStep('role');
                  setPhone('');
                  setEmail('');
                  setPassword('');
                  setOtp('');
                  setConfirmationResult(null);
                }}
                className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <span>←</span>
                <span className="text-sm font-medium">Back</span>
              </button>

              {/* Title */}
              <div className="mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  {selectedRole === 'driver' ? (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/50">
                      <Bus className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/50">
                      <User2 className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white text-center mb-2">
                  {selectedRole === 'driver' ? 'Driver' : 'Passenger'} Sign In
                </h2>
                <p className="text-slate-400 text-center text-sm">
                  Choose your preferred authentication method
                </p>
              </div>

              {/* Auth Method Tabs */}
              <div className="flex gap-3 p-1.5 bg-slate-800/50 rounded-xl mb-8 border border-slate-700/50">
                <button
                  onClick={() => setAuthMethod('phone')}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${authMethod === 'phone'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                >
                  <Phone className="w-4 h-4" />
                  <span>Phone</span>
                </button>
                <button
                  onClick={() => setAuthMethod('email')}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${authMethod === 'email'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </button>
              </div>

              {/* Auth Forms */}
              <div className="space-y-6">
                {authMethod === 'phone' ? (
                  <>
                    {/* Phone Authentication */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-300">
                        Phone Number (Nepal)
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="px-4 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm font-medium text-slate-300 whitespace-nowrap">
                          +977
                        </div>
                        <input
                          type="tel"
                          placeholder="98XXXXXXXX"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="flex-1 px-4 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all text-lg"
                          maxLength={10}
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        We'll send a 6-digit verification code via SMS
                      </p>
                    </div>

                    <button
                      onClick={handleSendOtp}
                      disabled={isSending || !!confirmationResult || phone.length < 8}
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                      {isSending ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          <span>Sending OTP...</span>
                        </>
                      ) : (
                        <>
                          <Phone className="w-5 h-5" />
                          <span>Send Verification Code</span>
                        </>
                      )}
                    </button>

                    {/* reCAPTCHA container (invisible) */}
                    <div id="recaptcha-container" className="h-0 w-0 overflow-hidden" />
                  </>
                ) : (
                  <>
                    {/* Email Authentication */}
                    {/* Sign In / Sign Up Toggle */}
                    <div className="flex gap-3 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <button
                        onClick={() => setIsSignUp(false)}
                        className={`flex-1 px-4 py-2.5 rounded-md font-medium transition-all ${!isSignUp
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-white'
                          }`}
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => setIsSignUp(true)}
                        className={`flex-1 px-4 py-2.5 rounded-md font-medium transition-all ${isSignUp
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-white'
                          }`}
                      >
                        Sign Up
                      </button>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-300">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-300">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {isSignUp && (
                        <p className="text-xs text-slate-500">
                          Minimum 6 characters
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleEmailAuth}
                      disabled={isAuthenticating || !email || !password}
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                      {isAuthenticating ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-5 h-5" />
                          <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                        </>
                      )}
                    </button>

                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="w-full text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-center text-slate-500 max-w-md mx-auto">
          {authMethod === 'phone'
            ? 'By continuing, you agree to receive an SMS for verification. Standard SMS charges may apply.'
            : 'By continuing, you agree to our Terms of Service and Privacy Policy.'}
        </p>
      </div>

      {/* OTP Dialog */}
      <Dialog open={otpOpen} onOpenChange={setOtpOpen}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">Enter Verification Code</DialogTitle>
            <DialogDescription className="text-slate-400">
              We've sent a 6-digit code to{' '}
              <span className="font-medium text-cyan-400">{fullPhone}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => handleOtpChange(e.target.value)}
              className="w-full text-center tracking-[0.5em] text-3xl font-mono h-16 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
              autoFocus
            />
            <button
              onClick={() => handleVerifyOtp()}
              disabled={isVerifying || otp.length !== 6}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isVerifying ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Verifying...
                </>
              ) : (
                'Verify & Continue'
              )}
            </button>
            <button
              onClick={() => {
                setOtpOpen(false);
                setOtp('');
                setConfirmationResult(null);
              }}
              className="w-full h-12 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin text-cyan-500 text-4xl">⏳</div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
