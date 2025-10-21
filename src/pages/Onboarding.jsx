
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
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #E8DEFF 0%, #D4E8FF 50%, #D4F4DD 100%)'
      }}>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #E8DEFF 0%, #D4E8FF 50%, #D4F4DD 100%)'
    }}>
      <style>{`
        .clay-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          box-shadow: 
            8px 8px 20px rgba(0, 0, 0, 0.08),
            -8px -8px 20px rgba(255, 255, 255, 0.9),
            inset 2px 2px 8px rgba(255, 255, 255, 0.5),
            inset -2px -2px 8px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }
        
        .clay-button {
          background: rgba(255, 255, 255, 0.8);
          border-radius: 16px;
          box-shadow: 
            4px 4px 12px rgba(0, 0, 0, 0.08),
            -4px -4px 12px rgba(255, 255, 255, 0.9),
            inset 1px 1px 4px rgba(255, 255, 255, 0.5);
          transition: all 0.3s ease;
          border: none;
        }

        .clay-button:hover {
          box-shadow: 
            2px 2px 8px rgba(0, 0, 0, 0.1),
            -2px -2px 8px rgba(255, 255, 255, 1),
            inset 2px 2px 6px rgba(0, 0, 0, 0.05);
        }

        .role-card-selected {
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 
            inset 3px 3px 8px rgba(0, 0, 0, 0.08),
            inset -2px -2px 6px rgba(255, 255, 255, 0.8);
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
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)'
            }}>
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 bg-clip-text text-transparent mb-3">
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
            className={`clay-card p-8 text-left transition-all ${
              selectedRole === 'student' ? 'role-card-selected ring-4 ring-purple-400' : ''
            }`}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{
                background: 'linear-gradient(135deg, #43e97b, #38f9d7)'
              }}>
                <GraduationCap className="w-8 h-8 text-white" />
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
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Follow learning roadmaps
              </li>
            </ul>

            {selectedRole === 'student' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-green-400 to-blue-400 text-white text-center font-medium"
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
            className={`clay-card p-8 text-left transition-all ${
              selectedRole === 'teacher' ? 'role-card-selected ring-4 ring-blue-400' : ''
            }`}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)'
              }}>
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
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Post assignments
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Grade student submissions
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Award badges and points
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Create learning roadmaps
              </li>
            </ul>

            {selectedRole === 'teacher' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-400 to-blue-400 text-white text-center font-medium"
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
          className="clay-button w-full px-8 py-4 font-bold text-lg rounded-2xl transition-all"
          style={{
            background: selectedRole 
              ? 'linear-gradient(135deg, #667eea, #764ba2)'
              : '#E5E7EB', // Tailwind gray-200
            color: selectedRole ? 'white' : '#9CA3AF', // Tailwind gray-400
            cursor: selectedRole && !submitting ? 'pointer' : 'not-allowed'
          }}
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
