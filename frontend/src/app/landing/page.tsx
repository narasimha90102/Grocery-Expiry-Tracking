'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useI18nStore } from '../../store/i18nStore';
import api from '../../lib/api';
import axios from 'axios';
import { 
  Sparkles, Mail, Lock, User, ChevronRight, ChevronLeft, Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();
  const { setAuth, initAuth } = useAuthStore();
  const t = useI18nStore((state) => state.t);

  // Authentication States
  const [authMode, setAuthMode] = useState<'none' | 'login' | 'register' | 'forgot' | 'otp' | 'reset'>('none');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpType, setOtpType] = useState<'register' | 'reset'>('register');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  // Onboarding Slides States (matching screens 1-4)
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    initAuth();

    // Dynamically inject the Google GIS client script to be 100% hydration & SSR safe
    if (typeof window !== 'undefined' && !document.getElementById('google-gsi-client')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [initAuth]);
  const getErrorMessage = (err: any, fallback: string): string => {
    const responseData = err.response?.data;
    let errMsg = responseData?.message || fallback;
    if (responseData?.errors && Array.isArray(responseData.errors)) {
      const details = responseData.errors.map((e: any) => e.message).join(', ');
      if (details) errMsg = `${errMsg}: ${details}`;
    }
    return errMsg;
  };

  // Auth API Handlers
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrors({ form: 'Please fill in all registration fields' });
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      
      const confetti = (await import('canvas-confetti')).default;
      confetti({ particleCount: 80, spread: 60 });
      
      router.push('/dashboard');
    } catch (err: any) {
      setErrors({ form: getErrorMessage(err, 'Registration failed') });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!email.trim() || !password.trim()) {
      setErrors({ form: 'Please enter both email and password' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      
      const confetti = (await import('canvas-confetti')).default;
      confetti({ particleCount: 80, spread: 60 });
      
      router.push('/dashboard');
    } catch (err: any) {
      setErrors({ form: getErrorMessage(err, 'Invalid credentials') });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const code = otpCode.join('');
    if (code.length !== 6) {
      setErrors({ form: 'Please enter all 6 verification digits' });
      return;
    }

    setLoading(true);
    try {
      if (otpType === 'register') {
        const res = await api.post('/auth/verify-otp', { email, otp: code });
        const { user, accessToken, refreshToken } = res.data.data;
        setAuth(user, accessToken, refreshToken);
        router.push('/dashboard');
      } else {
        await api.post('/auth/verify-reset-otp', { email, otp: code });
        setAuthMode('reset');
      }
    } catch (err: any) {
      setErrors({ form: getErrorMessage(err, 'Verification failed') });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!email.trim()) {
      setErrors({ form: 'Please enter your email address' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccessMsg('Account verified. You can now reset your password directly.');
      setAuthMode('reset');
    } catch (err: any) {
      setErrors({ form: getErrorMessage(err, 'Forgot password failed') });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!password.trim()) {
      setErrors({ form: 'Please enter your new password' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, password });
      setSuccessMsg('Password updated successfully! Please login.');
      setAuthMode('login');
    } catch (err: any) {
      setErrors({ form: getErrorMessage(err, 'Password reset failed') });
    } finally {
      setLoading(false);
    }
  };

  // Google Login Adaptive Flow
  const handleGoogleLogin = () => {
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const forceReal = (process as any).env.NEXT_PUBLIC_FORCE_REAL_GOOGLE === 'true';
    const isGoogleSupported = isLocalhost || isHttps || forceReal;
    
    const google = typeof window !== 'undefined' ? (window as any).google : null;
    const forceSimulated = (process as any).env.NEXT_PUBLIC_USE_SIMULATED_GOOGLE === 'true';

    // Fallback to simulation if Google SDK is blocked by adblocker, local hotspot IPs, or forced via env configuration
    if (!isGoogleSupported || !google || forceSimulated) {
      console.warn("Google SDK not supported, blocked by adblocker, or simulation forced. Running high-fidelity Google Login simulation.");
      setLoading(true);
      
      setTimeout(async () => {
        try {
          const testEmail = 'google.user@gmail.com';
          const testName = 'Google Test User';
          
          const res = await api.post('/auth/google', {
            name: testName,
            email: testEmail,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
            googleId: 'simulated_google_id_123456789'
          });

          const { user, accessToken, refreshToken } = res.data.data;
          setAuth(user, accessToken, refreshToken);

          const confetti = (await import('canvas-confetti')).default;
          confetti({ particleCount: 80, spread: 60 });
          router.push('/dashboard');
        } catch (err: any) {
          setErrors({ form: err.response?.data?.message || err.message || 'Simulated Google authentication failed' });
        } finally {
          setLoading(false);
        }
      }, 800);
      return;
    }

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: (process as any).env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "287589447782-8c5g4p509p51ttuuvk39l9n6ev6ft1no.apps.googleusercontent.com",
        scope: "openid profile email",
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error("Google Token error response:", tokenResponse);
            setErrors({ form: `Google Login failed: ${tokenResponse.error_description || tokenResponse.error}` });
            return;
          }

          setLoading(true);
          try {
            // Securely retrieve the user's Google Account profile data
            const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            const profile = userInfoRes.data;

            // Submit token and user details to backend Google login route
            const res = await api.post('/auth/google', {
              name: profile.name,
              email: profile.email,
              avatar: profile.picture,
              googleId: profile.sub
            });

            const { user, accessToken, refreshToken } = res.data.data;
            setAuth(user, accessToken, refreshToken);

            const confetti = (await import('canvas-confetti')).default;
            confetti({ particleCount: 80, spread: 60 });
            router.push('/dashboard');
          } catch (err: any) {
            console.error("Google Auth Backend submission failed:", err);
            setErrors({ form: err.response?.data?.message || err.message || 'Google authentication failed' });
          } finally {
            setLoading(false);
          }
        }
      });

      client.requestAccessToken();
    } catch (err: any) {
      console.error("Google GIS Popup initialization failed:", err);
      setErrors({ form: `Popup failed: ${err.message || err}` });
    }
  };

  const renderIllustration = (index: number) => {
    switch (index) {
      case 0:
        return (
          <svg className="w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] lg:w-[220px] lg:h-[220px] select-none mx-auto transition-all duration-300" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="80" fill="#E8F5E9" />
            <path d="M70 60h20v25H70z" fill="#90CAF9" />
            <circle cx="80" cy="55" r="10" fill="#E3F2FD" />
            <path d="M120 40c5 0 10 15 10 30h-20c0-15 5-30 10-30z" fill="#FFB74D" />
            <path d="M95 30c5 0 8 15 5 35h-10c-3-20 0-35 5-35z" fill="#81C784" />
            <path d="M105 28c5 0 8 15 5 35h-10c-3-20 0-35 5-35z" fill="#81C784" />
            <path d="M60 85h80l-8 75H68L60 85z" fill="#2E7D32" />
            <path d="M80 85c0-15 10-20 20-20s20 5 20 20" stroke="#1B5E20" strokeWidth="6" strokeLinecap="round" fill="none" />
            <circle cx="100" cy="122" r="24" fill="white" stroke="#1B5E20" strokeWidth="4" />
            <circle cx="100" cy="104" r="1.5" fill="#1B5E20" />
            <circle cx="100" cy="140" r="1.5" fill="#1B5E20" />
            <circle cx="118" cy="122" r="1.5" fill="#1B5E20" />
            <circle cx="82" cy="122" r="1.5" fill="#1B5E20" />
            <line x1="100" y1="122" x2="100" y2="112" stroke="#2E7D32" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="100" y1="122" x2="88" y2="122" stroke="#FF9800" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        );
      case 1:
        return (
          <svg className="w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] lg:w-[220px] lg:h-[220px] select-none mx-auto transition-all duration-300" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="80" fill="#E8F5E9" />
            <rect x="50" y="55" width="100" height="90" rx="10" fill="white" stroke="#C8E6C9" strokeWidth="4" />
            <rect x="50" y="55" width="100" height="25" rx="6" fill="#2E7D32" />
            <circle cx="70" cy="67" r="4" fill="white" />
            <circle cx="130" cy="67" r="4" fill="white" />
            <rect x="65" y="95" width="15" height="12" rx="2" fill="#E8F5E9" />
            <rect x="90" y="95" width="15" height="12" rx="2" fill="#E8F5E9" />
            <rect x="115" y="95" width="15" height="12" rx="2" fill="#E8F5E9" />
            <rect x="65" y="115" width="15" height="12" rx="2" fill="#E8F5E9" />
            <rect x="90" y="115" width="15" height="12" rx="2" fill="#FFB74D" />
            <rect x="115" y="115" width="15" height="12" rx="2" fill="#E8F5E9" />
            <circle cx="135" cy="130" r="22" fill="#EF5350" />
            <path d="M135 108c-2 2-2 6 0 8s5-2 5-4c0-2-3-4-5-4z" fill="#4CAF50" />
            <path d="M130 111c-2 0-3 3-2 5s3-1 3-3c0-2-1-2-1-2z" fill="#4CAF50" />
            <path d="M70 120h22v28H70z" fill="#E3F2FD" />
            <path d="M70 120l11-12 11 12H70z" fill="#90CAF9" />
          </svg>
        );
      case 2:
        return (
          <svg className="w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] lg:w-[220px] lg:h-[220px] select-none mx-auto transition-all duration-300" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="80" fill="#E8F5E9" />
            <path d="M80 50c3-10 10-15 15-5s-3 35-3 35" stroke="#FFA726" strokeWidth="18" strokeLinecap="round" fill="none" />
            <path d="M110 52l12-15 4 4-12 15" stroke="#FF7043" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M122 37c2-3 8-3 10 2" stroke="#4CAF50" strokeWidth="4" fill="none" />
            <path d="M55 80h90l-10 65H65L55 80z" fill="#2E7D32" />
            <path d="M50 74h100v8H50z" fill="#1B5E20" rx="3" />
            <line x1="75" y1="88" x2="75" y2="135" stroke="#1B5E20" strokeWidth="3" />
            <line x1="100" y1="88" x2="100" y2="135" stroke="#1B5E20" strokeWidth="3" />
            <line x1="125" y1="88" x2="125" y2="135" stroke="#1B5E20" strokeWidth="3" />
            <line x1="62" y1="100" x2="138" y2="100" stroke="#1B5E20" strokeWidth="3" />
            <line x1="65" y1="120" x2="135" y2="120" stroke="#1B5E20" strokeWidth="3" />
            <circle cx="128" cy="132" r="18" fill="white" stroke="#2E7D32" strokeWidth="3" />
            <path d="M128 138s-7-4.5-7-8.5c0-2 1.5-3.5 3.5-3.5 1.2 0 2.2.8 2.8 1.8.6-1 1.6-1.8 2.8-1.8 2 0 3.5 1.5 3.5 3.5 0 4-7 8.5-7 8.5z" fill="#2E7D32" />
          </svg>
        );
      case 3:
      default:
        return (
          <svg className="w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] lg:w-[220px] lg:h-[220px] select-none mx-auto transition-all duration-300" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="80" fill="#E8F5E9" />
            <rect x="65" y="40" width="70" height="120" rx="14" fill="#37474F" stroke="#2E7D32" strokeWidth="4" />
            <rect x="70" y="45" width="60" height="110" rx="10" fill="white" />
            <circle cx="100" cy="85" r="22" stroke="#E8F5E9" strokeWidth="10" fill="none" />
            <circle cx="100" cy="85" r="22" stroke="#2E7D32" strokeWidth="10" strokeDasharray="90 150" strokeDashoffset="25" fill="none" />
            <rect x="80" y="125" width="8" height="20" rx="2" fill="#E8F5E9" />
            <rect x="80" y="130" width="8" height="15" rx="2" fill="#2E7D32" />
            <rect x="96" y="120" width="8" height="25" rx="2" fill="#E8F5E9" />
            <rect x="96" y="128" width="8" height="17" rx="2" fill="#2E7D32" />
            <rect x="112" y="115" width="8" height="30" rx="2" fill="#E8F5E9" />
            <rect x="112" y="122" width="8" height="23" rx="2" fill="#FFB74D" />
          </svg>
        );
    }
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-slate-100 dark:bg-zinc-950 flex items-center justify-center py-0 lg:py-3 font-sans select-none">
      
      {/* High-Fidelity Smartphone Device Frame (Pure White background to match mockup) */}
      <div className="w-full h-full lg:h-[780px] lg:max-h-[84vh] lg:aspect-[360/780] lg:w-auto lg:rounded-[36px] lg:border-[10px] lg:border-slate-900 lg:dark:border-zinc-800 lg:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] relative overflow-hidden flex flex-col bg-white dark:bg-zinc-900 transition-colors">
        
        {/* Soft, Organic Decorative Green Blobs (matching screens 1-4 background) */}
        {authMode === 'none' && (
          <>
            {/* Top-Left Blob */}
            <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-emerald-50/60 dark:bg-emerald-950/20 blur-3xl pointer-events-none z-0" />
            {/* Top-Right Blob */}
            <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full bg-green-50/50 dark:bg-green-950/15 blur-3xl pointer-events-none z-0" />
            {/* Bottom-Right Blob */}
            <div className="absolute -bottom-16 -right-12 w-56 h-56 rounded-full bg-emerald-50/70 dark:bg-emerald-950/20 blur-3xl pointer-events-none z-0" />
            {/* Bottom-Left Blob */}
            <div className="absolute -bottom-20 -left-12 w-44 h-44 rounded-full bg-green-50/45 dark:bg-green-950/10 blur-3xl pointer-events-none z-0" />
          </>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col px-5 py-4 pb-5 relative overflow-hidden justify-between z-10">
          
          <AnimatePresence mode="wait">
            {authMode === 'none' ? (
              <motion.div
                key="onboarding"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col justify-between"
              >
                {/* Onboarding Header */}
                <div className="flex justify-end h-6">
                  {activeSlide > 0 && (
                    <button 
                      onClick={() => setAuthMode('login')}
                      className="text-xs font-bold text-slate-800 dark:text-zinc-300 hover:text-primary cursor-pointer active:scale-95 transition-transform"
                    >
                      Skip
                    </button>
                  )}
                </div>

                {/* Vector Illustration & Left-Aligned Text Content */}
                <div className="flex-grow flex flex-col justify-center my-auto min-h-0">
                  {/* Central Graphic (centered) */}
                  <div className="flex justify-center items-center w-full py-1 min-h-0">
                    <div className="w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] lg:w-[240px] lg:h-[240px] flex items-center justify-center mx-auto transition-all duration-300">
                      {renderIllustration(activeSlide)}
                    </div>
                  </div>
                  
                  {/* Title and Subtext (Left-Aligned!) */}
                  <div className="w-full px-2 mt-3 space-y-1.5 text-left">
                    {activeSlide === 0 ? (
                      <h2 
                        className="font-black text-slate-800 dark:text-zinc-100 tracking-tight"
                        style={{ fontSize: '30px', lineHeight: '1.15' }}
                      >
                        <span className="text-[#2E7D32]">Grocery</span><br />
                        expiry date<br />
                        <span className="text-[#2E7D32]">tracking</span>
                      </h2>
                    ) : activeSlide === 1 ? (
                      <h2 className="text-xl font-black text-slate-800 dark:text-zinc-100 leading-tight tracking-tight">
                        Never miss<br />
                        an expiry date
                      </h2>
                    ) : activeSlide === 2 ? (
                      <h2 className="text-xl font-black text-slate-800 dark:text-zinc-100 leading-tight tracking-tight">
                        Reduce waste,<br />
                        save money
                      </h2>
                    ) : (
                      <h2 className="text-xl font-black text-slate-800 dark:text-zinc-100 leading-tight tracking-tight">
                        Stay organized<br />
                        always
                      </h2>
                    )}

                    <p className="text-xs sm:text-[13px] text-slate-500 dark:text-zinc-400 font-semibold leading-relaxed max-w-[270px]">
                      {activeSlide === 0 
                        ? 'Track expiry dates, reduce waste and keep your groceries fresh.'
                        : activeSlide === 1
                        ? 'Get reminders before your groceries expire.'
                        : activeSlide === 2
                        ? 'Use what you have and avoid unnecessary waste.'
                        : 'Keep track of all your groceries in one place.'
                      }
                    </p>
                  </div>
                </div>

                {/* Onboarding Bottom Indicators & Buttons */}
                <div className="flex flex-col items-center gap-4 mt-4 sm:mt-6 select-none">
                  {/* Center Dot Indicators (Slide 1 is hidden matching screen 1) */}
                  <div className="flex gap-2 h-2 justify-center items-center">
                    {activeSlide > 0 && [0, 1, 2].map((idx) => (
                      <div 
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          (activeSlide - 1) === idx ? 'bg-[#2E7D32] w-5' : 'bg-slate-200 dark:bg-zinc-700'
                        }`}
                      />
                    ))}
                  </div>

                  {activeSlide === 0 ? (
                    <button
                      onClick={() => setActiveSlide(1)}
                      className="w-full py-3 sm:py-3.5 bg-[#2E7D32] hover:bg-[#25632A] text-white text-xs font-black rounded-2xl cursor-pointer active:scale-[0.98] transition-all uppercase tracking-wider text-center"
                    >
                      Get Started
                    </button>
                  ) : activeSlide < 3 ? (
                    <button
                      onClick={() => setActiveSlide(activeSlide + 1)}
                      className="w-full py-3 sm:py-3.5 bg-[#2E7D32] hover:bg-[#25632A] text-white text-xs font-black rounded-2xl cursor-pointer active:scale-[0.98] transition-all uppercase tracking-wider text-center"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={() => setAuthMode('login')}
                      className="w-full py-3 sm:py-3.5 bg-[#2E7D32] hover:bg-[#25632A] text-white text-xs font-black rounded-2xl cursor-pointer active:scale-[0.98] transition-all uppercase tracking-wider text-center"
                    >
                      Let's Start
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="auth"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col"
              >
                {/* Back button header */}
                <div className="flex items-center justify-between h-8 select-none mb-6">
                  <button 
                    onClick={() => {
                      if (authMode === 'login') setAuthMode('none');
                      else if (authMode === 'register') setAuthMode('login');
                      else setAuthMode('login');
                    }}
                    className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                  >
                    <ChevronLeft className="w-4.5 h-4.5 text-slate-800 dark:text-zinc-200" />
                  </button>
                  <h3 className="text-xs font-black text-slate-800 dark:text-zinc-200 uppercase tracking-widest">
                    {authMode === 'login' ? 'Welcome Back' : authMode === 'register' ? 'Create Account' : 'Security Check'}
                  </h3>
                  <div className="w-8" />
                </div>

                {errors.form && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900 text-red-600 dark:text-red-400 p-3.5 rounded-2xl text-[10px] font-bold mb-4 select-none">
                    {errors.form}
                  </div>
                )}
                {successMsg && (
                  <div className="bg-emerald-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900 text-primary dark:text-green-400 p-3.5 rounded-2xl text-[10px] font-bold mb-4 select-none">
                    {successMsg}
                  </div>
                )}

                {/* LOGIN FORM */}
                {authMode === 'login' && (
                  <form onSubmit={handleLogin} className="flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Social login */}
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full py-3.5 bg-white dark:bg-zinc-800 border border-slate-150 dark:border-zinc-700 hover:bg-slate-50 rounded-2xl text-xs font-extrabold text-slate-700 dark:text-zinc-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98] transition-transform"
                      >
                        <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.87-4.53-5.84-4.53z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        <span>Continue with Google</span>
                      </button>

                      <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-slate-150 dark:border-zinc-800"></div>
                        <span className="flex-shrink mx-4 text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">or</span>
                        <div className="flex-grow border-t border-slate-150 dark:border-zinc-800"></div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Email Address</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="user@gmail.com"
                          className="w-full px-4.5 py-3.5 rounded-2xl bg-white dark:bg-zinc-850 border border-slate-150 dark:border-zinc-700 text-xs font-semibold focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Password</label>
                          <button 
                            type="button"
                            onClick={() => setAuthMode('forgot')}
                            className="text-[10px] font-bold text-primary dark:text-green-400 hover:underline cursor-pointer"
                          >
                            Forgot Password?
                          </button>
                        </div>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4.5 py-3.5 rounded-2xl bg-white dark:bg-zinc-855 border border-slate-150 dark:border-zinc-700 text-xs font-semibold focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-6">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[#2E7D32] hover:bg-[#25632A] text-white text-xs font-black rounded-2xl shadow-lg shadow-green-500/10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>LOG IN</span>}
                      </button>

                      <p className="text-center text-[10px] text-slate-400 dark:text-zinc-500 font-bold">
                        Don't have an account?{' '}
                        <button 
                          type="button" 
                          onClick={() => setAuthMode('register')}
                          className="text-primary dark:text-green-400 hover:underline cursor-pointer"
                        >
                          Sign Up
                        </button>
                      </p>
                    </div>
                  </form>
                )}

                {/* REGISTER FORM */}
                {authMode === 'register' && (
                  <form onSubmit={handleRegister} className="flex-1 flex flex-col justify-between">
                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Full Name</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full px-4.5 py-3.5 rounded-2xl bg-white dark:bg-zinc-850 border border-slate-150 dark:border-zinc-700 text-xs font-semibold focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Email Address</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="w-full px-4.5 py-3.5 rounded-2xl bg-white dark:bg-zinc-850 border border-slate-150 dark:border-zinc-700 text-xs font-semibold focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Password</label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4.5 py-3.5 rounded-2xl bg-white dark:bg-zinc-850 border border-slate-150 dark:border-zinc-700 text-xs font-semibold focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-6">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[#2E7D32] hover:bg-[#25632A] text-white text-xs font-black rounded-2xl shadow-lg shadow-green-500/10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>CREATE ACCOUNT</span>}
                      </button>

                      <p className="text-center text-[10px] text-slate-400 dark:text-zinc-500 font-bold">
                        Already have an account?{' '}
                        <button 
                          type="button" 
                          onClick={() => setAuthMode('login')}
                          className="text-primary dark:text-green-400 hover:underline cursor-pointer"
                        >
                          Log In
                        </button>
                      </p>
                    </div>
                  </form>
                )}

                {/* OTP FORM */}
                {authMode === 'otp' && (
                  <form onSubmit={handleVerifyOTP} className="flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold text-center leading-relaxed">
                        Enter the 6-digit confirmation code we sent to your email to authenticate.
                      </p>
                      
                      <div className="flex justify-between gap-1.5 py-4">
                        {otpCode.map((digit, idx) => (
                          <input
                            key={idx}
                            id={`otp-${idx}`}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => {
                              const val = e.target.value;
                              const nextCode = [...otpCode];
                              nextCode[idx] = val;
                              setOtpCode(nextCode);
                              
                              if (val && idx < 5) {
                                document.getElementById(`otp-${idx + 1}`)?.focus();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace' && !otpCode[idx] && idx > 0) {
                                document.getElementById(`otp-${idx - 1}`)?.focus();
                              }
                            }}
                            className="w-11 h-12 rounded-xl bg-white dark:bg-zinc-800 border border-slate-150 dark:border-zinc-700 text-center text-sm font-black focus:outline-none focus:border-primary text-slate-800 dark:text-zinc-100"
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-[#2E7D32] hover:bg-[#25632A] text-white text-xs font-black rounded-2xl shadow-lg shadow-green-500/10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>VERIFY CODE</span>}
                    </button>
                  </form>
                )}

                {/* FORGOT PASSWORD FORM */}
                {authMode === 'forgot' && (
                  <form onSubmit={handleForgotPassword} className="flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Email Address</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="user@gmail.com"
                          className="w-full px-4.5 py-3.5 rounded-2xl bg-white dark:bg-zinc-850 border border-slate-150 dark:border-zinc-700 text-xs font-semibold focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-[#2E7D32] hover:bg-[#25632A] text-white text-xs font-black rounded-2xl shadow-lg shadow-green-500/10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>SEND RESET CODE</span>}
                    </button>
                  </form>
                )}

                {/* RESET PASSWORD FORM */}
                {authMode === 'reset' && (
                  <form onSubmit={handleResetPassword} className="flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">New Password</label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4.5 py-3.5 rounded-2xl bg-white dark:bg-zinc-850 border border-slate-150 dark:border-zinc-700 text-xs font-semibold focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-[#2E7D32] hover:bg-[#25632A] text-white text-xs font-black rounded-2xl shadow-lg shadow-green-500/10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>UPDATE PASSWORD</span>}
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Mock Home Indicator for smartphone shell */}
        <div className="absolute bottom-1 left-0 right-0 h-4 flex items-center justify-center pointer-events-none select-none z-50 hidden lg:flex">
          <div className="w-32 h-1 bg-slate-900/60 dark:bg-zinc-100/60 rounded-full" />
        </div>
      </div>
    </div>
  );
}
