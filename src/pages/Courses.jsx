
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpen, Plus, Users, Clock, X, Check, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const colors = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #30cfd0, #330867)',
  'linear-gradient(135deg, #a8edea, #fed6e3)',
];

export default function Courses() {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    duration: "",
    category: "Programming"
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
      
      const allCourses = await base44.entities.Course.list('-created_date');
      setCourses(allCourses);
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading courses:", error);
      setLoading(false);
    }
  };

  const createCourse = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.Course.create({
        ...newCourse,
        teacher_id: user.id,
        teacher_name: user.full_name,
        enrolled_students: [],
        thumbnail_color: colors[Math.floor(Math.random() * colors.length)]
      });
      
      setNewCourse({ title: "", description: "", duration: "", category: "Programming" });
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error("Error creating course:", error);
    }
  };

  const enrollInCourse = async (courseId) => {
    try {
      const enrolledCourses = user.enrolled_courses || [];
      if (!enrolledCourses.includes(courseId)) {
        await base44.auth.updateMe({
          enrolled_courses: [...enrolledCourses, courseId]
        });
        
        await base44.entities.Notification.create({
          user_id: user.id,
          message: `You've enrolled in a new course!`,
          type: "course",
          read: false
        });
        
        loadData();
      }
    } catch (error) {
      console.error("Error enrolling:", error);
    }
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm("Are you sure you want to delete this course? This will also delete all related assignments and materials.")) return;
    
    try {
      await base44.entities.Course.delete(courseId);
      
      const assignments = await base44.entities.Assignment.filter({ course_id: courseId });
      for (const assignment of assignments) {
        await base44.entities.Assignment.delete(assignment.id);
      }
      
      const materials = await base44.entities.CourseMaterial.filter({ course_id: courseId });
      for (const material of materials) {
        await base44.entities.CourseMaterial.delete(material.id);
      }
      
      loadData();
    } catch (error) {
      console.error("Error deleting course:", error);
    }
  };

  const isEnrolled = (courseId) => {
    return user?.enrolled_courses?.includes(courseId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="clay-card p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Courses
            </h1>
            <p className="text-gray-600">
              {user?.account_type === 'teacher' 
                ? "Manage your courses and create new ones"
                : "Browse and enroll in available courses"}
            </p>
          </div>
          {user?.account_type === 'teacher' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="clay-button px-6 py-3 flex items-center gap-2 text-purple-600 font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Course
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course, index) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="clay-card p-6 hover:scale-[1.02] transition-transform"
          >
            <div className="w-full h-32 rounded-2xl mb-4 flex items-center justify-center" style={{
              background: course.thumbnail_color || colors[index % colors.length]
            }}>
              <BookOpen className="w-16 h-16 text-white" />
            </div>

            <div className="mb-4">
              <h3 className="font-bold text-lg text-gray-800 mb-2">{course.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-3">{course.description}</p>
            </div>

            <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {course.teacher_name}
              </span>
              {course.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {course.duration}
                </span>
              )}
            </div>

            {user?.account_type === 'student' && (
              <div className="space-y-2">
                {!isEnrolled(course.id) ? (
                  <button
                    onClick={() => enrollInCourse(course.id)}
                    className="clay-button w-full px-4 py-3 font-medium text-purple-600"
                  >
                    Enroll Now
                  </button>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-green-100 text-green-700 font-medium mb-2">
                      <Check className="w-4 h-4" />
                      Enrolled
                    </div>
                    <Link
                      to={createPageUrl("CourseDetail") + "?id=" + course.id}
                      className="clay-button w-full px-4 py-3 font-medium text-blue-600 block text-center"
                    >
                      📚 Start Learning
                    </Link>
                  </>
                )}
              </div>
            )}

            {user?.account_type === 'teacher' && course.teacher_id === user.id && (
              <div className="space-y-2">
                <Link
                  to={createPageUrl("CourseDetail") + "?id=" + course.id}
                  className="clay-button w-full px-4 py-3 font-medium text-purple-600 block text-center"
                >
                  Manage Course
                </Link>
                <button
                  onClick={() => deleteCourse(course.id)}
                  className="clay-button w-full px-4 py-3 font-medium text-red-600 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Course
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

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
                <h2 className="text-2xl font-bold text-gray-800">Create New Course</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="clay-button p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={createCourse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                    className="clay-input w-full"
                    placeholder="Enter course title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    required
                    value={newCourse.description}
                    onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                    className="clay-input w-full h-24 resize-none"
                    placeholder="Describe your course"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={newCourse.duration}
                    onChange={(e) => setNewCourse({...newCourse, duration: e.target.value})}
                    className="clay-input w-full"
                    placeholder="e.g., 8 weeks"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newCourse.category}
                    onChange={(e) => setNewCourse({...newCourse, category: e.target.value})}
                    className="clay-input w-full"
                  >
                    <option value="Programming">Programming</option>
                    <option value="Design">Design</option>
                    <option value="Business">Business</option>
                    <option value="Science">Science</option>
                    <option value="Math">Math</option>
                    <option value="Language">Language</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="clay-button w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-2xl"
                >
                  Create Course
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
