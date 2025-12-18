
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User, Mail, Lock, Save, Shield, AlertCircle, CheckCircle, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [profileData, setProfileData] = useState({
    full_name: "",
    bio: ""
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setProfileData({
        full_name: currentUser.full_name || "",
        bio: currentUser.bio || ""
      });
      setLoading(false);
    } catch (error) {
      console.error("Error loading user:", error);
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await base44.auth.updateMe(profileData);

      setMessage({
        type: "success",
        text: "Profile updated successfully! Refreshing..."
      });

      // Wait a moment to show the success message, then reload to reflect changes everywhere
      setTimeout(() => {
        loadUser();
      }, 1500);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({
        type: "error",
        text: "Failed to update profile. Please try again."
      });
      setSaving(false); // Ensure saving state is reset on error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="clay-card p-8 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-blue-100">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Account Settings
            </h1>
            <p className="text-slate-600">
              Manage your profile and account preferences
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Info Card */}
        <div className="lg:col-span-1">
          <div className="clay-card p-6">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center text-blue-600 bg-blue-100 font-bold text-3xl">
                {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <h3 className="font-bold text-xl text-gray-800 mb-1">{user?.full_name}</h3>
              <p className="text-sm text-gray-600 mb-2">{user?.email}</p>
              <span className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${user?.account_type === 'teacher'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-green-100 text-green-700'
                }`}>
                {user?.account_type === 'teacher' ? 'Teacher' : 'Student'}
              </span>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Member since</span>
                <span className="font-medium text-gray-800">
                  {new Date(user?.created_date || Date.now()).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>

              {user?.account_type === 'teacher' ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Courses Created</span>
                    <span className="font-bold text-purple-600">
                      {/* This will be calculated from courses where teacher_id matches */}
                      -
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Students</span>
                    <span className="font-bold text-blue-600">
                      {/* This will be calculated from enrolled students */}
                      -
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Points</span>
                    <span className="font-bold text-purple-600">{user?.points || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Badges Earned</span>
                    <span className="font-bold text-yellow-600">{user?.badges?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Courses Enrolled</span>
                    <span className="font-bold text-blue-600">{user?.enrolled_courses?.length || 0}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        <div className="lg:col-span-2">
          <div className="clay-card p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Edit Profile</h2>

            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
                  }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="font-medium">{message.text}</span>
              </motion.div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name *
                  </div>
                </label>
                <input
                  type="text"
                  required
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  className="clay-input w-full"
                  placeholder="Enter your full name"
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Your name will be updated across the entire platform
                </p>
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </div>
                </label>
                <input
                  type="email"
                  value={user?.email}
                  disabled
                  className="clay-input w-full opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed. Contact support if you need to update it.
                </p>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio / About Me
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  className="clay-input w-full h-32 resize-none"
                  placeholder={user?.account_type === 'teacher'
                    ? "Share your teaching experience, subjects you teach, and qualifications..."
                    : "Tell us about yourself..."}
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {user?.account_type === 'teacher'
                    ? "Students will see this in your profile"
                    : "This will be visible on your profile"}
                </p>
              </div>

              {/* Account Type (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Account Type
                  </div>
                </label>
                <input
                  type="text"
                  value={user?.account_type === 'teacher' ? 'Teacher' : 'Student'}
                  disabled
                  className="clay-input w-full opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your account type cannot be changed after registration.
                </p>
              </div>

              {/* Member Since (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Member Since
                </label>
                <input
                  type="text"
                  value={new Date(user?.created_date || Date.now()).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                  disabled
                  className="clay-input w-full opacity-60 cursor-not-allowed"
                />
              </div>

              {/* Save Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="clay-button-primary w-full px-6 py-3 rounded-lg flex items-center justify-center gap-2"
                  style={{
                    opacity: saving ? 0.7 : 1,
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Password & Security Notice */}
          <div className="clay-card p-6 mt-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-gray-800 mb-1">Password & Security</h3>
                <p className="text-sm text-gray-600">
                  Password management is handled securely by the Vignan Hub platform.
                  If you need to change your password, please use the "Forgot Password"
                  option on the login page or contact support at <span className="font-medium text-purple-600">support@vignanhub.com</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
