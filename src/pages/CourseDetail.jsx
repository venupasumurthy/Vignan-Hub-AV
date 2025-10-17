import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLocation } from "react-router-dom";
import { 
  BookOpen, Download, MessageCircle, Upload, X, Send, 
  FileText, Trash2, ArrowLeft, Users
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
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
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

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const courseData = await base44.entities.Course.list();
      const foundCourse = courseData.find(c => c.id === courseId);
      setCourse(foundCourse);

      // Load course materials
      const allMaterials = await base44.entities.CourseMaterial.list('-created_date');
      const courseMaterials = allMaterials.filter(m => m.course_id === courseId);
      setMaterials(courseMaterials);

      // Load discussions/Q&A
      const allDiscussions = await base44.entities.Discussion.list('-created_date');
      const courseDiscussions = allDiscussions.filter(d => d.course_id === courseId);
      setDiscussions(courseDiscussions);

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
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: newMaterial.file
      });

      // Determine file type
      const fileName = newMaterial.file.name.toLowerCase();
      let fileType = "other";
      if (fileName.endsWith('.pdf')) fileType = "pdf";
      else if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) fileType = "ppt";
      else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) fileType = "doc";

      // Create material record
      await base44.entities.CourseMaterial.create({
        course_id: courseId,
        course_title: course.title,
        title: newMaterial.title,
        description: newMaterial.description,
        file_url: file_url,
        file_type: fileType,
        uploaded_by_id: user.id,
        uploaded_by_name: user.full_name
      });

      // Notify enrolled students
      if (course.enrolled_students && course.enrolled_students.length > 0) {
        for (const studentId of course.enrolled_students) {
          await base44.entities.Notification.create({
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
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.Discussion.create({
        course_id: courseId,
        course_title: course.title,
        author_id: user.id,
        author_name: user.full_name,
        author_role: user.role,
        title: newQuestion.title,
        content: newQuestion.content,
        replies: []
      });

      // Notify teacher
      await base44.entities.Notification.create({
        user_id: course.teacher_id,
        message: `New question in ${course.title}: ${newQuestion.title}`,
        type: "course",
        read: false
      });

      setNewQuestion({ title: "", content: "" });
      setShowQuestionModal(false);
      loadData();
    } catch (error) {
      console.error("Error posting question:", error);
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

      await base44.entities.Discussion.update(discussionId, { replies });

      // Notify original author
      if (discussion.author_id !== user.id) {
        await base44.entities.Notification.create({
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
      await base44.entities.CourseMaterial.delete(materialId);
      loadData();
    } catch (error) {
      console.error("Error deleting material:", error);
    }
  };

  const isEnrolled = user?.enrolled_courses?.includes(courseId);
  const isTeacher = user?.role === 'admin' && course?.teacher_id === user?.id;

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
        <Link to={createPageUrl("Courses")} className="clay-button px-4 py-2 mb-4 inline-flex items-center gap-2 text-purple-600">
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </Link>
        
        <div className="flex items-start gap-6 mt-4">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center flex-shrink-0" style={{
            background: course.thumbnail_color || 'linear-gradient(135deg, #667eea, #764ba2)'
          }}>
            <BookOpen className="w-12 h-12 text-white" />
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{course.title}</h1>
            <p className="text-gray-600 mb-4">{course.description}</p>
            
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                {course.teacher_name}
              </span>
              {course.duration && (
                <span className="text-gray-500">{course.duration}</span>
              )}
              <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                {course.enrolled_students?.length || 0} students enrolled
              </span>
            </div>
          </div>

          {isTeacher && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="clay-button px-6 py-3 flex items-center gap-2 text-purple-600 font-medium"
            >
              <Upload className="w-5 h-5" />
              Upload Material
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Course Materials */}
          <div className="clay-card p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Course Materials</h2>
            
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
                  className="clay-button px-4 py-2 flex items-center gap-2 text-purple-600 font-medium"
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
                <span className="text-gray-500">Discussions:</span>
                <p className="font-medium text-gray-800">{discussions.length} threads</p>
              </div>
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
                    onChange={(e) => setNewMaterial({...newMaterial, title: e.target.value})}
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
                    onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
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
                    onChange={(e) => setNewMaterial({...newMaterial, file: e.target.files[0]})}
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
                    onChange={(e) => setNewQuestion({...newQuestion, title: e.target.value})}
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
                    onChange={(e) => setNewQuestion({...newQuestion, content: e.target.value})}
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
            <span className={`text-xs px-2 py-1 rounded-full ${
              discussion.author_role === 'admin' 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {discussion.author_role === 'admin' ? 'Teacher' : 'Student'}
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