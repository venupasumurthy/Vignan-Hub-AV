
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Play, Plus, Edit, Trash2, Search, Filter, Clock, Calendar, Link as LinkIcon, X, Save, ExternalLink, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function CourseResources() {
  const [user, setUser] = useState(null);
  const [resources, setResources] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [resourceData, setResourceData] = useState({
    course_id: "",
    resource_title: "",
    resource_type: "youtube_live",
    url: "",
    subject_topic: "",
    class_date: "",
    class_time: "",
    purpose: "",
    task: "",
    is_live: true
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

      const allCourses = await base44.entities.Course.list();
      const allResources = await base44.entities.CourseResource.list('-created_date');

      if (currentUser.account_type === 'teacher') {
        // TEACHER VIEW
        const myCourses = allCourses.filter(c => c.teacher_id === currentUser.id);
        setCourses(myCourses);

        const myResources = allResources.filter(r => r.teacher_id === currentUser.id);
        setResources(myResources);
      } else {
        // STUDENT VIEW
        const enrolledCourseIds = currentUser.enrolled_courses || [];
        const enrolledCourses = allCourses.filter(c => enrolledCourseIds.includes(c.id));
        setCourses(enrolledCourses);

        // Show resources only from enrolled courses
        // Also ensure the resource itself has a course_id that exists in the enrolled courses
        const studentResources = allResources.filter(r => enrolledCourseIds.includes(r.course_id));
        setResources(studentResources);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading resources:", error);
      if (error.message && error.message.includes("logged in")) {
        base44.auth.redirectToLogin();
        return;
      }
      setLoading(false);
    }
  };

  const handleAddResource = async (e) => {
    e.preventDefault();

    if (!resourceData.course_id || !resourceData.resource_title || !resourceData.url) {
      alert("Please fill in all required fields!");
      return;
    }

    try {
      const course = courses.find(c => c.id === resourceData.course_id);

      await base44.entities.CourseResource.create({
        ...resourceData,
        course_title: course.title,
        teacher_id: user.id,
        teacher_name: user.full_name
      });

      // Notify enrolled students
      if (course.enrolled_students && course.enrolled_students.length > 0) {
        for (const studentId of course.enrolled_students) {
          await base44.entities.Notification.create({
            user_id: studentId,
            message: `New ${resourceData.is_live ? 'live class' : 'resource'} added in ${course.title}: ${resourceData.resource_title}`,
            type: "course",
            read: false
          });
        }
      }

      setResourceData({
        course_id: "",
        resource_title: "",
        resource_type: "youtube_live",
        url: "",
        subject_topic: "",
        class_date: "",
        class_time: "",
        purpose: "",
        task: "",
        is_live: true
      });
      setShowAddModal(false);
      loadData();
      alert("Class link added successfully! Students can now see it.");
    } catch (error) {
      console.error("Error adding resource:", error);
      alert("Failed to add resource. Please try again.");
    }
  };

  const handleEditResource = async (e) => {
    e.preventDefault();

    try {
      const course = courses.find(c => c.id === resourceData.course_id);

      await base44.entities.CourseResource.update(selectedResource.id, {
        ...resourceData,
        course_title: course.title
      });

      setResourceData({
        course_id: "",
        resource_title: "",
        resource_type: "youtube_live",
        url: "",
        subject_topic: "",
        class_date: "",
        class_time: "",
        purpose: "",
        task: "",
        is_live: true
      });
      setSelectedResource(null);
      setShowEditModal(false);
      loadData();
      alert("Class link updated successfully!");
    } catch (error) {
      console.error("Error updating resource:", error);
      alert("Failed to update resource. Please try again.");
    }
  };

  const deleteResource = async (resourceId) => {
    if (!window.confirm("Are you sure you want to delete this class link?")) return;

    try {
      await base44.entities.CourseResource.delete(resourceId);
      loadData();
      alert("Class link deleted successfully!");
    } catch (error) {
      console.error("Error deleting resource:", error);
      alert("Failed to delete class link.");
    }
  };

  const openEditModal = (resource) => {
    setSelectedResource(resource);
    setResourceData({
      course_id: resource.course_id,
      resource_title: resource.resource_title,
      resource_type: resource.resource_type,
      url: resource.url,
      subject_topic: resource.subject_topic || "",
      class_date: resource.class_date || "",
      class_time: resource.class_time || "",
      purpose: resource.purpose || "",
      task: resource.task || "",
      is_live: resource.is_live !== undefined ? resource.is_live : true
    });
    setShowEditModal(true);
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.resource_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.subject_topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.course_title?.toLowerCase().includes(searchQuery.toLowerCase()); // Added course_title to search
    const matchesCourse = filterCourse === "all" || resource.course_id === filterCourse;
    const matchesStatus = filterStatus === "all" ||
      (filterStatus === "live" && resource.is_live) ||
      (filterStatus === "recorded" && !resource.is_live);

    return matchesSearch && matchesCourse && matchesStatus;
  });

  // Separate live and recorded classes
  const liveClasses = filteredResources.filter(r => r.is_live);
  const recordedClasses = filteredResources.filter(r => !r.is_live);

  // Helper function to extract YouTube video ID
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2] && match[2].length === 11) ? match[2] : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600" />
      </div>
    );
  }

  // STUDENT VIEW
  if (user?.account_type === 'student') {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="clay-card p-8 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent mb-2">
              🎥 Live Classes & Recordings
            </h1>
            <p className="text-gray-600">
              Watch live classes and access recorded lectures from your enrolled courses
            </p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="clay-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r from-red-500 to-pink-500">
                <Clock className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{liveClasses.length}</p>
                <p className="text-sm text-gray-600">Live Classes</p>
              </div>
            </div>
          </div>

          <div className="clay-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{recordedClasses.length}</p>
                <p className="text-sm text-gray-600">Recorded Classes</p>
              </div>
            </div>
          </div>

          <div className="clay-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r from-green-500 to-teal-500">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{courses.length}</p>
                <p className="text-sm text-gray-600">Enrolled Courses</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="clay-card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="clay-input w-full !pl-14"
              />
            </div>

            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="clay-input w-full"
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="clay-input w-full"
            >
              <option value="all">All Classes</option>
              <option value="live">Live Only</option>
              <option value="recorded">Recorded Only</option>
            </select>
          </div>
        </div>

        {/* Live Classes Section */}
        {liveClasses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-red-600 animate-pulse" />
              🔴 Live Classes
            </h2>

            <div className="grid gap-6">
              {liveClasses.map((resource, index) => (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="clay-card p-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-red-200 flex-shrink-0">
                      <Clock className="w-8 h-8 text-red-700 animate-pulse" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-xl text-gray-800">{resource.resource_title}</h3>
                        <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                          LIVE NOW
                        </span>
                      </div>

                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                          📚 {resource.course_title}
                        </span>
                        {resource.subject_topic && (
                          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                            {resource.subject_topic}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                        {resource.class_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(resource.class_date), 'MMM d, yyyy')}
                          </span>
                        )}
                        {resource.class_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {resource.class_time}
                          </span>
                        )}
                        {resource.teacher_name && (
                          <span className="text-xs text-gray-500">
                            By {resource.teacher_name}
                          </span>
                        )}
                      </div>

                      {resource.purpose && (
                        <div className="mb-3 p-3 rounded-lg bg-white/50">
                          <p className="text-sm font-medium text-gray-700 mb-1">📌 Purpose:</p>
                          <p className="text-sm text-gray-600">{resource.purpose}</p>
                        </div>
                      )}

                      {resource.task && (
                        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                          <p className="text-sm font-medium text-gray-700 mb-1">✏️ Your Task:</p>
                          <p className="text-sm text-gray-600">{resource.task}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Join Button */}
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="clay-button w-full px-6 py-4 font-bold text-center flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl hover:scale-105 transition-transform mb-4"
                  >
                    <Play className="w-6 h-6" />
                    Join Live Class Now
                    <ExternalLink className="w-5 h-5" />
                  </a>

                  {/* YouTube Embed */}
                  {getYouTubeVideoId(resource.url) && (
                    <div className="aspect-video rounded-xl overflow-hidden border-2 border-red-300">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${getYouTubeVideoId(resource.url)}`}
                        title={resource.resource_title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Recorded Classes Section */}
        {recordedClasses.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Play className="w-6 h-6 text-blue-600" />
              📹 Recorded Classes
            </h2>

            <div className="grid gap-6">
              {recordedClasses.map((resource, index) => (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="clay-card p-6 bg-gradient-to-r from-blue-50 to-purple-50"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-blue-200 flex-shrink-0">
                      <Play className="w-8 h-8 text-blue-700" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-xl text-gray-800">{resource.resource_title}</h3>
                        <span className="px-3 py-1 rounded-full bg-gray-500 text-white text-xs font-bold">
                          RECORDED
                        </span>
                      </div>

                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                          📚 {resource.course_title}
                        </span>
                        {resource.subject_topic && (
                          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                            {resource.subject_topic}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                        {resource.class_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(resource.class_date), 'MMM d, yyyy')}
                          </span>
                        )}
                        {resource.class_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {resource.class_time}
                          </span>
                        )}
                        {resource.teacher_name && (
                          <span className="text-xs text-gray-500">
                            By {resource.teacher_name}
                          </span>
                        )}
                      </div>

                      {resource.purpose && (
                        <div className="mb-3 p-3 rounded-lg bg-white/50">
                          <p className="text-sm font-medium text-gray-700 mb-1">📌 Purpose:</p>
                          <p className="text-sm text-gray-600">{resource.purpose}</p>
                        </div>
                      )}

                      {resource.task && (
                        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                          <p className="text-sm font-medium text-gray-700 mb-1">✏️ Your Task:</p>
                          <p className="text-sm text-gray-600">{resource.task}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Watch Button */}
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="clay-button w-full px-6 py-4 font-bold text-center flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl hover:scale-105 transition-transform mb-4"
                  >
                    <Play className="w-6 h-6" />
                    Watch Recording
                    <ExternalLink className="w-5 h-5" />
                  </a>

                  {/* YouTube Embed */}
                  {getYouTubeVideoId(resource.url) && (
                    <div className="aspect-video rounded-xl overflow-hidden border-2 border-blue-300">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${getYouTubeVideoId(resource.url)}`}
                        title={resource.resource_title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* No Classes Message */}
        {filteredResources.length === 0 && (
          <div className="clay-card p-12 text-center">
            <Play className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-2">
              {resources.length === 0
                ? "No classes available yet. Your teachers haven't posted any live or recorded classes."
                : "No classes match your search criteria."}
            </p>
            <p className="text-sm text-gray-400">
              Check back later for new live sessions and recordings!
            </p>
          </div>
        )}
      </div>
    );
  }

  // TEACHER VIEW (Keep existing teacher interface)
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="clay-card p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent mb-2">
              🔴 Live Classes Management
            </h1>
            <p className="text-gray-600">
              Add and manage YouTube class links for your students
            </p>
            <p className="text-sm text-gray-500 mt-2">
              💡 Links added here will automatically appear in students' Live Classes page
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="clay-button px-6 py-3 flex items-center gap-2 bg-gradient-to-r from-red-500 to-purple-500 text-white font-medium rounded-2xl hover:scale-105 transition-transform"
          >
            <Plus className="w-5 h-5" />
            Add Class Link
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="clay-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r from-red-500 to-pink-500">
              <Clock className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{resources.filter(r => r.is_live).length}</p>
              <p className="text-sm text-gray-600">Live Classes</p>
            </div>
          </div>
        </div>

        <div className="clay-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500">
              <Play className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{resources.filter(r => !r.is_live).length}</p>
              <p className="text-sm text-gray-600">Recorded Classes</p>
            </div>
          </div>
        </div>

        <div className="clay-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r from-green-500 to-teal-500">
              <LinkIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{resources.length}</p>
              <p className="text-sm text-gray-600">Total Links</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="clay-card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="clay-input w-full !pl-14"
            />
          </div>

          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="clay-input w-full"
          >
            <option value="all">All Courses</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="clay-input w-full"
          >
            <option value="all">All Status</option>
            <option value="live">Live Only</option>
            <option value="recorded">Recorded Only</option>
          </select>
        </div>
      </div>

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <div className="clay-card p-12 text-center">
          <Play className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-2">
            {resources.length === 0
              ? "No class links created yet. Click 'Add Class Link' to get started."
              : "No classes match your search criteria."}
          </p>
          <p className="text-sm text-gray-400">
            Add YouTube links for live sessions or recorded lectures
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredResources.map((resource, index) => (
            <motion.div
              key={resource.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`clay-card p-6 ${resource.is_live
                ? 'bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200'
                : 'bg-gradient-to-r from-blue-50 to-purple-50'
                }`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${resource.is_live ? 'bg-red-200' : 'bg-blue-200'
                    }`}>
                    {resource.is_live ? (
                      <Clock className="w-8 h-8 text-red-700 animate-pulse" />
                    ) : (
                      <Play className="w-8 h-8 text-blue-700" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-xl text-gray-800">{resource.resource_title}</h3>
                      {resource.is_live && (
                        <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                          LIVE
                        </span>
                      )}
                      {!resource.is_live && (
                        <span className="px-3 py-1 rounded-full bg-gray-500 text-white text-xs font-bold">
                          RECORDED
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                        {resource.course_title}
                      </span>
                    </div>

                    {resource.subject_topic && (
                      <p className="text-base font-medium text-gray-700 mb-2">
                        📚 Subject/Topic: {resource.subject_topic}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                      {resource.class_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(resource.class_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {resource.class_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {resource.class_time}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-white/70 border border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                          <LinkIcon className="w-4 h-4" />
                          YouTube Link:
                        </p>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline break-all flex items-center gap-2"
                        >
                          {resource.url}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>

                      {resource.purpose && (
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                          <p className="text-sm font-semibold text-gray-700 mb-1">📌 Purpose:</p>
                          <p className="text-sm text-gray-700">{resource.purpose}</p>
                        </div>
                      )}

                      {resource.task && (
                        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-300">
                          <p className="text-sm font-semibold text-gray-700 mb-1">✏️ Task:</p>
                          <p className="text-sm text-gray-700">{resource.task}</p>
                        </div>
                      )}
                    </div>

                    {/* Formatted Display */}
                    <div className="mt-4 p-4 rounded-lg bg-gray-50 border-2 border-gray-300">
                      <p className="text-xs font-bold text-gray-500 mb-2">📋 STUDENT VIEW FORMAT:</p>
                      <div className="space-y-1 text-sm text-gray-700 font-mono">
                        <p className="border-b border-gray-300 pb-2">---------------------------------</p>
                        <p><strong>Resource Title:</strong> {resource.resource_title}</p>
                        <p><strong>Resource Link:</strong> {resource.url}</p>
                        <p><strong>Purpose:</strong> {resource.purpose || 'N/A'}</p>
                        <p><strong>Task:</strong> {resource.task || 'N/A'}</p>
                        <p className="border-t border-gray-300 pt-2">---------------------------------</p>
                      </div>
                    </div>

                    {/* YouTube Embed Preview */}
                    {getYouTubeVideoId(resource.url) && (
                      <div className="mt-4 aspect-video rounded-xl overflow-hidden border-2 border-gray-300">
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${getYouTubeVideoId(resource.url)}`}
                          title={resource.resource_title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="clay-button p-3"
                    title="Open in YouTube"
                  >
                    <ExternalLink className="w-5 h-5 text-purple-600" />
                  </a>
                  <button
                    onClick={() => openEditModal(resource)}
                    className="clay-button p-3"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5 text-blue-600" />
                  </button>
                  <button
                    onClick={() => deleteResource(resource.id)}
                    className="clay-button p-3"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Resource Modal */}
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
              className="clay-card p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Add Live Class Link</h2>
                <button onClick={() => setShowAddModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddResource} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Course *
                  </label>
                  <select
                    required
                    value={resourceData.course_id}
                    onChange={(e) => setResourceData({ ...resourceData, course_id: e.target.value })}
                    className="clay-input w-full"
                  >
                    <option value="">Choose a course...</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Students enrolled in this course will see the link in their Live Classes page
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={resourceData.resource_title}
                    onChange={(e) => setResourceData({ ...resourceData, resource_title: e.target.value })}
                    className="clay-input w-full"
                    placeholder="e.g., Introduction to React Hooks - Live Session"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject / Topic Name
                  </label>
                  <input
                    type="text"
                    value={resourceData.subject_topic}
                    onChange={(e) => setResourceData({ ...resourceData, subject_topic: e.target.value })}
                    className="clay-input w-full"
                    placeholder="e.g., React Fundamentals, JavaScript ES6"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class Date
                    </label>
                    <input
                      type="date"
                      value={resourceData.class_date}
                      onChange={(e) => setResourceData({ ...resourceData, class_date: e.target.value })}
                      className="clay-input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class Time
                    </label>
                    <input
                      type="time"
                      value={resourceData.class_time}
                      onChange={(e) => setResourceData({ ...resourceData, class_time: e.target.value })}
                      className="clay-input w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    YouTube Link *
                  </label>
                  <input
                    type="url"
                    required
                    value={resourceData.url}
                    onChange={(e) => setResourceData({ ...resourceData, url: e.target.value })}
                    className="clay-input w-full"
                    placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste the YouTube link here (live stream or recorded video)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={resourceData.is_live.toString()}
                    onChange={(e) => setResourceData({ ...resourceData, is_live: e.target.value === 'true' })}
                    className="clay-input w-full"
                  >
                    <option value="true">🔴 Live Class (Ongoing or Scheduled)</option>
                    <option value="false">📹 Recorded Class (Past/Archive)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Why this resource is useful (Purpose) - 2 lines
                  </label>
                  <textarea
                    value={resourceData.purpose}
                    onChange={(e) => setResourceData({ ...resourceData, purpose: e.target.value })}
                    className="clay-input w-full h-20 resize-none"
                    placeholder="Explain in 2 lines why this class is useful for students..."
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    One task for students after watching
                  </label>
                  <textarea
                    value={resourceData.task}
                    onChange={(e) => setResourceData({ ...resourceData, task: e.target.value })}
                    className="clay-input w-full h-20 resize-none"
                    placeholder="One task students should complete after watching this class..."
                    maxLength={150}
                  />
                </div>

                <div className="clay-card p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-purple-200">
                  <h4 className="font-bold text-sm text-gray-800 mb-2">📋 Preview (How students will see it):</h4>
                  <div className="text-xs text-gray-700 space-y-1 font-mono">
                    <p className="border-b border-gray-400 pb-1">---------------------------------</p>
                    <p><strong>Resource Title:</strong> {resourceData.resource_title || '<Class Title>'}</p>
                    <p><strong>Resource Link:</strong> {resourceData.url || '<YouTube Link>'}</p>
                    <p><strong>Purpose:</strong> {resourceData.purpose || '<Why this is useful>'}</p>
                    <p><strong>Task:</strong> {resourceData.task || '<Student task>'}</p>
                    <p className="border-t border-gray-400 pt-1">---------------------------------</p>
                  </div>
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
                  <Save className="w-5 h-5" />
                  Add Class Link
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Resource Modal */}
      <AnimatePresence>
        {showEditModal && selectedResource && (
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
              className="clay-card p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Edit Class Link</h2>
                <button onClick={() => setShowEditModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditResource} className="space-y-4">
                {/* Same form fields as Add Modal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Course *
                  </label>
                  <select
                    required
                    value={resourceData.course_id}
                    onChange={(e) => setResourceData({ ...resourceData, course_id: e.target.value })}
                    className="clay-input w-full"
                  >
                    <option value="">Choose a course...</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={resourceData.resource_title}
                    onChange={(e) => setResourceData({ ...resourceData, resource_title: e.target.value })}
                    className="clay-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject / Topic Name
                  </label>
                  <input
                    type="text"
                    value={resourceData.subject_topic}
                    onChange={(e) => setResourceData({ ...resourceData, subject_topic: e.target.value })}
                    className="clay-input w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class Date
                    </label>
                    <input
                      type="date"
                      value={resourceData.class_date}
                      onChange={(e) => setResourceData({ ...resourceData, class_date: e.target.value })}
                      className="clay-input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class Time
                    </label>
                    <input
                      type="time"
                      value={resourceData.class_time}
                      onChange={(e) => setResourceData({ ...resourceData, class_time: e.target.value })}
                      className="clay-input w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    YouTube Link *
                  </label>
                  <input
                    type="url"
                    required
                    value={resourceData.url}
                    onChange={(e) => setResourceData({ ...resourceData, url: e.target.value })}
                    className="clay-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={resourceData.is_live.toString()}
                    onChange={(e) => setResourceData({ ...resourceData, is_live: e.target.value === 'true' })}
                    className="clay-input w-full"
                  >
                    <option value="true">🔴 Live Class</option>
                    <option value="false">📹 Recorded Class</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purpose (2 lines)
                  </label>
                  <textarea
                    value={resourceData.purpose}
                    onChange={(e) => setResourceData({ ...resourceData, purpose: e.target.value })}
                    className="clay-input w-full h-20 resize-none"
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task for Students
                  </label>
                  <textarea
                    value={resourceData.task}
                    onChange={(e) => setResourceData({ ...resourceData, task: e.target.value })}
                    className="clay-input w-full h-20 resize-none"
                    maxLength={150}
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
                  Update Class Link
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
