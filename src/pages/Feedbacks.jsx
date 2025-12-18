
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MessageCircle, Send, ThumbsUp, ThumbsDown, Star, Plus, X, Save, Edit, Trash2, Filter, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function Feedbacks() {
  const [user, setUser] = useState(null);
  const [remarks, setRemarks] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [teachersOrStudents, setTeachersOrStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('remarks');
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedRemark, setSelectedRemark] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [responseText, setResponseText] = useState("");

  const [feedbackData, setFeedbackData] = useState({
    teacher_id: "",
    type: "feedback",
    category: "general",
    subject: "",
    message: ""
  });

  const [remarkData, setRemarkData] = useState({
    student_id: "",
    category: "progress",
    remark: "",
    is_positive: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) {
        base44.auth.redirectToLogin();
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const allRemarks = await base44.entities.StudentRemark.list('-created_date');
      const allFeedbacks = await base44.entities.Feedback.list('-created_date');

      if (currentUser.account_type === 'teacher') {
        // TEACHER VIEW
        // Get remarks created by this teacher
        const myRemarks = allRemarks.filter(r => r.teacher_id === currentUser.id);
        setRemarks(myRemarks);

        // Get feedback/complaints about this teacher
        const feedbackAboutMe = allFeedbacks.filter(f => f.teacher_id === currentUser.id);
        setFeedbacks(feedbackAboutMe);

        // Get list of students from their courses
        const allCourses = await base44.entities.Course.list();
        const myCourses = allCourses.filter(c => c.teacher_id === currentUser.id);

        const studentIds = new Set();
        myCourses.forEach(course => {
          if (course.enrolled_students) {
            course.enrolled_students.forEach(id => studentIds.add(id));
          }
        });

        const allSubmissions = await base44.entities.Submission.list();
        const studentMap = new Map();

        allSubmissions.forEach(sub => {
          if (studentIds.has(sub.student_id)) {
            studentMap.set(sub.student_id, {
              id: sub.student_id,
              name: sub.student_name,
              email: sub.student_email
            });
          }
        });

        setTeachersOrStudents(Array.from(studentMap.values()));

      } else {
        // STUDENT VIEW
        // Get remarks for this student
        const myRemarks = allRemarks.filter(r => r.student_id === currentUser.id);
        setRemarks(myRemarks);

        // Get feedback submitted by this student
        const myFeedbacks = allFeedbacks.filter(f => f.student_id === currentUser.id);
        setFeedbacks(myFeedbacks);

        // Get teachers from enrolled courses
        const allCourses = await base44.entities.Course.list();
        const enrolledCourseIds = currentUser.enrolled_courses || [];
        const enrolledCourses = allCourses.filter(c => enrolledCourseIds.includes(c.id));

        const teacherMap = new Map();
        enrolledCourses.forEach(course => {
          if (!teacherMap.has(course.teacher_id)) {
            teacherMap.set(course.teacher_id, {
              id: course.teacher_id,
              name: course.teacher_name
            });
          }
        });

        setTeachersOrStudents(Array.from(teacherMap.values()));
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      if (error.message && error.message.includes("logged in")) {
        base44.auth.redirectToLogin();
        return;
      }
      setLoading(false);
    }
  };

  // Teacher: Add remark for student
  const handleAddRemark = async (e) => {
    e.preventDefault();

    if (!remarkData.student_id || !remarkData.remark) {
      alert("Please fill in all required fields!");
      return;
    }

    try {
      const student = teachersOrStudents.find(s => s.id === remarkData.student_id);

      await base44.entities.StudentRemark.create({
        student_id: remarkData.student_id,
        student_name: student.name,
        student_email: student.email,
        teacher_id: user.id,
        teacher_name: user.full_name,
        category: remarkData.category,
        remark: remarkData.remark,
        is_positive: remarkData.is_positive
      });

      await base44.entities.Notification.create({
        user_id: remarkData.student_id,
        message: `Your teacher ${user.full_name} added a ${remarkData.category} remark about you`,
        type: "general",
        read: false
      });

      setRemarkData({
        student_id: "",
        category: "progress",
        remark: "",
        is_positive: true
      });
      setShowRemarkModal(false);
      loadData();
      alert("Remark added successfully!");
    } catch (error) {
      console.error("Error adding remark:", error);
      alert("Failed to add remark. Please try again.");
    }
  };

  // Teacher: Edit remark
  const handleEditRemark = async (e) => {
    e.preventDefault();

    try {
      await base44.entities.StudentRemark.update(selectedRemark.id, {
        category: remarkData.category,
        remark: remarkData.remark,
        is_positive: remarkData.is_positive
      });

      setShowEditModal(false);
      setSelectedRemark(null);
      loadData();
      alert("Remark updated successfully!");
    } catch (error) {
      console.error("Error updating remark:", error);
      alert("Failed to update remark. Please try again.");
    }
  };

  // Teacher: Delete remark
  const handleDeleteRemark = async (remarkId) => {
    if (!window.confirm("Are you sure you want to delete this remark?")) return;

    try {
      await base44.entities.StudentRemark.delete(remarkId);
      loadData();
      alert("Remark deleted successfully!");
    } catch (error) {
      console.error("Error deleting remark:", error);
      alert("Failed to delete remark. Please try again.");
    }
  };

  // Student: Submit feedback about teacher
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();

    if (!feedbackData.subject || !feedbackData.message) {
      alert("Please fill in all required fields!");
      return;
    }

    try {
      const teacher = teachersOrStudents.find(t => t.id === feedbackData.teacher_id);

      await base44.entities.Feedback.create({
        student_id: user.id,
        student_name: user.full_name,
        student_email: user.email,
        teacher_id: feedbackData.teacher_id || null,
        teacher_name: teacher?.name || null,
        type: feedbackData.type,
        category: feedbackData.category,
        subject: feedbackData.subject,
        message: feedbackData.message,
        status: "pending"
      });

      // Notify teacher if feedback is about them
      if (feedbackData.teacher_id) {
        await base44.entities.Notification.create({
          user_id: feedbackData.teacher_id,
          message: `Student ${user.full_name} submitted ${feedbackData.type} about you: ${feedbackData.subject}`,
          type: "general",
          read: false
        });
      }

      // Notify student
      await base44.entities.Notification.create({
        user_id: user.id,
        message: `Your ${feedbackData.type} has been submitted successfully`,
        type: "general",
        read: false
      });

      setFeedbackData({
        teacher_id: "",
        type: "feedback",
        category: "general",
        subject: "",
        message: ""
      });
      setShowFeedbackModal(false);
      loadData();
      alert("Your feedback has been submitted successfully!");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    }
  };

  // Teacher: Respond to student feedback
  const handleRespondToFeedback = async (e) => {
    e.preventDefault();

    if (!responseText.trim()) {
      alert("Please write a response!");
      return;
    }

    try {
      await base44.entities.Feedback.update(selectedFeedback.id, {
        teacher_response: responseText,
        teacher_response_date: new Date().toISOString(),
        status: "resolved"
      });

      // Notify student about teacher's response
      await base44.entities.Notification.create({
        user_id: selectedFeedback.student_id,
        message: `${user.full_name} responded to your feedback: "${selectedFeedback.subject}"`,
        type: "general",
        read: false
      });

      setResponseText("");
      setSelectedFeedback(null);
      setShowResponseModal(false);
      loadData();
      alert("Response sent successfully!");
    } catch (error) {
      console.error("Error responding to feedback:", error);
      alert("Failed to send response. Please try again.");
    }
  };

  const filteredRemarks = remarks.filter(remark => {
    const searchName = user.account_type === 'teacher' ? remark.student_name : remark.teacher_name;
    const matchesSearch = searchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      remark.remark.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || remark.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = feedback.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || feedback.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="clay-card p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {user?.account_type === 'teacher' ? 'Student Feedback & Remarks' : 'Teacher Remarks & My Feedback'}
            </h1>
            <p className="text-slate-600">
              {user?.account_type === 'teacher'
                ? "Manage student remarks and view feedback from students"
                : "View teacher remarks and submit feedback"}
            </p>
          </div>
          <button
            onClick={() => user?.account_type === 'teacher' ? setShowRemarkModal(true) : setShowFeedbackModal(true)}
            className="clay-button-primary px-6 py-3 flex items-center gap-2 rounded-lg"
          >
            <Plus className="w-5 h-5" />
            {user?.account_type === 'teacher' ? 'Add Remark' : 'Submit Feedback'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="clay-card p-2 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('remarks')}
            className={`clay-button flex-1 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'remarks'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <Star className="w-5 h-5 inline mr-2" />
            {user?.account_type === 'teacher' ? 'My Remarks' : 'Teacher Remarks'} ({remarks.length})
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`clay-button flex-1 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'feedback'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <MessageCircle className="w-5 h-5 inline mr-2" />
            {user?.account_type === 'teacher' ? 'Student Feedback' : 'My Feedback'} ({feedbacks.length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="clay-card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={`Search by ${user?.account_type === 'teacher' ? 'student name' : 'teacher name'} or content...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="clay-input w-full !pl-14"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="clay-input w-full"
            >
              <option value="all">All Categories</option>
              {activeTab === 'remarks' ? (
                <>
                  <option value="progress">Progress</option>
                  <option value="behavior">Behavior</option>
                  <option value="performance">Performance</option>
                  <option value="attendance">Attendance</option>
                  <option value="general">General</option>
                </>
              ) : (
                <>
                  <option value="general">General</option>
                  <option value="teaching_quality">Teaching Quality</option>
                  <option value="behavior">Behavior</option>
                  <option value="grading">Grading</option>
                  <option value="communication">Communication</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'remarks' ? (
        <div>
          {filteredRemarks.length === 0 ? (
            <div className="clay-card p-12 text-center">
              <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                {remarks.length === 0
                  ? user?.account_type === 'teacher'
                    ? "No remarks created yet. Click 'Add Remark' to get started."
                    : "No remarks from teachers yet."
                  : "No remarks match your search criteria."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredRemarks.map((remark, index) => (
                <motion.div
                  key={remark.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`clay-card p-6 ${remark.is_positive
                    ? 'bg-gradient-to-r from-green-50 to-blue-50'
                    : 'bg-gradient-to-r from-yellow-50 to-orange-50'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${remark.is_positive ? 'bg-green-200' : 'bg-orange-200'
                        }`}>
                        {remark.is_positive ? (
                          <ThumbsUp className="w-6 h-6 text-green-700" />
                        ) : (
                          <ThumbsDown className="w-6 h-6 text-orange-700" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-gray-800">
                            {user?.account_type === 'teacher' ? remark.student_name : remark.teacher_name}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${remark.category === 'progress' ? 'bg-blue-100 text-blue-700' :
                            remark.category === 'behavior' ? 'bg-purple-100 text-purple-700' :
                              remark.category === 'performance' ? 'bg-green-100 text-green-700' :
                                remark.category === 'attendance' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                            }`}>
                            {remark.category.charAt(0).toUpperCase() + remark.category.slice(1)}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-2">{remark.remark}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(remark.created_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>

                    {user?.account_type === 'teacher' && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedRemark(remark);
                            setRemarkData({
                              student_id: remark.student_id,
                              category: remark.category,
                              remark: remark.remark,
                              is_positive: remark.is_positive
                            });
                            setShowEditModal(true);
                          }}
                          className="clay-button p-2"
                          style={{ color: '#3b82f6' }}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRemark(remark.id)}
                          className="clay-button p-2"
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {filteredFeedbacks.length === 0 ? (
            <div className="clay-card p-12 text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                {feedbacks.length === 0
                  ? user?.account_type === 'teacher'
                    ? "No feedback from students yet."
                    : "You haven't submitted any feedback yet."
                  : "No feedback matches your search criteria."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredFeedbacks.map((feedback, index) => (
                <motion.div
                  key={feedback.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="clay-card p-6"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${feedback.type === 'complaint' ? 'bg-red-100 text-red-700' :
                        feedback.type === 'feedback' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                        {feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${feedback.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        feedback.status === 'under_review' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                        {feedback.status.replace('_', ' ').charAt(0).toUpperCase() + feedback.status.slice(1).replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {format(new Date(feedback.created_date), 'MMM d, yyyy')}
                    </p>
                  </div>

                  <h3 className="font-bold text-lg text-gray-800 mb-2">{feedback.subject}</h3>

                  {user?.account_type === 'teacher' ? (
                    <p className="text-sm text-gray-600 mb-2">From: {feedback.student_name}</p>
                  ) : feedback.teacher_name && (
                    <p className="text-sm text-gray-600 mb-2">About: {feedback.teacher_name}</p>
                  )}

                  <p className="text-gray-700 mb-3">{feedback.message}</p>

                  {/* Teacher Response */}
                  {feedback.teacher_response && (
                    <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-500">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-4 h-4 text-green-700" />
                        <p className="text-sm font-medium text-green-900">Teacher Response:</p>
                        {feedback.teacher_response_date && (
                          <span className="text-xs text-gray-500 ml-auto">
                            {format(new Date(feedback.teacher_response_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{feedback.teacher_response}</p>
                    </div>
                  )}

                  {/* Admin Response */}
                  {feedback.admin_response && (
                    <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500">
                      <p className="text-sm font-medium text-purple-900 mb-1">Admin Response:</p>
                      <p className="text-sm text-gray-700">{feedback.admin_response}</p>
                    </div>
                  )}

                  {/* Teacher: Respond Button */}
                  {user?.account_type === 'teacher' && !feedback.teacher_response && (
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          setSelectedFeedback(feedback);
                          setShowResponseModal(true);
                        }}
                        className="clay-button px-4 py-2 flex items-center gap-2"
                        style={{
                          background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                          color: 'white',
                          fontWeight: '600'
                        }}
                      >
                        <Send className="w-4 h-4" />
                        Respond
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Teacher: Add Remark Modal */}
      <AnimatePresence>
        {showRemarkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowRemarkModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Add Remark</h2>
                <button onClick={() => setShowRemarkModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddRemark} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Student *
                  </label>
                  <select
                    required
                    value={remarkData.student_id}
                    onChange={(e) => setRemarkData({ ...remarkData, student_id: e.target.value })}
                    className="clay-input w-full"
                  >
                    <option value="">Choose a student...</option>
                    {teachersOrStudents.map(student => (
                      <option key={student.id} value={student.id}>{student.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={remarkData.category}
                    onChange={(e) => setRemarkData({ ...remarkData, category: e.target.value })}
                    className="clay-input w-full"
                  >
                    <option value="progress">Progress</option>
                    <option value="behavior">Behavior</option>
                    <option value="performance">Performance</option>
                    <option value="attendance">Attendance</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remark Type *
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRemarkData({ ...remarkData, is_positive: true })}
                      className={`clay-button flex-1 px-4 py-3 flex items-center justify-center gap-2 ${remarkData.is_positive ? 'ring-2 ring-green-500' : ''
                        }`}
                      style={{
                        background: remarkData.is_positive
                          ? 'linear-gradient(135deg, #43e97b, #38f9d7)'
                          : undefined,
                        color: remarkData.is_positive ? 'white' : '#6b7280',
                        fontWeight: remarkData.is_positive ? '600' : 'normal'
                      }}
                    >
                      <ThumbsUp className="w-5 h-5" />
                      Positive
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemarkData({ ...remarkData, is_positive: false })}
                      className={`clay-button flex-1 px-4 py-3 flex items-center justify-center gap-2 ${!remarkData.is_positive ? 'ring-2 ring-orange-500' : ''
                        }`}
                      style={{
                        background: !remarkData.is_positive
                          ? 'linear-gradient(135deg, #fa709a, #fee140)'
                          : undefined,
                        color: !remarkData.is_positive ? 'white' : '#6b7280',
                        fontWeight: !remarkData.is_positive ? '600' : 'normal'
                      }}
                    >
                      <ThumbsDown className="w-5 h-5" />
                      Needs Improvement
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remark *
                  </label>
                  <textarea
                    required
                    value={remarkData.remark}
                    onChange={(e) => setRemarkData({ ...remarkData, remark: e.target.value })}
                    className="clay-input w-full h-32 resize-none"
                    placeholder="Write your remark here..."
                  />
                </div>

                <button
                  type="submit"
                  className="clay-button-primary w-full px-6 py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Add Remark
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teacher: Edit Remark Modal */}
      <AnimatePresence>
        {showEditModal && selectedRemark && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Edit Remark</h2>
                <button onClick={() => setShowEditModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditRemark} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedRemark.student_name}
                    className="clay-input w-full opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={remarkData.category}
                    onChange={(e) => setRemarkData({ ...remarkData, category: e.target.value })}
                    className="clay-input w-full"
                  >
                    <option value="progress">Progress</option>
                    <option value="behavior">Behavior</option>
                    <option value="performance">Performance</option>
                    <option value="attendance">Attendance</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remark Type *
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRemarkData({ ...remarkData, is_positive: true })}
                      className={`clay-button flex-1 px-4 py-3 flex items-center justify-center gap-2 ${remarkData.is_positive ? 'ring-2 ring-green-500' : ''
                        }`}
                      style={{
                        background: remarkData.is_positive
                          ? 'linear-gradient(135deg, #43e97b, #38f9d7)'
                          : undefined,
                        color: remarkData.is_positive ? 'white' : '#6b7280',
                        fontWeight: remarkData.is_positive ? '600' : 'normal'
                      }}
                    >
                      <ThumbsUp className="w-5 h-5" />
                      Positive
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemarkData({ ...remarkData, is_positive: false })}
                      className={`clay-button flex-1 px-4 py-3 flex items-center justify-center gap-2 ${!remarkData.is_positive ? 'ring-2 ring-orange-500' : ''
                        }`}
                      style={{
                        background: !remarkData.is_positive
                          ? 'linear-gradient(135deg, #fa709a, #fee140)'
                          : undefined,
                        color: !remarkData.is_positive ? 'white' : '#6b7280',
                        fontWeight: !remarkData.is_positive ? '600' : 'normal'
                      }}
                    >
                      <ThumbsDown className="w-5 h-5" />
                      Needs Improvement
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remark *
                  </label>
                  <textarea
                    required
                    value={remarkData.remark}
                    onChange={(e) => setRemarkData({ ...remarkData, remark: e.target.value })}
                    className="clay-input w-full h-32 resize-none"
                    placeholder="Write your remark here..."
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
                  <Save className="w-5 h-5" />
                  Update Remark
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student: Submit Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowFeedbackModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Submit Feedback</h2>
                <button onClick={() => setShowFeedbackModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    required
                    value={feedbackData.type}
                    onChange={(e) => setFeedbackData({ ...feedbackData, type: e.target.value })}
                    className="clay-input w-full"
                  >
                    <option value="feedback">Feedback</option>
                    <option value="complaint">Complaint</option>
                    <option value="suggestion">Suggestion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={feedbackData.category}
                    onChange={(e) => setFeedbackData({ ...feedbackData, category: e.target.value })}
                    className="clay-input w-full"
                  >
                    <option value="general">General</option>
                    <option value="teaching_quality">Teaching Quality</option>
                    <option value="behavior">Behavior</option>
                    <option value="grading">Grading</option>
                    <option value="communication">Communication</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    About Teacher (Optional)
                  </label>
                  <select
                    value={feedbackData.teacher_id}
                    onChange={(e) => setFeedbackData({ ...feedbackData, teacher_id: e.target.value })}
                    className="clay-input w-full"
                  >
                    <option value="">Not specific to a teacher</option>
                    {teachersOrStudents.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={feedbackData.subject}
                    onChange={(e) => setFeedbackData({ ...feedbackData, subject: e.target.value })}
                    className="clay-input w-full"
                    placeholder="Brief subject line"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    value={feedbackData.message}
                    onChange={(e) => setFeedbackData({ ...feedbackData, message: e.target.value })}
                    className="clay-input w-full h-32 resize-none"
                    placeholder="Write your feedback or complaint in detail..."
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
                  <Send className="w-5 h-5" />
                  Submit Feedback
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teacher: Respond to Feedback Modal */}
      <AnimatePresence>
        {showResponseModal && selectedFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowResponseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Respond to Feedback</h2>
                <button onClick={() => setShowResponseModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Show original feedback */}
              <div className="clay-card p-4 bg-gradient-to-r from-purple-50 to-blue-50 mb-6">
                <h3 className="font-bold text-gray-800 mb-2">{selectedFeedback.subject}</h3>
                <p className="text-sm text-gray-600 mb-2">From: {selectedFeedback.student_name}</p>
                <p className="text-sm text-gray-700">{selectedFeedback.message}</p>
              </div>

              <form onSubmit={handleRespondToFeedback} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Response *
                  </label>
                  <textarea
                    required
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="clay-input w-full h-32 resize-none"
                    placeholder="Write your response to the student..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="clay-button flex-1 px-6 py-3 rounded-2xl flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                      color: 'white',
                      fontWeight: '600'
                    }}
                  >
                    <Send className="w-5 h-5" />
                    Send Response
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResponseModal(false);
                      setSelectedFeedback(null);
                      setResponseText("");
                    }}
                    className="clay-button px-6 py-3 text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
