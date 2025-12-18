
import React, { useState, useEffect } from "react";
import { vignan } from "@/api/vignanClient";
import { BookOpen, Plus, Users, Clock, X, Check, Trash2, Upload, FileText, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const colors = [
  '#0f172a', // Slate 900
  '#1e293b', // Slate 800
  '#334155', // Slate 700
  '#2563eb', // Blue 600
  '#1d4ed8', // Blue 700
  '#475569', // Slate 600
];

export default function Courses() {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    duration: "",
    category: "Programming",
    materials: []
  });
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuthenticated = await vignan.auth.isAuthenticated();
      if (!isAuthenticated) {
        vignan.auth.redirectToLogin();
        return;
      }

      const currentUser = await vignan.auth.me();
      setUser(currentUser);

      const allCourses = await vignan.entities.Course.list('-created_date');
      setCourses(allCourses);

      setLoading(false);
    } catch (error) {
      console.error("Error loading courses:", error);
      // If there's an authentication error, redirect to login
      if (error.message && (error.message.includes("logged in") || error.message.includes("authenticated"))) {
        vignan.auth.redirectToLogin();
        return;
      }
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeSelectedFile = (index) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return [];

    setUploadingFiles(true);
    const uploadedMaterials = [];

    try {
      for (const file of selectedFiles) {
        const { file_url } = await vignan.integrations.Core.UploadFile({ file });

        const fileName = file.name.toLowerCase();
        let fileType = "other";
        if (fileName.endsWith('.pdf')) fileType = "pdf";
        else if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) fileType = "ppt";
        else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) fileType = "doc";

        uploadedMaterials.push({
          file_url,
          file_name: file.name,
          file_type: fileType,
          uploaded_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to upload some files. Please try again.");
    } finally {
      setUploadingFiles(false);
    }

    return uploadedMaterials;
  };

  const createCourse = async (e) => {
    e.preventDefault();

    try {
      setUploadingFiles(true);

      // Upload files first
      const uploadedMaterials = await uploadFiles();

      // Create course with materials
      await vignan.entities.Course.create({
        title: newCourse.title,
        description: newCourse.description,
        duration: newCourse.duration,
        category: newCourse.category,
        teacher_id: user.id,
        teacher_name: user.full_name,
        enrolled_students: [],
        thumbnail_color: colors[Math.floor(Math.random() * colors.length)],
        course_materials: uploadedMaterials
      });

      setNewCourse({ title: "", description: "", duration: "", category: "Programming", materials: [] });
      setSelectedFiles([]);
      setShowCreateModal(false);
      loadData();
      alert("Course created successfully!");
    } catch (error) {
      console.error("Error creating course:", error);
      alert("Failed to create course. Please try again.");
    } finally {
      setUploadingFiles(false);
    }
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm("Are you sure you want to delete this course? This will also delete all related assignments and materials.")) return;

    try {
      await vignan.entities.Course.delete(courseId);

      const assignments = await vignan.entities.Assignment.filter({ course_id: courseId });
      for (const assignment of assignments) {
        await vignan.entities.Assignment.delete(assignment.id);
      }

      const materials = await vignan.entities.CourseMaterial.filter({ course_id: courseId });
      for (const material of materials) {
        await vignan.entities.CourseMaterial.delete(material.id);
      }

      loadData();
      alert("Course deleted successfully!");
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Failed to delete course. Please try again.");
    }
  };

  const deleteCourseMaterial = async (course, materialIndex) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;

    try {
      const updatedMaterials = course.course_materials.filter((_, index) => index !== materialIndex);
      await vignan.entities.Course.update(course.id, {
        course_materials: updatedMaterials
      });

      loadData();
      alert("File deleted successfully!");
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file. Please try again.");
    }
  };

  const enrollInCourse = async (courseId) => {
    try {
      const enrolledCourses = user.enrolled_courses || [];
      if (!enrolledCourses.includes(courseId)) {
        await vignan.auth.updateMe({
          enrolled_courses: [...enrolledCourses, courseId]
        });

        await vignan.entities.Notification.create({
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
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
              className="clay-button-primary px-6 py-3 flex items-center gap-2 rounded-lg"
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
              <h3 className="font-bold text-lg text-slate-800 mb-2">{course.title}</h3>
              <p className="text-sm text-slate-600 line-clamp-3">{course.description}</p>
            </div>

            <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
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

            {/* Show course materials count */}
            {course.course_materials && course.course_materials.length > 0 && (
              <div className="mb-4 p-2 rounded-lg bg-blue-50 border border-blue-100">
                <span className="text-xs text-blue-700 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {course.course_materials.length} file{course.course_materials.length !== 1 ? 's' : ''} available
                </span>
              </div>
            )}

            {user?.account_type === 'student' && (
              <div className="space-y-2">
                {!isEnrolled(course.id) ? (
                  <button
                    onClick={() => enrollInCourse(course.id)}
                    className="clay-button-primary w-full px-4 py-3 font-medium rounded-lg"
                  >
                    Enroll Now
                  </button>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-green-100 text-green-700 font-medium mb-2 border border-green-200">
                      <Check className="w-4 h-4" />
                      Enrolled
                    </div>
                    <Link
                      to={createPageUrl("CourseDetail") + "?id=" + course.id}
                      className="clay-button w-full px-4 py-3 font-medium text-slate-700 block text-center hover:bg-slate-50 border border-slate-200 rounded-lg"
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
                  className="clay-button w-full px-4 py-3 font-medium text-slate-700 block text-center hover:bg-slate-50 border border-slate-200 rounded-lg"
                >
                  Manage Course
                </Link>

                {/* Show uploaded files for teacher */}
                {course.course_materials && course.course_materials.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-gray-700">Uploaded Files:</p>
                    {course.course_materials.map((material, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <span className="text-xs text-gray-700 truncate">{material.file_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={material.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="clay-button p-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="w-3 h-3 text-blue-600" />
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCourseMaterial(course, idx);
                            }}
                            className="clay-button p-1"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

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
            onClick={() => !uploadingFiles && setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Create New Course</h2>
                <button
                  onClick={() => !uploadingFiles && setShowCreateModal(false)}
                  className="clay-button p-2"
                  disabled={uploadingFiles}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={createCourse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                    className="clay-input w-full"
                    placeholder="Enter course title"
                    disabled={uploadingFiles}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={newCourse.description}
                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                    className="clay-input w-full h-24 resize-none"
                    placeholder="Describe your course"
                    disabled={uploadingFiles}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={newCourse.duration}
                    onChange={(e) => setNewCourse({ ...newCourse, duration: e.target.value })}
                    className="clay-input w-full"
                    placeholder="e.g., 8 weeks"
                    disabled={uploadingFiles}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newCourse.category}
                    onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })}
                    className="clay-input w-full"
                    disabled={uploadingFiles}
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

                {/* File Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Upload Course Materials (PDF, PPT, DOC)
                  </label>
                  <div className="clay-card p-4 bg-slate-50 border border-slate-200">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.ppt,.pptx,.doc,.docx"
                      onChange={handleFileSelect}
                      className="clay-input w-full"
                      disabled={uploadingFiles}
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      💡 You can upload multiple files (PDF, PowerPoint, Word documents)
                    </p>
                  </div>

                  {/* Selected Files List */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium text-slate-700">Selected Files:</p>
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-700">{file.name}</span>
                            <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(index)}
                            className="clay-button p-1 hover:bg-slate-100"
                            disabled={uploadingFiles}
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploadingFiles}
                  className={`clay-button-primary w-full px-6 py-3 font-medium rounded-lg`}
                  style={{
                    opacity: uploadingFiles ? 0.7 : 1,
                    cursor: uploadingFiles ? 'not-allowed' : 'pointer'
                  }}
                >
                  {uploadingFiles ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                      Uploading Files...
                    </span>
                  ) : (
                    'Create Course'
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
