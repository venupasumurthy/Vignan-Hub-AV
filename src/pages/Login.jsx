
import React, { useState } from "react";
import { vignan } from "@/api/vignanClient";
import { createPageUrl } from "@/utils";
import { User, Lock, ArrowRight, Sparkles, Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState(""); // For signup
    const [isSignUp, setIsSignUp] = useState(false); // Toggle state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(""); // Success message state
    const [role, setRole] = useState("student"); // Role selection state
    const [confirmPassword, setConfirmPassword] = useState(""); // Confirm password state

    // Forgot Password State
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [resetStep, setResetStep] = useState('email'); // 'email' or 'password'

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            if (!email || !password) {
                throw new Error("Please enter both email and password");
            }


            if (isSignUp) {
                // Validate Confirm Password
                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match");
                }

                // Handle Signup
                // Generate a name from email if not provided
                const generatedName = fullName || email.split('@')[0];
                // Use selected role for signup
                await vignan.auth.signup(email, password, generatedName, role);

                // Explicitly logout to force the user to sign in
                await vignan.auth.logout();

                // Switch back to Login mode and show success message
                setIsSignUp(false);
                setSuccess("Account created successfully! Please sign in.");
                setPassword(""); // Clear password for security/UX
                setLoading(false); // Reset loading state
            } else {
                // Handle Login
                await vignan.auth.login(email, password);

                // Directly redirect to Dashboard
                window.location.href = createPageUrl('Dashboard');
            }

        } catch (err) {
            console.error("Auth error:", err);
            setError(err.message || "Authentication failed. Please try again.");
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (resetStep === 'email') {
                if (!resetEmail) throw new Error("Please enter your email");
                // Optional: Verify email exists before next step (simulated by just moving next in mock)
                setResetStep('password');
                setLoading(false);
            } else {
                if (!newPassword) throw new Error("Please enter a new password");
                await vignan.auth.resetPassword(resetEmail, newPassword);
                setSuccess("Password reset successfully! Please login.");
                setIsForgotPassword(false);
                setResetStep('email');
                setResetEmail("");
                setNewPassword("");
                setEmail(resetEmail); // Pre-fill login email
                setLoading(false);
            }
        } catch (err) {
            console.error("Reset error:", err);
            setError(err.message || "Failed to reset password.");
            setLoading(false);
        }
    };



    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <style>{`
        .clay-card {
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        .clay-input {
          background: #eef2ff; /* Light blue/indigo background */
          border-radius: 12px;
          border: 1px solid transparent;
          padding: 12px 16px;
          transition: all 0.2s;
          color: #0f172a;
          font-weight: 500;
        }
        .clay-input:focus {
           outline: none;
           background: #ffffff;
           border-color: #cbd5e1;
           ring: 2px solid #e2e8f0;
        }
        
        .btn-primary {
            background: #0f172a;
            color: white;
            border-radius: 12px;
            font-weight: 600;
            transition: transform 0.1s;
        }
        .btn-primary:active {
            transform: scale(0.98);
        }
      `}</style>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="clay-card p-10 max-w-[450px] w-full bg-white relative"
            >

                {/* Back Button for Signup or Forgot Password */}
                {(isSignUp || isForgotPassword) && (
                    <button
                        onClick={() => {
                            setIsSignUp(false);
                            setIsForgotPassword(false);
                            setError("");
                            setSuccess("");
                            setResetStep('email');
                        }}
                        className="absolute top-10 left-10 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium transition-colors"
                    >
                        <ArrowRight className="w-5 h-5 rotate-180" />
                        Back to sign in
                    </button>
                )}

                <div className="text-center mb-8 mt-4">
                    {!isSignUp && (
                        <div className="w-32 h-32 mx-auto mb-6 flex flex-col items-center justify-center">
                            <img src="/logo.jpg" alt="Vignan Hub" className="w-full h-full object-contain rounded-full border-4 border-white shadow-md" />
                        </div>
                    )}

                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        {isForgotPassword ? "Reset Password" : (isSignUp ? "Create your account" : "Welcome to Vignan Hub")}
                    </h1>

                    {!isSignUp && !isForgotPassword && (
                        <p className="text-slate-500 font-medium">
                            Sign in to continue
                        </p>
                    )}
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 flex items-center gap-2">
                        <div className="w-1 h-4 bg-red-500 rounded-full" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 rounded-xl bg-green-50 text-green-600 text-sm font-medium border border-green-100 flex items-center gap-2">
                        <div className="w-1 h-4 bg-green-500 rounded-full" />
                        {success}
                    </div>
                )}

                {/* Social Login - Only on Login Page */}
                {!isSignUp && (
                    <>
                        <button
                            type="button"
                            className="w-full py-3.5 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-3 mb-8 bg-white"
                            onClick={() => alert("Google Login is disabled in this demo.")}
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Continue with Google
                        </button>

                        <div className="relative flex items-center justify-center mb-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <span className="relative z-10 bg-white px-4 text-sm font-bold text-slate-400 uppercase tracking-widest">or</span>
                        </div>
                    </>
                )}



                {/* Forgot Password Flow */}
                {isForgotPassword ? (
                    <form onSubmit={handleResetPassword} className="space-y-5">
                        <div className="space-y-5">
                            {resetStep === 'email' ? (
                                <div className="space-y-2 text-center">
                                    <label className="text-sm font-bold text-slate-700">Enter your email</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            className="clay-input w-full !pl-14"
                                            placeholder="Enter your email"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500">We'll verify your account exists.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 text-center">
                                    <label className="text-sm font-bold text-slate-700">New Password</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="clay-input w-full !pl-14"
                                            placeholder="Enter new password"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-xl font-bold text-white shadow-lg transform transition hover:translate-y-[-1px] hover:shadow-xl active:scale-95 flex items-center justify-center gap-2 btn-primary mt-8"
                        >
                            {loading ? 'Processing...' : (resetStep === 'email' ? 'Next' : 'Reset Password')}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-5">

                        {/* Inputs */}
                        <div className="space-y-5">
                            {isSignUp && (
                                <div className="space-y-2 text-center">
                                    <label className="text-sm font-bold text-slate-700">Full Name</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="clay-input w-full !pl-14"
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2 text-center">
                                <label className="text-sm font-bold text-slate-700">Email</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="clay-input w-full !pl-14"
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 text-center">
                                <label className="text-sm font-bold text-slate-700">Password</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="clay-input w-full !pl-14"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Sign Up Specific Fields */}
                            {isSignUp && (
                                <div className="space-y-4">
                                    <div className="space-y-2 text-center">
                                        <label className="text-sm font-bold text-slate-700">Confirm Password</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                                                <Lock className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="clay-input w-full !pl-14"
                                                placeholder="Re-enter password"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-center">
                                        <label className="text-sm font-bold text-slate-700">I am a</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setRole("student")}
                                                className={`p-3 rounded-xl border font-bold text-sm transition-all ${role === "student"
                                                    ? "bg-blue-50 border-blue-500 text-blue-700"
                                                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                                    }`}
                                            >
                                                Student
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRole("teacher")}
                                                className={`p-3 rounded-xl border font-bold text-sm transition-all ${role === "teacher"
                                                    ? "bg-purple-50 border-purple-500 text-purple-700"
                                                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                                    }`}
                                            >
                                                Teacher
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-xl font-bold text-white shadow-lg transform transition hover:translate-y-[-1px] hover:shadow-xl active:scale-95 flex items-center justify-center gap-2 btn-primary mt-8"
                        >
                            {loading ? (isSignUp ? 'Creating Account...' : 'Signing in...') : (
                                isSignUp ? 'Create account' : 'Sign in'
                            )}
                        </button>

                        {!isSignUp && (
                            <div className="flex items-center justify-between mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsForgotPassword(true);
                                        setError("");
                                        setSuccess("");
                                    }}
                                    className="text-sm font-bold text-slate-500 hover:text-slate-800"
                                >
                                    Forgot password?
                                </button>
                                <div className="flex items-center gap-1 text-sm">
                                    <span className="text-slate-500">Need an account?</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSignUp(true);
                                            setError("");
                                            setSuccess("");
                                        }}
                                        className="font-bold text-slate-900 hover:underline"
                                    >
                                        Sign up
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                )}
            </motion.div>
        </div>
    );
}
