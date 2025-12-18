import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Plus, Edit, Trash2, Search, Filter, ThumbsUp, ThumbsDown, X, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function Remarks() {
  const [user, setUser] = useState(null);
  const [remarks, setRemarks] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRemark, setSelectedRemark] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

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

      if (currentUser.account_type !== 'teacher') {
        alert("Only teachers can access this page!");
        window.location.href = '/';
        return;
      }

      // Get all remarks created by this teacher
      const allRemarks = await base44.entities.StudentRemark.list('-created_date');
      const myRemarks = allRemarks.filter(r => r.teacher_id === currentUser.id);
      setRemarks(myRemarks);

      // Get list of all students from courses
      const allCourses = await base44.entities.Course.list();
      const myCourses = allCourses.filter(c => c.teacher_id === currentUser.id);

      // Collect all unique student IDs from enrolled courses
      const studentIds = new Set();
      myCourses.forEach(course => {
        if (course.enrolled_students) {
          course.enrolled_students.forEach(id => studentIds.add(id));
        }
      });

      // Get student details (we'll need to filter from submissions or use enrolled students)
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

      setStudents(Array.from(studentMap.values()));
      setLoading(false);
    } catch (error) {
      console.error("Error loading remarks:", error);
      if (error.message && error.message.includes("logged in")) {
        base44.auth.redirectToLogin();
        return;
      }
      setLoading(false);
    }
  };

  const handleAddRemark = async (e) => {
    e.preventDefault();

    if (!remarkData.student_id || !remarkData.remark) {
      alert("Please fill in all required fields!");
      return;
    }

    try {
      const student = students.find(s => s.id === remarkData.student_id);

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

      // Notify student
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
      setShowAddModal(false);
      loadData();
      alert("Remark added successfully!");
    } catch (error) {
      console.error("Error adding remark:", error);
      alert("Failed to add remark. Please try again.");
    }
  };

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

  const filteredRemarks = remarks.filter(remark => {
    const matchesSearch = remark.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      remark.remark.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || remark.category === filterCategory;
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Student Remarks
            </h1>
            <p className="text-gray-600">
              Add and manage remarks for your students' progress, behavior, and performance
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="clay-button px-6 py-3 flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              fontWeight: '600'
            }}
          >
            <Plus className="w-5 h-5" />
            Add Remark
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
              placeholder="Search by student name or remark..."
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
              <option value="progress">Progress</option>
              <option value="behavior">Behavior</option>
              <option value="performance">Performance</option>
              <option value="attendance">Attendance</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>
      </div>

      {/* Remarks List */}
      {filteredRemarks.length === 0 ? (
        <div className="clay-card p-12 text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            {remarks.length === 0
              ? "No remarks added yet. Click 'Add Remark' to get started."
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
                      <h3 className="font-bold text-lg text-gray-800">{remark.student_name}</h3>
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
                      Added on {format(new Date(remark.created_date), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>

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
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Remark Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
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
                <button onClick={() => setShowAddModal(false)} className="clay-button p-2">
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
                    {students.map(student => (
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
                        color: remarkData.is_positive ? 'white' : undefined
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
                        color: !remarkData.is_positive ? 'white' : undefined
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
                  Add Remark
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Remark Modal */}
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
                        color: remarkData.is_positive ? 'white' : undefined
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
                        color: !remarkData.is_positive ? 'white' : undefined
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
    </div>
  );
}