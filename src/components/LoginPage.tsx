import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/auth';
import { AuthService, INITIAL_USERS } from '../services/authService';
import { EmailService } from '../services/emailService';
import { 
  ShieldCheck, 
  Car, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  DollarSign,
  UserCheck,
  Building2,
  Lock,
  Mail,
  Phone,
  LogIn,
  Sun,
  Moon
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ 
  onLoginSuccess, 
  theme = 'dark',
  onToggleTheme,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Sign In state
  const [signInEmail, setSignInEmail] = useState<string>('tanmayrajaura28@gmail.com');
  const [signInPassword, setSignInPassword] = useState<string>('admin123');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sign Up state: 2 Dedicated Sections: "Owner of a car" & "Customer to rent a car"
  const [accountType, setAccountType] = useState<'vehicle_owner' | 'renter'>('vehicle_owner');
  const [fullName, setFullName] = useState<string>('');
  const [signUpEmail, setSignUpEmail] = useState<string>('');
  const [signUpPassword, setSignUpPassword] = useState<string>('');
  const [phone, setPhone] = useState<string>('+91 ');
  const [upiId, setUpiId] = useState<string>('');
  const [drivingLicense, setDrivingLicense] = useState<string>('');

  // Forgot / Reset Password state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState<boolean>(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetOtpCode, setResetOtpCode] = useState<string>('');
  const [resetCustomPassword, setResetCustomPassword] = useState<string>('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState<string>('');
  const [resetStatus, setResetStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Secure Link Reset States (When user clicks link received on email)
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkResetEmail, setLinkResetEmail] = useState<string>('');
  const [isTokenVerified, setIsTokenVerified] = useState<boolean>(false);
  const [tokenVerifying, setTokenVerifying] = useState<boolean>(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [linkNewPassword, setLinkNewPassword] = useState<string>('');
  const [linkConfirmPassword, setLinkConfirmPassword] = useState<string>('');
  const [linkSubmitStatus, setLinkSubmitStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmittingLinkReset, setIsSubmittingLinkReset] = useState<boolean>(false);

  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const tokenParam = searchParams.get('reset_token');
      const emailParam = searchParams.get('email');

      if (tokenParam && emailParam) {
        setLinkToken(tokenParam);
        setLinkResetEmail(emailParam);
        setTokenVerifying(true);

        EmailService.verifyResetToken(tokenParam, emailParam)
          .then((res) => {
            setTokenVerifying(false);
            if (res.valid) {
              setIsTokenVerified(true);
            } else {
              setTokenError(res.error || 'This password reset link is invalid or has expired. Please request a new link.');
            }
          })
          .catch((err) => {
            setTokenVerifying(false);
            setTokenError(err.message || 'Failed to verify reset link');
          });
      }
    } catch {
      // Nominal
    }
  }, []);

  // Quick 1-click login
  const handleQuickLogin = async (user: UserProfile) => {
    setIsSubmitting(true);
    setSignInError(null);
    const res = await AuthService.login(user.email, user.password || 'admin123');
    setIsSubmitting(false);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setSignInError(res.error || 'Login failed. Please check your password.');
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail || !signInPassword) {
      setSignInError('Please enter both your email and password.');
      return;
    }
    setIsSubmitting(true);
    setSignInError(null);
    const res = await AuthService.login(signInEmail, signInPassword);
    setIsSubmitting(false);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setSignInError(res.error || 'Login failed. Please check your email or password.');
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !signUpEmail.trim() || !signUpPassword) {
      setSignInError('Please fill in your name, email, and password.');
      return;
    }
    setIsSubmitting(true);
    setSignInError(null);
    const res = await AuthService.register({
      name: fullName,
      email: signUpEmail,
      password: signUpPassword,
      phone,
      role: accountType,
      upiId: accountType === 'vehicle_owner' ? upiId : undefined,
      drivingLicense: accountType === 'renter' ? drivingLicense : undefined,
    });
    setIsSubmitting(false);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setSignInError(res.error || 'Could not create account.');
    }
  };

  // 1. Dispatch Reset Link & 6-Digit Code to Email
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetStatus({ message: 'Please enter your registered email address.', type: 'error' });
      return;
    }

    setIsResetting(true);
    setResetStatus(null);
    const res = await AuthService.requestPasswordResetLink(resetEmail);
    setIsResetting(false);

    if (res.success) {
      setResetStatus({ 
        message: 'A 6-digit verification code and secure 1-click link have been sent to your email inbox! Please check your email.', 
        type: 'success' 
      });
      setResetStep('verify');
    } else {
      setResetStatus({ message: res.message, type: 'error' });
    }
  };

  // 1b. Verify 6-Digit Code & Set New Customized Password directly from modal
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtpCode.trim()) {
      setResetStatus({ message: 'Please enter the 6-digit verification code sent to your email.', type: 'error' });
      return;
    }
    if (!resetCustomPassword) {
      setResetStatus({ message: 'Please enter your new customized password.', type: 'error' });
      return;
    }
    if (resetCustomPassword.length < 6) {
      setResetStatus({ message: 'New password must be at least 6 characters long.', type: 'error' });
      return;
    }
    if (resetCustomPassword !== resetConfirmPassword) {
      setResetStatus({ message: 'New password and confirm password do not match.', type: 'error' });
      return;
    }

    setIsResetting(true);
    setResetStatus(null);
    const res = await AuthService.completePasswordResetFromLink(resetOtpCode.trim(), resetEmail, resetCustomPassword);
    setIsResetting(false);

    if (res.success) {
      setResetStatus({
        message: 'Password successfully updated! Signing you into your dashboard...',
        type: 'success',
      });
      setTimeout(() => {
        setForgotPasswordOpen(false);
        setResetStep('request');
        if (res.user) {
          onLoginSuccess(res.user);
        } else {
          setSignInEmail(resetEmail);
          setSignInPassword(resetCustomPassword);
          setMode('signin');
        }
      }, 1500);
    } else {
      setResetStatus({ message: res.message, type: 'error' });
    }
  };

  // 2. Complete Password Reset (Only accessible when opened via email reset link)
  const handleCompleteLinkResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkToken) {
      setLinkSubmitStatus({ message: 'Missing password reset token. Please request a new link.', type: 'error' });
      return;
    }
    if (!linkNewPassword) {
      setLinkSubmitStatus({ message: 'Please enter your new customized password.', type: 'error' });
      return;
    }
    if (linkNewPassword.length < 6) {
      setLinkSubmitStatus({ message: 'New password must be at least 6 characters long.', type: 'error' });
      return;
    }
    if (linkNewPassword !== linkConfirmPassword) {
      setLinkSubmitStatus({ message: 'New password and confirm password do not match.', type: 'error' });
      return;
    }

    setIsSubmittingLinkReset(true);
    setLinkSubmitStatus(null);
    const res = await AuthService.completePasswordResetFromLink(linkToken, linkResetEmail, linkNewPassword);
    setIsSubmittingLinkReset(false);

    if (res.success) {
      setLinkSubmitStatus({
        message: 'Password successfully updated! Redirecting you into your account...',
        type: 'success',
      });
      // Clean query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname);

      setTimeout(() => {
        setLinkToken(null);
        if (res.user) {
          onLoginSuccess(res.user);
        } else {
          setSignInEmail(linkResetEmail);
          setSignInPassword(linkNewPassword);
          setMode('signin');
        }
      }, 1500);
    } else {
      setLinkSubmitStatus({ message: res.message, type: 'error' });
    }
  };

  const switchToLoginWithExistingEmail = () => {
    setSignInEmail(signUpEmail);
    setSignInError(null);
    setMode('signin');
  };

  const switchToSignUpWithEnteredEmail = () => {
    setSignUpEmail(signInEmail);
    setSignInError(null);
    setMode('signup');
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-neutral-950 text-neutral-100'
    }`}>
      
      {/* Top Header */}
      <header className={`border-b backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3.5 transition-colors duration-300 ${
        theme === 'dark' ? 'border-neutral-800 bg-neutral-950/80 text-neutral-100' : 'border-slate-200 bg-white/80 text-slate-900 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-lg">
              व
            </div>
            <div>
              <span className={`text-base font-bold tracking-tight block leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                VahaanFlow
              </span>
              <span className={`text-[10px] font-mono ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>
                Easy Car Rental & Fleet System for India
              </span>
            </div>
          </div>

          {/* Theme Switch Button (Top Right Corner) */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center shrink-0 shadow-sm ${
                theme === 'dark'
                  ? 'bg-neutral-900 border-neutral-800 text-amber-400 hover:bg-neutral-800 hover:border-neutral-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 stroke-[2]" />
              ) : (
                <Moon className="h-4 w-4 stroke-[2]" />
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center flex-1">
        
        {/* Left Column: Simple overview for Indian users */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono transition-colors duration-300 ${
              theme === 'light' ? 'border-emerald-300 bg-emerald-500/10 text-emerald-800 font-semibold' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            }`}>
              <span>SIMPLE 2-ROLE SYSTEM</span>
            </div>

            <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight transition-colors duration-300 ${
              theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}>
              Car rental & fleet management, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">made very easy</span>.
            </h1>

            <p className={`text-sm leading-relaxed transition-colors duration-300 ${
              theme === 'light' ? 'text-slate-600' : 'text-neutral-400'
            }`}>
              Login as <strong className={theme === 'light' ? 'text-slate-900 font-bold' : 'text-white'}>Admin</strong> to operate the fleet, register as an <strong className={theme === 'light' ? 'text-slate-900 font-bold' : 'text-white'}>Owner of a car</strong> to earn rental income, or register as a <strong className={theme === 'light' ? 'text-slate-900 font-bold' : 'text-white'}>Customer to rent a car</strong> for self-drive trips.
            </p>
          </div>

          {/* Role Cards in plain words */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className={`rounded-xl border p-3.5 space-y-1.5 transition-all duration-300 ${
              theme === 'light' ? 'border-slate-200 bg-white shadow-sm text-slate-800' : 'border-neutral-800 bg-neutral-900/60 text-neutral-100'
            }`}>
              <div className={`flex items-center gap-1.5 text-xs font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>1. Admin</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                Manages cars, returns, damages & owner payouts. (Login only)
              </p>
            </div>

            <div className={`rounded-xl border p-3.5 space-y-1.5 transition-all duration-300 ${
              theme === 'light' ? 'border-slate-200 bg-white shadow-sm text-slate-800' : 'border-neutral-800 bg-neutral-900/60 text-neutral-100'
            }`}>
              <div className={`flex items-center gap-1.5 text-xs font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <Car className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>2. Owner of a Car</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                Give your car for rent, block dates, track bookings & earnings.
              </p>
            </div>

            <div className={`rounded-xl border p-3.5 space-y-1.5 transition-all duration-300 ${
              theme === 'light' ? 'border-slate-200 bg-white shadow-sm text-slate-800' : 'border-neutral-800 bg-neutral-900/60 text-neutral-100'
            }`}>
              <div className={`flex items-center gap-1.5 text-xs font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <KeyRound className="h-4 w-4 text-blue-500 shrink-0" />
                <span>3. Customer</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                Rent & self-drive verified cars for trips with per-km rates.
              </p>
            </div>
          </div>

          {/* Quick 1-Click Switch Demo Accounts */}
          <div className={`rounded-xl border p-4 space-y-2.5 transition-all duration-300 ${
            theme === 'light' ? 'border-slate-200 bg-white/70 shadow-sm text-slate-800' : 'border-neutral-800 bg-neutral-900/40 text-neutral-100'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${theme === 'light' ? 'text-slate-900' : 'text-neutral-200'}`}>
                ⚡ Quick Demo Accounts (1-Click Login)
              </span>
              <span className={`text-[10px] font-mono ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>
                Click to test any role
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin(INITIAL_USERS[0])}
                className={`text-left p-2.5 rounded-lg border transition-all duration-300 group cursor-pointer ${
                  theme === 'light' 
                    ? 'border-slate-200 bg-slate-50/50 hover:border-emerald-500/50 hover:bg-slate-100/50' 
                    : 'border-neutral-800 bg-neutral-950 hover:border-emerald-500/50 hover:bg-neutral-900'
                }`}
              >
                <div className={`flex items-center justify-between text-xs font-bold group-hover:text-emerald-600 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                  <span className="truncate">Vikram (Admin)</span>
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${theme === 'light' ? 'text-emerald-700 font-semibold' : 'text-emerald-400'}`}>Platform Admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin(INITIAL_USERS[1])}
                className={`text-left p-2.5 rounded-lg border transition-all duration-300 group cursor-pointer ${
                  theme === 'light' 
                    ? 'border-slate-200 bg-slate-50/50 hover:border-emerald-500/50 hover:bg-slate-100/50' 
                    : 'border-neutral-800 bg-neutral-950 hover:border-emerald-500/50 hover:bg-neutral-900'
                }`}
              >
                <div className={`flex items-center justify-between text-xs font-bold group-hover:text-emerald-600 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                  <span className="truncate">Suresh (Owner)</span>
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${theme === 'light' ? 'text-teal-700 font-semibold' : 'text-teal-400'}`}>Owner of a Car</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin(INITIAL_USERS[2])}
                className={`text-left p-2.5 rounded-lg border transition-all duration-300 group cursor-pointer ${
                  theme === 'light' 
                    ? 'border-slate-200 bg-slate-50/50 hover:border-emerald-500/50 hover:bg-slate-100/50' 
                    : 'border-neutral-800 bg-neutral-950 hover:border-emerald-500/50 hover:bg-neutral-900'
                }`}
              >
                <div className={`flex items-center justify-between text-xs font-bold group-hover:text-emerald-600 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                  <span className="truncate">Anita (EV Fleet)</span>
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${theme === 'light' ? 'text-teal-700 font-semibold' : 'text-teal-400'}`}>Owner of a Car</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin(INITIAL_USERS[3] || {
                  id: 'usr-renter-01',
                  name: 'Rahul Sharma',
                  email: 'rahul.sharma@gmail.com',
                  password: 'customer123',
                  phone: '+91 99887 76655',
                  role: 'renter',
                  activeViewMode: 'renter',
                  createdAt: new Date().toISOString(),
                })}
                className={`text-left p-2.5 rounded-lg border transition-all duration-300 group cursor-pointer ${
                  theme === 'light' 
                    ? 'border-slate-200 bg-slate-50/50 hover:border-blue-500/50 hover:bg-slate-100/50' 
                    : 'border-neutral-800 bg-neutral-950 hover:border-blue-500/50 hover:bg-neutral-900'
                }`}
              >
                <div className={`flex items-center justify-between text-xs font-bold group-hover:text-blue-600 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                  <span className="truncate">Rahul (Customer)</span>
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${theme === 'light' ? 'text-blue-700 font-semibold' : 'text-blue-400'}`}>Customer to Rent</div>
              </button>
            </div>
            <p className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>
              * Note: Admins sign in directly. New users can create accounts under "Owner of a car" or "Customer to rent a car".
            </p>
          </div>
        </div>

        {/* Right Column: Sign In & Sign Up Form */}
        <div className="lg:col-span-6 flex justify-center">
          <div className={`w-full max-w-md rounded-2xl border p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6 transition-all duration-300 ${
            theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-neutral-800 bg-neutral-900/90 text-neutral-100'
          }`}>
            
            {/* Mode Switcher */}
            <div className={`flex rounded-xl p-1 border transition-colors duration-300 ${
              theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-neutral-950 border-neutral-800'
            }`}>
              <button
                type="button"
                onClick={() => { setMode('signin'); setSignInError(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'signin'
                    ? (theme === 'light' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'bg-neutral-800 text-white shadow-sm')
                    : (theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-neutral-400 hover:text-white')
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setSignInError(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'signup'
                    ? (theme === 'light' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'bg-neutral-800 text-white shadow-sm')
                    : (theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-neutral-400 hover:text-white')
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Banner with 1-Click Action */}
            {signInError && (
              <div className={`rounded-xl border p-3.5 text-xs space-y-2 transition-all duration-300 ${
                theme === 'light' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
              }`}>
                <div className="flex items-start gap-2">
                  <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`} />
                  <span className="leading-snug font-medium">{signInError}</span>
                </div>

                {/* Case 1: If email already exists during sign up, jump to login */}
                {signInError.toLowerCase().includes('already exists') && (
                  <button
                    type="button"
                    onClick={switchToLoginWithExistingEmail}
                    className={`w-full mt-1.5 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-bold text-xs transition-colors shadow-sm cursor-pointer ${
                      theme === 'light' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
                    }`}
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Click here to Login with this email</span>
                  </button>
                )}

                {/* Case 2: If email does not exist during login, jump to create account */}
                {(signInError.toLowerCase().includes('not exist') || signInError.toLowerCase().includes('create an account')) && (
                  <button
                    type="button"
                    onClick={switchToSignUpWithEnteredEmail}
                    className={`w-full mt-1.5 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-bold text-xs transition-colors shadow-sm cursor-pointer ${
                      theme === 'light' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
                    }`}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>Click here to Create an Account with this email</span>
                  </button>
                )}
              </div>
            )}

            {/* Mode: Sign In */}
            {mode === 'signin' && (
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                  }`}>Email ID</label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-2.5 h-4 w-4 transition-colors duration-300 ${
                      theme === 'light' ? 'text-slate-400' : 'text-neutral-500'
                    }`} />
                    <input
                      type="email"
                      required
                      value={signInEmail}
                      onChange={e => setSignInEmail(e.target.value)}
                      placeholder="e.g. admin@vahaanflow.in or suresh.patel@fleet.in"
                      className={`w-full rounded-lg border pl-9 pr-3 py-2 text-xs transition-all duration-300 focus:outline-none ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                          : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-medium transition-colors duration-300 ${
                      theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                    }`}>Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(signInEmail);
                        setForgotPasswordOpen(true);
                      }}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-2.5 h-4 w-4 transition-colors duration-300 ${
                      theme === 'light' ? 'text-slate-400' : 'text-neutral-500'
                    }`} />
                    <input
                      type="password"
                      required
                      value={signInPassword}
                      onChange={e => setSignInPassword(e.target.value)}
                      placeholder="Enter password"
                      className={`w-full rounded-lg border pl-9 pr-3 py-2 text-xs transition-all duration-300 focus:outline-none ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                          : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-600/10 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <span>Logging in...</span> : <span>Login to Account</span>}
                </button>
              </form>
            )}

            {/* Mode: Sign Up with 2 Distinct Sections: "Owner of a car" vs "Customer to rent a car" */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                {/* Section Toggle */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-800' : 'text-neutral-300'
                  }`}>
                    Select Account Type:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Section 1: Owner of a car */}
                    <button
                      type="button"
                      onClick={() => {
                        setAccountType('vehicle_owner');
                        setSignInError(null);
                      }}
                      className={`relative p-3 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                        accountType === 'vehicle_owner'
                          ? (theme === 'light' ? 'border-emerald-600 bg-emerald-50 text-slate-900 ring-1 ring-emerald-600/35 shadow-sm' : 'border-emerald-500 bg-emerald-500/15 text-white ring-1 ring-emerald-500/40 shadow-sm')
                          : (theme === 'light' ? 'border-slate-200 bg-white text-slate-500 hover:border-slate-300' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200')
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Car className={`h-4 w-4 shrink-0 ${accountType === 'vehicle_owner' ? 'text-emerald-500' : 'text-neutral-400'}`} />
                        <span>Owner of a car</span>
                      </div>
                      <div className={`text-[10px] mt-1 leading-snug ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                        Give car for rent & earn money
                      </div>
                      {accountType === 'vehicle_owner' && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                    </button>

                    {/* Section 2: Customer to rent a car */}
                    <button
                      type="button"
                      onClick={() => {
                        setAccountType('renter');
                        setSignInError(null);
                      }}
                      className={`relative p-3 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                        accountType === 'renter'
                          ? (theme === 'light' ? 'border-blue-600 bg-blue-50 text-slate-900 ring-1 ring-blue-600/35 shadow-sm' : 'border-blue-500 bg-blue-500/15 text-white ring-1 ring-blue-500/40 shadow-sm')
                          : (theme === 'light' ? 'border-slate-200 bg-white text-slate-500 hover:border-slate-300' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200')
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <KeyRound className={`h-4 w-4 shrink-0 ${accountType === 'renter' ? 'text-blue-500' : 'text-neutral-400'}`} />
                        <span>Customer to rent a car</span>
                      </div>
                      <div className={`text-[10px] mt-1 leading-snug ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                        Rent & drive cars for trips
                      </div>
                      {accountType === 'renter' && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Section Specific Header Banner */}
                {accountType === 'vehicle_owner' ? (
                  <div className={`rounded-xl border p-3 text-xs transition-all duration-300 ${
                    theme === 'light' ? 'border-emerald-200 bg-emerald-50/50 text-slate-800 shadow-sm' : 'border-emerald-500/30 bg-emerald-500/10 text-neutral-300'
                  }`}>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                      <Car className="h-4 w-4" />
                      <span>Section: Owner of a car</span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                      List your vehicles, track daily earnings, block dates for personal use, and get direct UPI payouts.
                    </p>
                  </div>
                ) : (
                  <div className={`rounded-xl border p-3 text-xs transition-all duration-300 ${
                    theme === 'light' ? 'border-blue-200 bg-blue-50/50 text-slate-800 shadow-sm' : 'border-blue-500/30 bg-blue-500/10 text-neutral-300'
                  }`}>
                    <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mb-1">
                      <KeyRound className="h-4 w-4" />
                      <span>Section: Customer to rent a car</span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                      Browse verified cars, rent instantly with clear per-km pricing, and manage your trips easily.
                    </p>
                  </div>
                )}

                <div>
                  <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                  }`}>Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder={accountType === 'vehicle_owner' ? "e.g. Ramesh Patel (Car Owner)" : "e.g. Rahul Sharma (Customer)"}
                    className={`w-full rounded-lg border px-3 py-2 text-xs transition-all duration-300 focus:outline-none ${
                      theme === 'light'
                        ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                        : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                      theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                    }`}>Email ID</label>
                    <input
                      type="email"
                      required
                      value={signUpEmail}
                      onChange={e => setSignUpEmail(e.target.value)}
                      placeholder="user@domain.com"
                      className={`w-full rounded-lg border px-3 py-2 text-xs transition-all duration-300 focus:outline-none ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                          : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                      theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                    }`}>Phone Number</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className={`w-full rounded-lg border px-3 py-2 text-xs transition-all duration-300 focus:outline-none ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                          : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                  }`}>Create Password</label>
                  <input
                    type="password"
                    required
                    value={signUpPassword}
                    onChange={e => setSignUpPassword(e.target.value)}
                    placeholder="Enter password"
                    className={`w-full rounded-lg border px-3 py-2 text-xs transition-all duration-300 focus:outline-none ${
                      theme === 'light'
                        ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                        : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                    }`}
                  />
                </div>

                {/* Section Specific Input Fields */}
                {accountType === 'vehicle_owner' ? (
                  <div>
                    <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                      theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                    }`}>
                      UPI ID for Rental Earnings (Optional)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      placeholder="e.g. yourname@okaxis"
                      className={`w-full rounded-lg border px-3 py-2 text-xs transition-all duration-300 focus:outline-none ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                          : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                ) : (
                  <div>
                    <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                      theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                    }`}>
                      Driving Licence Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={drivingLicense}
                      onChange={e => setDrivingLicense(e.target.value)}
                      placeholder="e.g. DL-0420210012345"
                      className={`w-full rounded-lg border px-3 py-2 text-xs transition-all duration-300 focus:outline-none ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                          : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-blue-500'
                      }`}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs transition-colors shadow-lg disabled:opacity-50 cursor-pointer ${
                    accountType === 'vehicle_owner'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/10'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/10'
                  }`}
                >
                  {isSubmitting ? (
                    <span>Creating Account...</span>
                  ) : accountType === 'vehicle_owner' ? (
                    <span className="flex items-center gap-1.5">
                      <Car className="h-3.5 w-3.5" />
                      <span>Register as Owner of a car</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Register as Customer to rent a car</span>
                    </span>
                  )}
                </button>

                <p className={`text-center text-[10px] pt-1 transition-colors duration-300 ${
                  theme === 'light' ? 'text-slate-500' : 'text-neutral-500'
                }`}>
                  * Note: Platform Admin accounts are managed privately and must sign in using assigned administrator credentials.
                </p>
              </form>
            )}

          </div>
        </div>

      </main>

      {/* 1. Request Password Reset Link & 6-Digit Code Modal */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 transition-all duration-300 ${
            theme === 'light' ? 'border-slate-200 bg-white text-slate-900 shadow-2xl' : 'border-neutral-800 bg-neutral-900 text-neutral-100 shadow-2xl'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${theme === 'light' ? 'border-slate-100' : 'border-neutral-800'}`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <Mail className="h-4 w-4 text-emerald-500" />
                <span>{resetStep === 'request' ? 'Password Reset Verification' : 'Verify Code & Set Password'}</span>
              </h3>
              <button 
                onClick={() => {
                  setForgotPasswordOpen(false);
                  setResetStep('request');
                  setResetStatus(null);
                }} 
                className={`${theme === 'light' ? 'text-slate-400 hover:text-slate-700' : 'text-neutral-400 hover:text-white'} cursor-pointer`}
              >
                ✕
              </button>
            </div>

            {resetStatus && (
              <div className={`p-3 rounded-lg text-xs border ${
                resetStatus.type === 'success' 
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' 
                  : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
              }`}>
                {resetStatus.message}
              </div>
            )}

            {resetStep === 'request' ? (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                <div className={`rounded-xl border p-3 text-xs transition-all duration-300 ${
                  theme === 'light' ? 'border-emerald-200 bg-emerald-50/50 text-slate-800 shadow-sm' : 'border-emerald-500/20 bg-emerald-500/5 text-neutral-300'
                }`}>
                  <p className="leading-relaxed text-[11px]">
                    🔒 <strong>Security Policy:</strong> We will send a 6-digit verification code and a 1-click link to your email. You can enter the code below to set your new password.
                  </p>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>Your Registered Email ID</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="e.g. user@domain.com"
                    className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none ${
                      theme === 'light'
                        ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                        : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className={`flex justify-end gap-2 pt-2 border-t ${theme === 'light' ? 'border-slate-100' : 'border-neutral-800'}`}>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(false)}
                    className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                      theme === 'light' ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isResetting ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtpSubmit} className="space-y-3">
                <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                  Enter the 6-digit code received on <strong className={theme === 'light' ? 'text-slate-900' : 'text-white'}>{resetEmail}</strong>:
                </p>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>6-Digit Code from Email</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtpCode}
                    onChange={e => setResetOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 582194"
                    className={`w-full text-center tracking-widest font-mono text-base font-bold rounded-lg border px-3 py-2 focus:outline-none ${
                      theme === 'light'
                        ? 'border-slate-300 bg-slate-50 text-emerald-800 focus:border-emerald-600'
                        : 'border-neutral-800 bg-neutral-950 text-emerald-400 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>Create New Password</label>
                  <input
                    type="password"
                    required
                    value={resetCustomPassword}
                    onChange={e => setResetCustomPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none ${
                      theme === 'light'
                        ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                        : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={resetConfirmPassword}
                    onChange={e => setResetConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none ${
                      theme === 'light'
                        ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                        : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className={`flex items-center justify-between pt-2 border-t ${theme === 'light' ? 'border-slate-100' : 'border-neutral-800'}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep('request');
                      setResetStatus(null);
                    }}
                    className={`text-xs underline cursor-pointer ${theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-neutral-400 hover:text-white'}`}
                  >
                    ← Re-enter email
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isResetting ? 'Verifying...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 2. Secure Reset Password Modal (Opened via Email Link) */}
      {linkToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 transition-all duration-300 ${
            theme === 'light' ? 'border-slate-200 bg-white text-slate-900 shadow-2xl' : 'border-emerald-500/40 bg-neutral-900 text-neutral-100 shadow-2xl'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${theme === 'light' ? 'border-slate-100' : 'border-neutral-800'}`}>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Create New Customized Password</h3>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Verified via Secure Email Link</div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setLinkToken(null);
                  window.history.replaceState({}, document.title, window.location.pathname);
                }} 
                className={`${theme === 'light' ? 'text-slate-400 hover:text-slate-700' : 'text-neutral-400 hover:text-white'} cursor-pointer text-xs`}
              >
                ✕
              </button>
            </div>

            {tokenVerifying && (
              <div className={`py-6 text-center text-xs ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                Verifying secure reset link token...
              </div>
            )}

            {tokenError && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-700 dark:text-red-300 space-y-2">
                <div>{tokenError}</div>
                <button
                  onClick={() => {
                    setLinkToken(null);
                    window.history.replaceState({}, document.title, window.location.pathname);
                    setForgotPasswordOpen(true);
                  }}
                  className="text-[11px] underline text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-white cursor-pointer"
                >
                  Click here to request a fresh reset link
                </button>
              </div>
            )}

            {!tokenVerifying && isTokenVerified && (
              <>
                <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                  You are resetting password for: <strong className={theme === 'light' ? 'text-slate-900' : 'text-white'}>{linkResetEmail}</strong>. Please enter your new customized password below.
                </p>

                {linkSubmitStatus && (
                  <div className={`p-3 rounded-lg text-xs border ${
                    linkSubmitStatus.type === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                  }`}>
                    {linkSubmitStatus.message}
                  </div>
                )}

                <form onSubmit={handleCompleteLinkResetSubmit} className="space-y-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>Enter New Customized Password</label>
                    <input
                      type="password"
                      required
                      value={linkNewPassword}
                      onChange={e => setLinkNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                          : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={linkConfirmPassword}
                      onChange={e => setLinkConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new customized password"
                      className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                          : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  <div className={`flex justify-end gap-2 pt-2 border-t ${theme === 'light' ? 'border-slate-100' : 'border-neutral-800'}`}>
                    <button
                      type="submit"
                      disabled={isSubmittingLinkReset}
                      className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/10 cursor-pointer"
                    >
                      {isSubmittingLinkReset ? 'Updating...' : 'Set New Password & Sign In'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`border-t py-4 text-center text-xs px-4 transition-all duration-300 ${
        theme === 'light' ? 'border-slate-200 bg-white/80 text-slate-500' : 'border-neutral-800/80 bg-neutral-950/60 text-neutral-500'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>VahaanFlow &middot; Simple Vehicle Rental & Fleet System for India</span>
          <span className="font-mono text-[11px]">Strict Data Privacy & Safe Payouts</span>
        </div>
      </footer>

    </div>
  );
};
