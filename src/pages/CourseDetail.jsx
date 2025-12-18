
import React, { useState, useEffect } from "react";
import { vignan } from "@/api/vignanClient";
import { useLocation } from "react-router-dom";
import {
  BookOpen, Download, MessageCircle, Upload, X, Send,
  FileText, Trash2, ArrowLeft, Users, CheckCircle,
  Plus, Play, Clock, Edit, Calendar, Link as LinkIcon, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CourseDetail() {
  const [user, setUser] = useState(null);
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showEditResourceModal, setShowEditResourceModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const location = useLocation();
  const courseId = new URLSearchParams(location.search).get('id');

  const [newMaterial, setNewMaterial] = useState({
    title: "",
    description: "",
    file: null
  });

  const [newQuestion, setNewQuestion] = useState({
    title: "",
    content: ""
  });

  const [resourceData, setResourceData] = useState({
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
  }, [courseId]);

  const loadData = async () => {
    try {
      const currentUser = await vignan.auth.me();
      setUser(currentUser);

      const courseData = await vignan.entities.Course.list();
      const foundCourse = courseData.find(c => c.id === courseId);
      setCourse(foundCourse);

      if (currentUser.completed_courses && currentUser.completed_courses.includes(courseId)) {
        setIsCompleted(true);
      }

      const allMaterials = await vignan.entities.CourseMaterial.list('-created_date');
      const courseMaterials = allMaterials.filter(m => m.course_id === courseId);
      setMaterials(courseMaterials);

      const allDiscussions = await vignan.entities.Discussion.list('-created_date');
      const courseDiscussions = allDiscussions.filter(d => d.course_id === courseId);
      setDiscussions(courseDiscussions);

      const allResources = await vignan.entities.CourseResource.list('-created_date');
      const courseResources = allResources.filter(r => r.course_id === courseId);
      setResources(courseResources);

      setLoading(false);
    } catch (error) {
      console.error("Error loading course:", error);
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!newMaterial.file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await vignan.integrations.Core.UploadFile({
        file: newMaterial.file
      });

      const fileName = newMaterial.file.name.toLowerCase();
      let fileType = "other";
      if (fileName.endsWith('.pdf')) fileType = "pdf";
      else if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) fileType = "ppt";
      else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) fileType = "doc";

      await vignan.entities.CourseMaterial.create({
        course_id: courseId,
        course_title: course.title,
        title: newMaterial.title,
        description: newMaterial.description,
        file_url: file_url,
        file_type: fileType,
        uploaded_by_id: user.id,
        uploaded_by_name: user.full_name
      });

      if (course.enrolled_students && course.enrolled_students.length > 0) {
        for (const studentId of course.enrolled_students) {
          await vignan.entities.Notification.create({
            user_id: studentId,
            message: `New material uploaded in ${course.title}: ${newMaterial.title}`,
            type: "course",
            read: false
          });
        }
      }

      setNewMaterial({ title: "", description: "", file: null });
      setShowUploadModal(false);
      loadData();
      alert("Material uploaded successfully!");
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    try {
      await vignan.entities.Discussion.create({
        course_id: courseId,
        course_title: course.title,
        author_id: user.id,
        author_name: user.full_name,
        author_role: user.account_type,
        title: newQuestion.title,
        content: newQuestion.content,
        replies: []
      });

      await vignan.entities.Notification.create({
        user_id: course.teacher_id,
        message: `New question in ${course.title}: ${newQuestion.title}`,
        type: "course",
        read: false
      });

      setNewQuestion({ title: "", content: "" });
      setShowQuestionModal(false);
      loadData();
      alert("Question posted successfully!");
    } catch (error) {
      console.error("Error posting question:", error);
      alert("Failed to post question. Please try again.");
    }
  };

  const handleReply = async (discussionId, replyContent) => {
    try {
      const discussion = discussions.find(d => d.id === discussionId);
      const replies = discussion.replies || [];

      replies.push({
        author_id: user.id,
        author_name: user.full_name,
        content: replyContent,
        created_at: new Date().toISOString()
      });

      await vignan.entities.Discussion.update(discussionId, { replies });

      if (discussion.author_id !== user.id) {
        await vignan.entities.Notification.create({
          user_id: discussion.author_id,
          message: `${user.full_name} replied to your question in ${course.title}`,
          type: "course",
          read: false
        });
      }

      loadData();
    } catch (error) {
      console.error("Error replying:", error);
    }
  };

  const deleteMaterial = async (materialId) => {
    if (!window.confirm("Are you sure you want to delete this material?")) return;

    try {
      await vignan.entities.CourseMaterial.delete(materialId);
      loadData();
      alert("Material deleted successfully!");
    } catch (error) {
      console.error("Error deleting material:", error);
      alert("Failed to delete material.");
    }
  };

  const handleAddResource = async (e) => {
    e.preventDefault();

    if (!resourceData.resource_title || !resourceData.url) {
      alert("Please fill in the resource title and URL!");
      return;
    }

    try {
      await vignan.entities.CourseResource.create({
        course_id: courseId,
        course_title: course.title,
        teacher_id: user.id,
        teacher_name: user.full_name,
        ...resourceData
      });

      if (course.enrolled_students && course.enrolled_students.length > 0) {
        for (const studentId of course.enrolled_students) {
          await vignan.entities.Notification.create({
            user_id: studentId,
            message: `New ${resourceData.is_live ? 'live class' : 'resource'} added in ${course.title}: ${resourceData.resource_title}`,
            type: "course",
            read: false
          });
        }
      }

      setResourceData({
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
      setShowResourceModal(false);
      loadData();
      alert("Resource added successfully!");
    } catch (error) {
      console.error("Error adding resource:", error);
      alert("Failed to add resource. Please try again.");
    }
  };

  const handleEditResource = async (e) => {
    e.preventDefault();

    try {
      await vignan.entities.CourseResource.update(selectedResource.id, resourceData);

      setResourceData({
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
      setShowEditResourceModal(false);
      loadData();
      alert("Resource updated successfully!");
    } catch (error) {
      console.error("Error updating resource:", error);
      alert("Failed to update resource. Please try again.");
    }
  };

  const deleteResource = async (resourceId) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) return;

    try {
      await vignan.entities.CourseResource.delete(resourceId);
      loadData();
      alert("Resource deleted successfully!");
    } catch (error) {
      console.error("Error deleting resource:", error);
      alert("Failed to delete resource.");
    }
  };

  const openEditResourceModal = (resource) => {
    setSelectedResource(resource);
    setResourceData({
      resource_title: resource.resource_title,
      resource_type: resource.resource_type,
      url: resource.url,
      subject_topic: resource.subject_topic || "",
      class_date: resource.class_date || "",
      class_time: resource.class_time || "",
      purpose: resource.purpose || "",
      task: resource.task || "",
      is_live: resource.is_live || false
    });
    setShowEditResourceModal(true);
  };

  const markCourseComplete = async () => {
    try {
      const completedCourses = user.completed_courses || [];

      if (!completedCourses.includes(courseId)) {
        await vignan.auth.updateMe({
          completed_courses: [...completedCourses, courseId],
          points: (user.points || 0) + 50
        });

        await vignan.entities.Notification.create({
          user_id: user.id,
          message: `Congratulations! You completed ${course.title} and earned 50 points!`,
          type: "course",
          read: false
        });

        setIsCompleted(true);
        loadData();
        alert("🎉 Congratulations! You've completed this course and earned 50 points!");
      }
    } catch (error) {
      console.error("Error marking course complete:", error);
      alert("Failed to mark course as complete.");
    }
  };

  // Helper function to extract YouTube video ID
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2] && match[2].length === 11) ? match[2] : null;
  };

  const isEnrolled = user?.enrolled_courses?.includes(courseId);
  const isTeacher = user?.account_type === 'teacher' && course?.teacher_id === user?.id;

  // Separate live and recorded resources
  const liveResources = resources.filter(r => r.is_live);
  const recordedResources = resources.filter(r => !r.is_live);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Course not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="clay-card p-8 mb-8">
        <Link to={createPageUrl("Courses")} className="clay-button px-4 py-2 mb-4 inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </Link>

        <div className="flex items-start gap-6 mt-4">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center flex-shrink-0 bg-slate-900 text-white">
            <BookOpen className="w-12 h-12" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">{course.title}</h1>
              {isCompleted && (
                <span className="px-4 py-2 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-2 border border-green-200">
                  <CheckCircle className="w-5 h-5" />
                  Completed
                </span>
              )}
            </div>
            <p className="text-slate-600 mb-4">{course.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-2 text-slate-500">
                <Users className="w-4 h-4" />
                {course.teacher_name}
              </span>
              {course.duration && (
                <span className="text-slate-500">{course.duration}</span>
              )}
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                {course.enrolled_students?.length || 0} students enrolled
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {isTeacher && (
              <>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="clay-button px-6 py-3 flex items-center gap-2 text-blue-600 font-medium hover:bg-blue-50"
                >
                  <Upload className="w-5 h-5" />
                  Upload Material
                </button>
                <button
                  onClick={() => setShowResourceModal(true)}
                  className="clay-button-primary px-6 py-3 flex items-center gap-2 rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                  Add Class Link
                </button>
              </>
            )}

            {isEnrolled && user?.account_type === 'student' && !isCompleted && (
              <button
                onClick={markCourseComplete}
                className="clay-button-success px-6 py-3 flex items-center gap-2 rounded-lg"
              >
                <CheckCircle className="w-5 h-5" />
                Mark as Complete
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Live Classes Section */}
          {(isEnrolled || isTeacher) && liveResources.length > 0 && (
            <div className="clay-card p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-red-600 animate-pulse" />
                🔴 Live Classes
              </h2>

              <div className="space-y-4">
                {liveResources.map((resource, index) => (
                  <motion.div
                    key={resource.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 rounded-2xl bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-red-200">
                          <Clock className="w-7 h-7 text-red-700 animate-pulse" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg text-gray-800">{resource.resource_title}</h3>
                            <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                              LIVE NOW
                            </span>
                          </div>

                          {resource.subject_topic && (
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              📚 {resource.subject_topic}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 mb-3">
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
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="clay-button flex-1 px-6 py-3 font-medium text-center flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl hover:scale-105 transition-transform"
                      >
                        <Play className="w-5 h-5" />
                        Join Live Class Now
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      {isTeacher && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditResourceModal(resource)}
                            className="clay-button p-3"
                          >
                            <Edit className="w-5 h-5 text-blue-600" />
                          </button>
                          <button
                            onClick={() => deleteResource(resource.id)}
                            className="clay-button p-3"
                          >
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* YouTube Embed for live */}
                    {resource.url && getYouTubeVideoId(resource.url) && (
                      <div className="mt-4 aspect-video rounded-xl overflow-hidden">
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
          {(isEnrolled || isTeacher) && recordedResources.length > 0 && (
            <div className="clay-card p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Play className="w-6 h-6 text-blue-600" />
                📹 Recorded Classes
              </h2>

              <div className="space-y-4">
                {recordedResources.map((resource, index) => (
                  <motion.div
                    key={resource.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-blue-200">
                          <Play className="w-7 h-7 text-blue-700" />
                        </div>

                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-800 mb-2">{resource.resource_title}</h3>

                          {resource.subject_topic && (
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              📚 {resource.subject_topic}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 mb-3">
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
                            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                              Recorded
                            </span>
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
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="clay-button flex-1 px-6 py-3 font-medium text-center flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl hover:scale-105 transition-transform"
                      >
                        <Play className="w-5 h-5" />
                        Watch Recording
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      {isTeacher && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditResourceModal(resource)}
                            className="clay-button p-3"
                          >
                            <Edit className="w-5 h-5 text-blue-600" />
                          </button>
                          <button
                            onClick={() => deleteResource(resource.id)}
                            className="clay-button p-3"
                          >
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* YouTube Embed for recorded */}
                    {resource.url && getYouTubeVideoId(resource.url) && (
                      <div className="mt-4 aspect-video rounded-xl overflow-hidden">
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

          {/* Course Materials */}
          <div className="clay-card p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📄 Course Materials</h2>

            {materials.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No materials uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {materials.map((material, index) => (
                  <motion.div
                    key={material.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-200">
                          <FileText className="w-6 h-6 text-purple-700" />
                        </div>

                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 mb-1">{material.title}</h3>
                          {material.description && (
                            <p className="text-sm text-gray-600 mb-2">{material.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Uploaded by {material.uploaded_by_name}</span>
                            <span>•</span>
                            <span>{format(new Date(material.created_date), 'MMM d, yyyy')}</span>
                            <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 uppercase">
                              {material.file_type}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={material.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="clay-button p-2"
                        >
                          <Download className="w-5 h-5 text-purple-600" />
                        </a>

                        {isTeacher && (
                          <button
                            onClick={() => deleteMaterial(material.id)}
                            className="clay-button p-2"
                          >
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Q&A / Discussions */}
          <div className="clay-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Questions & Discussions</h2>
              {isEnrolled && (
                <button
                  onClick={() => setShowQuestionModal(true)}
                  className="clay-button-primary px-4 py-2 flex items-center gap-2 rounded-lg"
                >
                  <MessageCircle className="w-5 h-5" />
                  Ask Question
                </button>
              )}
            </div>

            {discussions.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No questions yet. Be the first to ask!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {discussions.map((discussion, index) => (
                  <DiscussionThread
                    key={discussion.id}
                    discussion={discussion}
                    currentUser={user}
                    onReply={handleReply}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="clay-card p-6">
            <h3 className="font-bold text-gray-800 mb-4">Course Info</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">Category:</span>
                <p className="font-medium text-gray-800">{course.category || 'General'}</p>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>
                <p className="font-medium text-gray-800">{course.duration || 'Self-paced'}</p>
              </div>
              <div>
                <span className="text-gray-500">Materials:</span>
                <p className="font-medium text-gray-800">{materials.length} files</p>
              </div>
              <div>
                <span className="text-gray-500">Live Classes:</span>
                <p className="font-medium text-gray-800 flex items-center gap-1">
                  {liveResources.length}
                  {liveResources.length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Recorded Classes:</span>
                <p className="font-medium text-gray-800">{recordedResources.length} recordings</p>
              </div>
              <div>
                <span className="text-gray-500">Discussions:</span>
                <p className="font-medium text-gray-800">{discussions.length} threads</p>
              </div>
              {isCompleted && (
                <div className="pt-3 border-t border-gray-200">
                  <span className="px-3 py-2 rounded-full bg-green-100 text-green-700 font-medium text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Course Completed!
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Material Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Upload Course Material</h2>
                <button onClick={() => setShowUploadModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Material Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newMaterial.title}
                    onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                    className="clay-input w-full"
                    placeholder="e.g., Lecture 1 Notes"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newMaterial.description}
                    onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                    className="clay-input w-full h-20 resize-none"
                    placeholder="Brief description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File (PDF, PPT, DOC)
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.ppt,.pptx,.doc,.docx"
                    onChange={(e) => setNewMaterial({ ...newMaterial, file: e.target.files[0] })}
                    className="clay-input w-full"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="clay-button w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-2xl"
                >
                  {uploadingFile ? 'Uploading...' : 'Upload Material'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ask Question Modal */}
      <AnimatePresence>
        {showQuestionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowQuestionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Ask a Question</h2>
                <button onClick={() => setShowQuestionModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAskQuestion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newQuestion.title}
                    onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                    className="clay-input w-full"
                    placeholder="What's your question about?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Details
                  </label>
                  <textarea
                    required
                    value={newQuestion.content}
                    onChange={(e) => setNewQuestion({ ...newQuestion, content: e.target.value })}
                    className="clay-input w-full h-32 resize-none"
                    placeholder="Explain your question in detail..."
                  />
                </div>

                <button
                  type="submit"
                  className="clay-button w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-2xl"
                >
                  Post Question
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Resource Modal */}
      <AnimatePresence>
        {showResourceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowResourceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Add Course Resource</h2>
                <button onClick={() => setShowResourceModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddResource} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resource Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={resourceData.resource_title}
                    onChange={(e) => setResourceData({ ...resourceData, resource_title: e.target.value })}
                    className="clay-input w-full"
                    placeholder="e.g., Introduction to React Hooks"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resource Type *
                    </label>
                    <select
                      value={resourceData.resource_type}
                      onChange={(e) => setResourceData({ ...resourceData, resource_type: e.target.value })}
                      className="clay-input w-full"
                    >
                      <option value="youtube_live">YouTube Live Class</option>
                      <option value="youtube_recorded">YouTube Recording</option>
                      <option value="external_link">External Link</option>
                      <option value="document">Document</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={resourceData.is_live.toString()} // Convert boolean to string for select
                      onChange={(e) => setResourceData({ ...resourceData, is_live: e.target.value === 'true' })}
                      className="clay-input w-full"
                    >
                      <option value="true">Live Class</option>
                      <option value="false">Recorded/Past</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL / Link *
                  </label>
                  <input
                    type="url"
                    required
                    value={resourceData.url}
                    onChange={(e) => setResourceData({ ...resourceData, url: e.target.value })}
                    className="clay-input w-full"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste the YouTube link or any external resource link
                  </p>
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
                    placeholder="e.g., React Fundamentals"
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
                    Why this resource is useful (Purpose)
                  </label>
                  <textarea
                    value={resourceData.purpose}
                    onChange={(e) => setResourceData({ ...resourceData, purpose: e.target.value })}
                    className="clay-input w-full h-20 resize-none"
                    placeholder="Explain in 2 lines why this resource is useful..."
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
                    placeholder="One task for students after watching/reading..."
                  />
                </div>

                <div className="clay-card p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                  <h4 className="font-bold text-sm text-gray-800 mb-2">Preview Format:</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Resource Title: {resourceData.resource_title || '<Your Resource Title>'}</p>
                    <p>Resource Link: {resourceData.url || '<Paste link here>'}</p>
                    <p>Purpose: {resourceData.purpose || '<Why this is useful>'}</p>
                    <p>Task: {resourceData.task || '<Student task>'}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="clay-button w-full px-6 py-3 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    fontWeight: '600'
                  }}
                >
                  Add Resource
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Resource Modal */}
      <AnimatePresence>
        {showEditResourceModal && selectedResource && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditResourceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Edit Resource</h2>
                <button onClick={() => setShowEditResourceModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditResource} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resource Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={resourceData.resource_title}
                    onChange={(e) => setResourceData({ ...resourceData, resource_title: e.target.value })}
                    className="clay-input w-full"
                    placeholder="e.g., Introduction to React Hooks"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resource Type *
                    </label>
                    <select
                      value={resourceData.resource_type}
                      onChange={(e) => setResourceData({ ...resourceData, resource_type: e.target.value })}
                      className="clay-input w-full"
                    >
                      <option value="youtube_live">YouTube Live Class</option>
                      <option value="youtube_recorded">YouTube Recording</option>
                      <option value="external_link">External Link</option>
                      <option value="document">Document</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={resourceData.is_live.toString()} // Convert boolean to string for select
                      onChange={(e) => setResourceData({ ...resourceData, is_live: e.target.value === 'true' })}
                      className="clay-input w-full"
                    >
                      <option value="true">Live Class</option>
                      <option value="false">Recorded/Past</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL / Link *
                  </label>
                  <input
                    type="url"
                    required
                    value={resourceData.url}
                    onChange={(e) => setResourceData({ ...resourceData, url: e.target.value })}
                    className="clay-input w-full"
                    placeholder="https://youtube.com/watch?v=..."
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
                    placeholder="e.g., React Fundamentals"
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
                    Purpose
                  </label>
                  <textarea
                    value={resourceData.purpose}
                    onChange={(e) => setResourceData({ ...resourceData, purpose: e.target.value })}
                    className="clay-input w-full h-20 resize-none"
                    placeholder="Why this resource is useful..."
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
                    placeholder="Task after watching/reading..."
                  />
                </div>

                <button
                  type="submit"
                  className="clay-button w-full px-6 py-3 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    fontWeight: '600'
                  }}
                >
                  Update Resource
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Discussion Thread Component
function DiscussionThread({ discussion, currentUser, onReply, index }) {
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const handleSubmitReply = () => {
    if (replyContent.trim()) {
      onReply(discussion.id, replyContent);
      setReplyContent("");
      setShowReply(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="clay-card p-6"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{
          background: 'linear-gradient(135deg, #667eea, #764ba2)'
        }}>
          {discussion.author_name[0].toUpperCase()}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-gray-800">{discussion.author_name}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${discussion.author_role === 'teacher'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-green-100 text-green-700'
              }`}>
              {discussion.author_role === 'teacher' ? 'Teacher' : 'Student'}
            </span>
            <span className="text-xs text-gray-500">
              {format(new Date(discussion.created_date), 'MMM d, h:mm a')}
            </span>
          </div>

          <h4 className="font-bold text-gray-800 mb-2">{discussion.title}</h4>
          <p className="text-gray-600 text-sm mb-4">{discussion.content}</p>

          {/* Replies */}
          {discussion.replies && discussion.replies.length > 0 && (
            <div className="space-y-3 mb-4 pl-4 border-l-2 border-purple-200">
              {discussion.replies.map((reply, i) => (
                <div key={i} className="p-3 rounded-xl bg-purple-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800 text-sm">{reply.author_name}</span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(reply.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{reply.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Reply Button */}
          {!showReply ? (
            <button
              onClick={() => setShowReply(true)}
              className="clay-button px-4 py-2 text-sm text-purple-600 flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Reply
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="clay-input w-full h-20 resize-none text-sm"
                placeholder="Write your reply..."
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitReply}
                  className="clay-button px-4 py-2 text-sm bg-purple-600 text-white flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Post Reply
                </button>
                <button
                  onClick={() => {
                    setShowReply(false);
                    setReplyContent("");
                  }}
                  className="clay-button px-4 py-2 text-sm text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
