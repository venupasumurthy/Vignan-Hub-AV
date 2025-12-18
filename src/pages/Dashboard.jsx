
import React, { useState, useEffect } from "react";
import { vignan } from "@/api/vignanClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  BookOpen, FileText, Award, TrendingUp,
  Bell, Megaphone, Star, Users, MessageCircle, X, Send, Plus
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
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false); // New state for assignment modal
  const [newDoubt, setNewDoubt] = useState({
    title: "",
    content: "",
    course_id: ""
  });
  const [studentCourses, setStudentCourses] = useState([]);
  const [teacherCourses, setTeacherCourses] = useState([]); // New state for teacher's courses
  const [newAssignment, setNewAssignment] = useState({ // New state for assignment form data
    course_name: "", // Changed from course_id to course_name
    title: "",
    description: "",
    due_date: "",
    total_points: 100
  });
  const [showCircularModal, setShowCircularModal] = useState(false);
  const [newCircular, setNewCircular] = useState({
    title: "",
    content: "",
    priority: "medium",
    course_id: "",
    target_audience: "all"
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const isAuthenticated = await vignan.auth.isAuthenticated();
      if (!isAuthenticated) {
        vignan.auth.redirectToLogin();
        return;
      }

      const currentUser = await vignan.auth.me();
      setUser(currentUser);

      const courses = await vignan.entities.Course.list('-created_date', 4);
      setRecentCourses(courses);

      // Load enrolled courses for students
      if (currentUser.account_type === 'student') {
        const allCourses = await vignan.entities.Course.list();
        const enrolled = allCourses.filter(c => currentUser.enrolled_courses?.includes(c.id));
        setStudentCourses(enrolled);
      }

      // Load teacher's courses for assignment creation
      if (currentUser.account_type === 'teacher') {
        const allCourses = await vignan.entities.Course.list();
        const myCourses = allCourses.filter(c => c.teacher_id === currentUser.id);
        setTeacherCourses(myCourses);
      }

      const circulars = await vignan.entities.Circular.list('-created_date', 3);
      setRecentCirculars(circulars);

      const notifs = await vignan.entities.Notification.filter(
        { user_id: currentUser.id },
        '-created_date',
        5
      );
      setNotifications(notifs);

      // Load doubts for teachers
      if (currentUser.account_type === 'teacher') {
        const myCourses = await vignan.entities.Course.filter({ teacher_id: currentUser.id });
        const courseIds = myCourses.map(c => c.id);

        if (courseIds.length > 0) {
          const allDiscussions = await vignan.entities.Discussion.list('-created_date');
          const myDoubts = allDiscussions.filter(d => courseIds.includes(d.course_id));
          setDoubts(myDoubts.slice(0, 5));
        }
      }

      // Calculate stats based on account type
      if (currentUser.account_type === 'student') {
        const enrolledCourses = currentUser.enrolled_courses?.length || 0;
        const submissions = await vignan.entities.Submission.filter(
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
      } else { // Teacher stats
        const myCourses = await vignan.entities.Course.filter({ teacher_id: currentUser.id });
        const allAssignments = await vignan.entities.Assignment.list();
        const relevantAssignments = allAssignments.filter(a =>
          myCourses.some(c => c.id === a.course_id)
        );

        setStats({
          courses: myCourses.length,
          assignments: relevantAssignments.length,
          badges: 0, // Teachers don't earn badges in this system
          avgGrade: 0 // Teachers don't have an avg grade
        });
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      // If there's an authentication error, redirect to login
      if (error.message && (error.message.includes("logged in") || error.message.includes("authenticated"))) {
        vignan.auth.redirectToLogin();
        return;
      }
      setLoading(false);
    }
  };

  const markNotificationRead = async (notifId) => {
    try {
      await vignan.entities.Notification.update(notifId, { read: true });
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
      await vignan.auth.updateMe({
        points: newPoints
      });

      await vignan.entities.Notification.create({
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

      await vignan.entities.Discussion.create({
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
      await vignan.entities.Notification.create({
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

  const handleCreateAssignment = async (e) => {
    e.preventDefault();

    if (!newAssignment.course_name || !newAssignment.title || !newAssignment.description || !newAssignment.due_date) {
      alert("Please fill in all required fields!");
      return;
    }

    try {
      // Find course by name (case insensitive) or create new one
      let course = teacherCourses.find(c =>
        c.title.toLowerCase() === newAssignment.course_name.toLowerCase()
      );

      // If course doesn't exist, create it
      if (!course) {
        const newCourse = await vignan.entities.Course.create({
          title: newAssignment.course_name,
          description: `Course for ${newAssignment.course_name}`,
          teacher_id: user.id,
          teacher_name: user.full_name,
          enrolled_students: [],
          category: "Other",
          thumbnail_color: 'linear-gradient(135deg, #667eea, #764ba2)'
        });
        course = newCourse;

        // Reload teacher courses to include the newly created one
        const allCourses = await vignan.entities.Course.list();
        const myCourses = allCourses.filter(c => c.teacher_id === user.id);
        setTeacherCourses(myCourses);
      }

      // Create assignment
      await vignan.entities.Assignment.create({
        course_id: course.id,
        course_title: course.title,
        title: newAssignment.title,
        description: newAssignment.description,
        due_date: newAssignment.due_date,
        total_points: parseInt(newAssignment.total_points)
      });

      // Notify all enrolled students
      const enrolledStudents = course.enrolled_students || [];
      for (const studentId of enrolledStudents) {
        await vignan.entities.Notification.create({
          user_id: studentId,
          message: `New assignment posted in ${course.title}: ${newAssignment.title}`,
          type: "assignment",
          read: false
        });
      }

      alert("Assignment created successfully!");
      setNewAssignment({ course_name: "", title: "", description: "", due_date: "", total_points: 100 });
      setShowCreateAssignmentModal(false);
      loadDashboardData(); // Reload dashboard data to reflect changes
    } catch (error) {
      console.error("Error creating assignment:", error);
      alert("Failed to create assignment. Please try again.");
    }
  };

  const handlePostCircular = async (e) => {
    e.preventDefault();

    if (!newCircular.title || !newCircular.content) {
      alert("Please fill in all required fields!");
      return;
    }

    try {
      const course = teacherCourses.find(c => c.id === newCircular.course_id);

      await vignan.entities.Circular.create({
        ...newCircular,
        author_id: user.id,
        author_name: user.full_name,
        course_title: course?.title || ""
      });

      // Create notifications based on target audience without listing all users
      // We'll create notifications that students/teachers will see when they check
      // Instead of trying to list all users (which causes permission error)

      // For enrolled students in the course if a course is selected
      if (newCircular.course_id && course) {
        const enrolledStudents = course.enrolled_students || [];
        for (const studentId of enrolledStudents) {
          try {
            await vignan.entities.Notification.create({
              user_id: studentId,
              message: `New announcement: ${newCircular.title}`,
              type: "circular",
              read: false
            });
          } catch (err) {
            console.error("Error creating notification for student:", err);
          }
        }
      }

      alert("Circular posted successfully!");
      setNewCircular({
        title: "",
        content: "",
        priority: "medium",
        course_id: "",
        target_audience: "all"
      });
      setShowCircularModal(false);
      loadDashboardData();
    } catch (error) {
      console.error("Error posting circular:", error);
      alert("Failed to post circular. Please try again.");
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, gradient }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="clay-card p-6 relative overflow-hidden group hover:border-blue-300 transition-colors"
    >
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <Icon className="w-6 h-6" />
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Welcome back, {user?.full_name}! 👋
        </h1>
        <div className="inline-block px-3 py-1 mb-4 rounded-full bg-blue-100 text-blue-800 text-sm font-bold uppercase tracking-wide">
          As {user?.account_type}
        </div>
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
        />
        <StatCard
          icon={FileText}
          label={user?.account_type === 'teacher' ? "Assignments Created" : "Assignments"}
          value={stats.assignments}
        />
        <StatCard
          icon={Award}
          label="Badges Earned"
          value={stats.badges}
        />

        {/* Points Card - Only for Students */}
        {user?.account_type === 'student' ? (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowPointsModal(true)}
            className="clay-card p-6 relative overflow-hidden hover:border-blue-300 transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 cursor-pointer group"
          >
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Points Earned</p>
                <p className="text-3xl font-bold text-slate-900">{user?.points || 0}</p>
                <p className="text-xs text-blue-600 mt-1 font-medium group-hover:underline">💎 Click to claim reward</p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </motion.button>
        ) : (
          <StatCard
            icon={TrendingUp}
            label="Average Grade"
            value={stats.avgGrade + "%"}
          />
        )}
      </div>

      {/* Teacher Create Assignment Button & Post Circular */}
      {user?.account_type === 'teacher' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="clay-card p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">Quick Actions</h3>
                <p className="text-sm text-slate-600">Create assignments and post announcements</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowCreateAssignmentModal(true)}
                className="clay-button-primary px-6 py-3 rounded-lg flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Create Assignment
              </button>
              <button
                onClick={() => setShowCircularModal(true)}
                className="clay-button px-6 py-3 rounded-lg flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Megaphone className="w-5 h-5" />
                Post Circular
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Student Doubt Clarification Button */}
      {user?.account_type === 'student' && studentCourses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="clay-card p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">Have a doubt?</h3>
                <p className="text-sm text-slate-600">Ask your teachers and get clarification</p>
              </div>
            </div>
            <button
              onClick={() => setShowDoubtModal(true)}
              className="clay-button-primary px-6 py-3 rounded-lg flex items-center gap-2"
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
              <h2 className="text-2xl font-bold text-slate-800">Recent Courses</h2>
              <Link to={createPageUrl("Courses")} className="clay-button px-4 py-2 text-blue-600 font-medium hover:bg-blue-50">
                View All
              </Link>
            </div>
            <div className="grid gap-4">
              {recentCourses.length === 0 ? (
                <p className="text-center text-slate-500 py-4 clay-card">No courses found.</p>
              ) : (
                recentCourses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link to={createPageUrl("Courses")}>
                      <div className="clay-card p-6 hover:shadow-lg hover:border-blue-200 transition-all">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-900 text-white">
                            <BookOpen className="w-8 h-8" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-800 mb-1">{course.title}</h3>
                            <p className="text-sm text-slate-600 line-clamp-2">{course.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
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
              <Bell className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800">Notifications</h3>
            </div>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No notifications</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl cursor-pointer transition-colors ${notif.read ? 'bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100' : 'bg-blue-50 border border-blue-100'}`}
                    onClick={() => !notif.read && markNotificationRead(notif.id)}
                  >
                    <p className="text-sm text-slate-700">{notif.message}</p>
                    <p className="text-xs text-slate-500 mt-1">
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
              <h3 className="font-bold text-slate-800">Announcements</h3>
            </div>
            <div className="space-y-3">
              {recentCirculars.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No announcements</p>
              ) : (
                recentCirculars.map((circular) => (
                  <div key={circular.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-medium text-sm text-slate-800">{circular.title}</p>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{circular.content}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(circular.created_date).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>

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
                        className="clay-button w-full px-6 py-3 rounded-2xl hover:scale-105 transition-transform"
                        style={{
                          background: 'linear-gradient(135deg, #fa709a, #fee140)',
                          color: 'white',
                          fontWeight: 'bold'
                        }}
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
                        className="clay-button px-6 py-3 font-medium"
                        style={{
                          background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                          color: 'white',
                          fontWeight: '600'
                        }}
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
                    Select Course *
                  </label>
                  <select
                    required
                    value={newDoubt.course_id}
                    onChange={(e) => setNewDoubt({ ...newDoubt, course_id: e.target.value })}
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
                    Doubt Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDoubt.title}
                    onChange={(e) => setNewDoubt({ ...newDoubt, title: e.target.value })}
                    className="clay-input w-full"
                    placeholder="Brief title for your doubt"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe Your Doubt *
                  </label>
                  <textarea
                    required
                    value={newDoubt.content}
                    onChange={(e) => setNewDoubt({ ...newDoubt, content: e.target.value })}
                    className="clay-input w-full h-32 resize-none"
                    placeholder="Explain your doubt in detail..."
                  />
                </div>

                <button
                  type="submit"
                  className="clay-button w-full px-6 py-3 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                    color: 'white',
                    fontWeight: '600'
                  }}
                >
                  Submit Doubt
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Assignment Modal for Teachers */}
      <AnimatePresence>
        {showCreateAssignmentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateAssignmentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #f093fb, #f5576c)'
                  }}>
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Create Assignment</h2>
                </div>
                <button onClick={() => setShowCreateAssignmentModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAssignment.course_name}
                    onChange={(e) => setNewAssignment({ ...newAssignment, course_name: e.target.value })}
                    className="clay-input w-full"
                    placeholder="Type course name (e.g., Data Structures)"
                    list="teacher-courses"
                  />
                  <datalist id="teacher-courses">
                    {teacherCourses.map(course => (
                      <option key={course.id} value={course.title} />
                    ))}
                  </datalist>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Type a course name. If it doesn't exist, it will be created automatically.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    className="clay-input w-full"
                    placeholder="e.g., Chapter 5 Quiz"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topics / Description *
                  </label>
                  <textarea
                    required
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                    className="clay-input w-full h-32 resize-none"
                    placeholder="Describe the assignment topics and instructions..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newAssignment.due_date}
                    onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                    className="clay-input w-full"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Marks *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="1000"
                    value={newAssignment.total_points}
                    onChange={(e) => setNewAssignment({ ...newAssignment, total_points: e.target.value })}
                    className="clay-input w-full"
                    placeholder="e.g., 100"
                  />
                </div>

                <button
                  type="submit"
                  className="clay-button w-full px-6 py-3 rounded-2xl flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    fontWeight: '600'
                  }}
                >
                  <FileText className="w-5 h-5" />
                  Create Assignment
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Circular Modal for Teachers */}
      <AnimatePresence>
        {showCircularModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCircularModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #f093fb, #f5576c)'
                  }}>
                    <Megaphone className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Post Circular</h2>
                </div>
                <button onClick={() => setShowCircularModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handlePostCircular} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCircular.title}
                    onChange={(e) => setNewCircular({ ...newCircular, title: e.target.value })}
                    className="clay-input w-full"
                    placeholder="Announcement title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content *
                  </label>
                  <textarea
                    required
                    value={newCircular.content}
                    onChange={(e) => setNewCircular({ ...newCircular, content: e.target.value })}
                    className="clay-input w-full h-32 resize-none"
                    placeholder="Announcement details..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={newCircular.priority}
                    onChange={(e) => setNewCircular({ ...newCircular, priority: e.target.value })}
                    className="clay-input w-full"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Audience
                  </label>
                  <select
                    value={newCircular.target_audience}
                    onChange={(e) => setNewCircular({ ...newCircular, target_audience: e.target.value })}
                    className="clay-input w-full"
                  >
                    <option value="all">All Users</option>
                    <option value="students">Students Only</option>
                    <option value="teachers">Teachers Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Related Course (Optional)
                  </label>
                  <select
                    value={newCircular.course_id}
                    onChange={(e) => setNewCircular({ ...newCircular, course_id: e.target.value })}
                    className="clay-input w-full"
                  >
                    <option value="">No specific course</option>
                    {teacherCourses.map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="clay-button w-full px-6 py-3 rounded-2xl flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                    color: 'white',
                    fontWeight: '600'
                  }}
                >
                  <Megaphone className="w-5 h-5" />
                  Post Circular
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
