
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Megaphone, Plus, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

const priorityColors = {
  low: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  urgent: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
};

export default function Circulars() {
  const [user, setUser] = useState(null);
  const [circulars, setCirculars] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newCircular, setNewCircular] = useState({
    title: "",
    content: "",
    priority: "medium",
    course_id: "",
    target_audience: "all"
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const allCirculars = await base44.entities.Circular.list('-created_date');
      setCirculars(allCirculars);

      const allCourses = await base44.entities.Course.list();
      setCourses(allCourses);

      setLoading(false);
    } catch (error) {
      console.error("Error loading circulars:", error);
      setLoading(false);
    }
  };

  const createCircular = async (e) => {
    e.preventDefault();
    try {
      const course = courses.find(c => c.id === newCircular.course_id);

      await base44.entities.Circular.create({
        ...newCircular,
        author_id: user.id,
        author_name: user.full_name,
        course_title: course?.title || ""
      });

      // Create notifications only for enrolled students if course is selected
      // Avoid listing all users due to permission restrictions
      if (newCircular.course_id && course) {
        const enrolledStudents = course.enrolled_students || [];
        for (const studentId of enrolledStudents) {
          try {
            await base44.entities.Notification.create({
              user_id: studentId,
              message: `New announcement: ${newCircular.title}`,
              type: "circular",
              read: false
            });
          } catch (err) {
            console.error("Error creating notification:", err);
          }
        }
      }

      setNewCircular({
        title: "",
        content: "",
        priority: "medium",
        course_id: "",
        target_audience: "all"
      });
      setShowCreateModal(false);
      loadData();
      alert("Circular posted successfully!");
    } catch (error) {
      console.error("Error creating circular:", error);
      alert("Failed to post circular. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pink-600" />
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
              Announcements & Circulars
            </h1>
            <p className="text-slate-600">
              {user?.account_type === 'teacher'
                ? "Post important announcements and circulars for students"
                : "Stay updated with the latest announcements"}
            </p>
          </div>
          {user?.account_type === 'teacher' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="clay-button-primary px-6 py-3 flex items-center gap-2 rounded-lg"
            >
              <Plus className="w-5 h-5" />
              Post Circular
            </button>
          )}
        </div>
      </div>

      {/* Circulars List */}
      <div className="space-y-6">
        {circulars.length === 0 ? (
          <div className="clay-card p-12 text-center">
            <Megaphone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No announcements yet</p>
          </div>
        ) : (
          circulars.map((circular, index) => {
            const colors = priorityColors[circular.priority] || priorityColors.medium;

            return (
              <motion.div
                key={circular.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`clay-card p-6 border-l-4 ${colors.border}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors.bg}`}>
                      <Megaphone className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-gray-800">{circular.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {circular.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{circular.content}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span>Posted by {circular.author_name}</span>
                        <span>•</span>
                        <span>{format(new Date(circular.created_date), 'MMM d, yyyy h:mm a')}</span>
                        {circular.course_id && (
                          <>
                            <span>•</span>
                            <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                              {circular.course_title || 'Course'}
                            </span>
                          </>
                        )}
                        {circular.target_audience && circular.target_audience !== 'all' && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{circular.target_audience}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Create Circular Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Post Circular</h2>
                <button onClick={() => setShowCreateModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={createCircular} className="space-y-4">
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
                    {courses.filter(c => c.teacher_id === user?.id).map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="clay-button-primary w-full px-6 py-3 rounded-lg"
                >
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
