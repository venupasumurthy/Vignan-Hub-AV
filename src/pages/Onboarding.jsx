
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { GraduationCap, BookOpen, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function Onboarding() {
  const [user, setUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // If user has already completed onboarding, redirect
      if (currentUser.onboarding_completed) {
        redirectToDashboard(currentUser.account_type);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading user:", error);
      setLoading(false);
    }
  };

  const redirectToDashboard = (accountType) => {
    window.location.href = createPageUrl('Dashboard');
  };

  const handleRoleSelection = async () => {
    if (!selectedRole) return;

    setSubmitting(true);
    try {
      // Update user account type (NOT role - role is platform managed)
      await base44.auth.updateMe({
        account_type: selectedRole,
        onboarding_completed: true,
        points: selectedRole === 'student' ? 0 : undefined,
        enrolled_courses: selectedRole === 'student' ? [] : undefined,
        chosen_roadmaps: selectedRole === 'student' ? [] : undefined,
        badges: selectedRole === 'student' ? [] : undefined
      });

      // Create welcome notification
      const currentUser = await base44.auth.me();
      await base44.entities.Notification.create({
        user_id: currentUser.id,
        message: selectedRole === 'teacher'
          ? "Welcome to Vignan Hub! You're now set up as a Teacher. Start creating courses and engaging with students!"
          : "Welcome to Vignan Hub! You're now set up as a Student. Start exploring courses and begin your learning journey!",
        type: "general",
        read: false
      });

      // Redirect to dashboard
      redirectToDashboard(selectedRole);
    } catch (error) {
      console.error("Error setting role:", error);
      alert("Failed to complete registration. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: '#f8fafc'
    }}>
      <style>{`
        .clay-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
          transition: all 0.3s ease;
        }
        
        .clay-button {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          transition: all 0.3s ease;
          border: 1px solid #e2e8f0;
        }

        .clay-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .role-card-selected {
          background: #f8fafc;
          border-color: #0f172a;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="clay-card p-8 max-w-4xl w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Welcome to Vignan Hub!
          </h1>
          <p className="text-gray-600 text-lg">
            Complete your registration by choosing your role:
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Student Card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedRole('student')}
            className={`clay-card p-8 text-left transition-all ${selectedRole === 'student' ? 'role-card-selected ring-4 ring-purple-400' : ''
              }`}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-8 h-8 text-slate-700" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Sign Up as Student</h3>
                <p className="text-gray-600 text-sm">
                  I want to learn and grow
                </p>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Enroll in courses
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Submit assignments
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Track your progress
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Earn badges and points
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Follow learning roadmaps
              </li>
            </ul>

            {selectedRole === 'student' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-center font-medium"
              >
                Selected ✓
              </motion.div>
            )}
          </motion.button>

          {/* Teacher Card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedRole('teacher')}
            className={`clay-card p-8 text-left transition-all ${selectedRole === 'teacher' ? 'role-card-selected ring-2 ring-slate-900' : ''
              }`}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Sign Up as Teacher</h3>
                <p className="text-gray-600 text-sm">
                  I want to teach and inspire
                </p>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Create and manage courses
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Post assignments
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Grade student submissions
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Award badges and points
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Create learning roadmaps
              </li>
            </ul>

            {selectedRole === 'teacher' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-center font-medium"
              >
                Selected ✓
              </motion.div>
            )}
          </motion.button>
        </div>

        {/* Continue Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={!selectedRole || submitting}
          onClick={handleRoleSelection}
          className={`clay-button w-full px-8 py-4 font-bold text-lg rounded-xl transition-all ${selectedRole && !submitting
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
              Setting up your account...
            </span>
          ) : (
            `Complete Registration as ${selectedRole === 'teacher' ? 'Teacher' : selectedRole === 'student' ? 'Student' : '...'}`
          )}
        </motion.button>

        {/* Footer Note */}
        <p className="text-center text-xs text-gray-500 mt-6">
          You can update your preferences later from your profile settings
        </p>
      </motion.div>
    </div>
  );
}
