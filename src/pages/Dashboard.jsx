import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  BookOpen, FileText, Award, TrendingUp,
  Bell, Megaphone, Star, Users, MessageCircle, X, Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    courses: 0,
    assignments: 0,
    badges: 0,
    avgGrade: 0
  });
  const [recentCourses, setRecentCourses] = useState([]);
  const [recentCirculars, setRecentCirculars] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [claimCode, setClaimCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDoubtModal, setShowDoubtModal] = useState(false);
  const [newDoubt, setNewDoubt] = useState({
    title: "",
    content: "",
    course_id: ""
  });
  const [studentCourses, setStudentCourses] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) {
        base44.auth.redirectToLogin();
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const courses = await base44.entities.Course.list('-created_date', 4);
      setRecentCourses(courses);

      // Load enrolled courses for students
      if (currentUser.account_type === 'student') {
        const allCourses = await base44.entities.Course.list();
        const enrolled = allCourses.filter(c => currentUser.enrolled_courses?.includes(c.id));
        setStudentCourses(enrolled);
      }

      const circulars = await base44.entities.Circular.list('-created_date', 3);
      setRecentCirculars(circulars);

      const notifs = await base44.entities.Notification.filter(
        { user_id: currentUser.id },
        '-created_date',
        5
      );
      setNotifications(notifs);

      // Load doubts for teachers
      if (currentUser.account_type === 'teacher') {
        const myCourses = await base44.entities.Course.filter({ teacher_id: currentUser.id });
        const courseIds = myCourses.map(c => c.id);

        if (courseIds.length > 0) {
          const allDiscussions = await base44.entities.Discussion.list('-created_date');
          const myDoubts = allDiscussions.filter(d => courseIds.includes(d.course_id));
          setDoubts(myDoubts.slice(0, 5));
        }
      }

      // Calculate stats based on account type
      if (currentUser.account_type === 'student') {
        const enrolledCourses = currentUser.enrolled_courses?.length || 0;
        const submissions = await base44.entities.Submission.filter(
          { student_id: currentUser.id }
        );
        const gradedSubmissions = submissions.filter(s => s.grade !== null && s.grade !== undefined);
        const avgGrade = gradedSubmissions.length > 0
          ? gradedSubmissions.reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions.length
          : 0;

        setStats({
          courses: enrolledCourses,
          assignments: submissions.length,
          badges: currentUser.badges?.length || 0,
          avgGrade: avgGrade.toFixed(1)
        });
      } else {
        const myCourses = await base44.entities.Course.filter({ teacher_id: currentUser.id });
        const allAssignments = await base44.entities.Assignment.list();
        const relevantAssignments = allAssignments.filter(a =>
          myCourses.some(c => c.id === a.course_id)
        );

        setStats({
          courses: myCourses.length,
          assignments: relevantAssignments.length,
          badges: 0,
          avgGrade: 0
        });
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      base44.auth.redirectToLogin();
    }
  };

  const markNotificationRead = async (notifId) => {
    try {
      await base44.entities.Notification.update(notifId, { read: true });
      loadDashboardData();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleClaimPoints = async () => {
    if ((user?.points || 0) < 100) {
      alert("You need at least 100 points to claim a reward code!");
      return;
    }

    try {
      const code = `VIGNAN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      setClaimCode(code);

      const newPoints = (user.points || 0) - 100;
      await base44.auth.updateMe({
        points: newPoints
      });

      await base44.entities.Notification.create({
        user_id: user.id,
        message: `You claimed a reward code! Code: ${code}. You now have ${newPoints} points.`,
        type: "general",
        read: false
      });

      await loadDashboardData();
    } catch (error) {
      console.error("Error claiming points:", error);
      alert("Failed to claim points. Please try again.");
    }
  };

  const handleSubmitDoubt = async (e) => {
    e.preventDefault();

    if (!newDoubt.course_id || !newDoubt.title || !newDoubt.content) {
      alert("Please fill in all fields!");
      return;
    }

    try {
      const course = studentCourses.find(c => c.id === newDoubt.course_id);
      if (!course) {
        alert("Course not found!");
        return;
      }

      await base44.entities.Discussion.create({
        course_id: newDoubt.course_id,
        course_title: course.title,
        author_id: user.id,
        author_name: user.full_name,
        author_role: user.account_type,
        title: newDoubt.title,
        content: newDoubt.content,
        replies: []
      });

      // Notify teacher
      await base44.entities.Notification.create({
        user_id: course.teacher_id,
        message: `New doubt from ${user.full_name} in ${course.title}: ${newDoubt.title}`,
        type: "course",
        read: false
      });

      alert("Your doubt has been submitted successfully!");
      setNewDoubt({ title: "", content: "", course_id: "" });
      setShowDoubtModal(false);
      loadDashboardData();
    } catch (error) {
      console.error("Error submitting doubt:", error);
      alert("Failed to submit doubt. Please try again.");
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, gradient }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="clay-card p-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{
        background: gradient,
        transform: 'translate(30%, -30%)'
      }} />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold" style={{ color }}>{value}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
          background: gradient,
          boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.5), inset -2px -2px 4px rgba(0,0,0,0.1)'
        }}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="clay-card p-8"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
          Welcome back, {user?.full_name}! 👋
        </h1>
        <p className="text-gray-600">
          {user?.account_type === 'teacher'
            ? "Here's what's happening with your courses today."
            : "Ready to continue your learning journey?"}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={BookOpen}
          label={user?.account_type === 'teacher' ? "My Courses" : "Enrolled Courses"}
          value={stats.courses}
          color="#667eea"
          gradient="linear-gradient(135deg, #667eea, #764ba2)"
        />
        <StatCard
          icon={FileText}
          label={user?.account_type === 'teacher' ? "Assignments Created" : "Assignments"}
          value={stats.assignments}
          color="#f093fb"
          gradient="linear-gradient(135deg, #f093fb, #f5576c)"
        />
        <StatCard
          icon={Award}
          label="Badges Earned"
          value={stats.badges}
          color="#43e97b"
          gradient="linear-gradient(135deg, #43e97b, #38f9d7)"
        />

        {/* Points Card - Only for Students */}
        {user?.account_type === 'student' ? (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowPointsModal(true)}
            className="clay-card p-6 relative overflow-hidden hover:scale-[1.02] transition-transform text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{
              background: 'linear-gradient(135deg, #fa709a, #fee140)',
              transform: 'translate(30%, -30%)'
            }} />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Points Earned</p>
                <p className="text-3xl font-bold text-yellow-600">{user?.points || 0}</p>
                <p className="text-xs text-gray-500 mt-1">💎 Click to claim reward</p>
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #fa709a, #fee140)',
                boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.5), inset -2px -2px 4px rgba(0,0,0,0.1)'
              }}>
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.button>
        ) : (
          <StatCard
            icon={TrendingUp}
            label="Average Grade"
            value={stats.avgGrade + "%"}
            color="#fa709a"
            gradient="linear-gradient(135deg, #fa709a, #fee140)"
          />
        )}
      </div>

      {/* Student Doubt Clarification Button */}
      {user?.account_type === 'student' && studentCourses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="clay-card p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #43e97b, #38f9d7)'
              }}>
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">Have a doubt?</h3>
                <p className="text-sm text-gray-600">Ask your teachers and get clarification</p>
              </div>
            </div>
            <button
              onClick={() => setShowDoubtModal(true)}
              className="clay-button px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-medium rounded-2xl flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Ask Doubt
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Recent Courses</h2>
              <Link to={createPageUrl("Courses")} className="clay-button px-4 py-2 text-purple-600 font-medium">
                View All
              </Link>
            </div>
            <div className="grid gap-4">
              {recentCourses.length === 0 ? (
                <p className="text-center text-gray-500 py-4 clay-card">No courses found.</p>
              ) : (
                recentCourses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link to={createPageUrl("Courses")}>
                      <div className="clay-card p-6 hover:scale-[1.02] transition-transform">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{
                            background: course.thumbnail_color || 'linear-gradient(135deg, #667eea, #764ba2)'
                          }}>
                            <BookOpen className="w-8 h-8 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800 mb-1">{course.title}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {course.teacher_name}
                              </span>
                              {course.duration && (
                                <span>{course.duration}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Teacher Doubts Section - Only for Teachers */}
          {user?.account_type === 'teacher' && doubts.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">📝 Student Doubts & Questions</h2>
                <Link to={createPageUrl("Discussions")} className="clay-button px-4 py-2 text-purple-600 font-medium">
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                {doubts.map((doubt, index) => (
                  <motion.div
                    key={doubt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="clay-card p-4 hover:scale-[1.02] transition-transform"
                  >
                    <div className="flex items-start gap-3">
                      <MessageCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{doubt.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{doubt.content.slice(0, 100)}{doubt.content.length > 100 ? '...' : ''}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="font-medium text-purple-600">{doubt.author_name}</span>
                          <span>•</span>
                          <span>{doubt.course_title}</span>
                          <span>•</span>
                          <span>{new Date(doubt.created_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Link
                        to={createPageUrl("CourseDetail") + "?id=" + doubt.course_id}
                        className="clay-button px-3 py-1 text-sm text-blue-600"
                      >
                        Reply
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="clay-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-gray-800">Notifications</h3>
            </div>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No notifications</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-2xl cursor-pointer ${notif.read ? 'bg-white/40' : 'bg-gradient-to-r from-purple-50 to-blue-50 hover:bg-gradient-to-r hover:from-purple-100 hover:to-blue-100'}`}
                    onClick={() => !notif.read && markNotificationRead(notif.id)}
                  >
                    <p className="text-sm text-gray-700">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notif.created_date).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="clay-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="w-5 h-5 text-pink-600" />
              <h3 className="font-bold text-gray-800">Announcements</h3>
            </div>
            <div className="space-y-3">
              {recentCirculars.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No announcements</p>
              ) : (
                recentCirculars.map((circular) => (
                  <div key={circular.id} className="p-3 rounded-2xl bg-gradient-to-r from-pink-50 to-yellow-50">
                    <p className="font-medium text-sm text-gray-800">{circular.title}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{circular.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(circular.created_date).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
            <Link to={createPageUrl("Circulars")} className="clay-button w-full mt-4 px-4 py-2 text-center text-pink-600 font-medium block">
              View All
            </Link>
          </div>
        </div>
      </div>

      {/* Points Claiming Modal */}
      <AnimatePresence>
        {showPointsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowPointsModal(false);
              setClaimCode("");
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, #fa709a, #fee140)'
                }}>
                  <Award className="w-10 h-10 text-white" />
                </div>

                {!claimCode ? (
                  <>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">💎 Claim Reward</h2>
                    <p className="text-gray-600 mb-4">
                      You have <span className="font-bold text-yellow-600 text-2xl">{user?.points || 0} points</span>
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                      Exchange 100 points for a reward code that you can use for special benefits!
                    </p>

                    {(user?.points || 0) >= 100 ? (
                      <button
                        onClick={handleClaimPoints}
                        className="clay-button w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-2xl hover:scale-105 transition-transform"
                      >
                        🎁 Claim Reward Code (-100 points)
                      </button>
                    ) : (
                      <div className="clay-card p-4 bg-gradient-to-r from-red-50 to-orange-50 mt-4 border-2 border-red-200">
                        <p className="text-sm text-red-700 font-medium">
                          ⚠️ You need at least 100 points to claim a reward.
                        </p>
                        <p className="text-xs text-red-600 mt-2">
                          Keep earning points by completing assignments!
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">🎉 Congratulations!</h2>
                    <p className="text-gray-600 mb-4">Your reward code is:</p>
                    <div className="clay-card p-6 bg-gradient-to-r from-purple-50 to-pink-50 mb-4 border-2 border-purple-300">
                      <p className="text-3xl font-bold text-purple-600 tracking-wider break-all">
                        {claimCode}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      💾 Save this code! You can use it for special rewards and benefits.
                    </p>
                    <p className="text-xs text-green-600 font-medium mb-6">
                      ✅ Your new balance: {(user?.points || 0)} points
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(claimCode);
                          alert("✅ Code copied to clipboard!");
                        }}
                        className="clay-button px-6 py-3 text-purple-600 font-medium"
                      >
                        📋 Copy Code
                      </button>
                      <button
                        onClick={() => {
                          setShowPointsModal(false);
                          setClaimCode("");
                        }}
                        className="clay-button px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium"
                      >
                        ✓ Done
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ask Doubt Modal */}
      <AnimatePresence>
        {showDoubtModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDoubtModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #43e97b, #38f9d7)'
                  }}>
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Ask a Doubt</h2>
                </div>
                <button onClick={() => setShowDoubtModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleSubmitDoubt} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Course
                  </label>
                  <select
                    required
                    value={newDoubt.course_id}
                    onChange={(e) => setNewDoubt({...newDoubt, course_id: e.target.value})}
                    className="clay-input w-full"
                  >
                    <option value="">Choose a course...</option>
                    {studentCourses.map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Doubt Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newDoubt.title}
                    onChange={(e) => setNewDoubt({...newDoubt, title: e.target.value})}
                    className="clay-input w-full"
                    placeholder="Brief title for your doubt"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe Your Doubt
                  </label>
                  <textarea
                    required
                    value={newDoubt.content}
                    onChange={(e) => setNewDoubt({...newDoubt, content: e.target.value})}
                    className="clay-input w-full h-32 resize-none"
                    placeholder="Explain your doubt in detail..."
                  />
                </div>

                <button
                  type="submit"
                  className="clay-button w-full px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-medium rounded-2xl"
                >
                  Submit Doubt
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}