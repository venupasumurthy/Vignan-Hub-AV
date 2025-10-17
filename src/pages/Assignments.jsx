
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Plus, Calendar, X, Upload, CheckCircle, Users, Crown, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function Assignments() {
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newAssignment, setNewAssignment] = useState({
    course_id: "",
    title: "",
    description: "",
    due_date: "",
    total_points: 100
  });

  const [newSubmission, setNewSubmission] = useState({
    content: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const allCourses = await base44.entities.Course.list();
      setCourses(allCourses);

      const allAssignments = await base44.entities.Assignment.list('-created_date');
      const allSubs = await base44.entities.Submission.list();

      if (currentUser.role === 'admin') {
        const myCourses = allCourses.filter(c => c.teacher_id === currentUser.id);
        const courseIds = myCourses.map(c => c.id);
        
        if (courseIds.length > 0) {
          const myAssignments = allAssignments.filter(a => courseIds.includes(a.course_id));
          setAssignments(myAssignments);

          const relevantSubmissions = allSubs.filter(s => myAssignments.some(a => a.id === s.assignment_id));
          setSubmissions(relevantSubmissions);
        } else {
            setAssignments([]);
            setSubmissions([]);
        }
      } else {
        const enrolledCourseIds = currentUser.enrolled_courses || [];
        if (enrolledCourseIds.length > 0) {
          const relevantAssignments = allAssignments.filter(a => 
            enrolledCourseIds.includes(a.course_id)
          );
          setAssignments(relevantAssignments);
          
          const mySubmissions = allSubs.filter(s => s.student_id === currentUser.id);
          setSubmissions(mySubmissions);
        } else {
            setAssignments([]);
            setSubmissions([]);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading assignments:", error);
      setLoading(false);
    }
  };

  const createAssignment = async (e) => {
    e.preventDefault();
    try {
      const course = courses.find(c => c.id === newAssignment.course_id);
      
      await base44.entities.Assignment.create({
        ...newAssignment,
        course_title: course?.title || ""
      });

      setNewAssignment({
        course_id: "",
        title: "",
        description: "",
        due_date: "",
        total_points: 100
      });
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error("Error creating assignment:", error);
    }
  };

  const submitAssignment = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.Submission.create({
        assignment_id: selectedAssignment.id,
        assignment_title: selectedAssignment.title,
        student_id: user.id,
        student_name: user.full_name,
        content: newSubmission.content,
        submitted_at: new Date().toISOString(),
        status: "submitted"
      });

      await base44.entities.Notification.create({
        user_id: user.id,
        message: `You submitted "${selectedAssignment.title}"`,
        type: "assignment",
        read: false
      });

      setNewSubmission({ content: "" });
      setShowSubmitModal(false);
      setSelectedAssignment(null);
      loadData();
    } catch (error) {
      console.error("Error submitting assignment:", error);
    }
  };

  const hasSubmitted = (assignmentId) => {
    return submissions.some(s => s.assignment_id === assignmentId);
  };

  const getSubmissionStatus = (assignment) => {
    const submission = submissions.find(s => s.assignment_id === assignment.id);
    if (!submission) return { status: "not_submitted", color: "gray" };
    if (submission.status === 'graded') {
      return { status: "graded", color: "green", grade: submission.grade };
    }
    return { status: "submitted", color: "blue" };
  };

  const viewSubmissions = async (assignment) => {
    setSelectedAssignment(assignment);
    const subs = submissions.filter(s => s.assignment_id === assignment.id);
    setAssignmentSubmissions(subs);
    setShowSubmissionsModal(true);
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
      {/* Header */}
      <div className="clay-card p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Assignments
            </h1>
            <p className="text-gray-600">
              {user?.role === 'admin'
                ? "Create and manage assignments for your courses"
                : "View and submit your assignments"}
            </p>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="clay-button px-6 py-3 flex items-center gap-2 text-purple-600 font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Assignment
            </button>
          )}
        </div>
      </div>

      {/* Assignments Grid */}
      {assignments.length === 0 ? (
        <div className="clay-card p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No assignments yet</p>
        </div>
      ) : (
        <>
          {user?.role === 'admin' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignments.map((assignment, index) => {
                const submissionCount = submissions.filter(s => s.id && s.assignment_id === assignment.id).length;
                
                return (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="clay-card p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{
                            background: 'linear-gradient(135deg, #f093fb, #f5576c)'
                          }}>
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-800 mb-1">
                              {assignment.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">{assignment.description}</p>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                                {assignment.course_title}
                              </span>
                              <span className="flex items-center gap-1 text-gray-500">
                                <Calendar className="w-4 h-4" />
                                Due: {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                              </span>
                              <span className="text-gray-500">
                                {assignment.total_points} points
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Submissions:</span>
                        <span className="font-bold text-purple-600">{submissionCount} students</span>
                      </div>
                      <button
                        onClick={() => viewSubmissions(assignment)}
                        className="clay-button w-full px-4 py-2 text-sm text-blue-600 font-medium flex items-center justify-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        View Student Submissions
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-6">
              {assignments.map((assignment, index) => {
                const submissionStatus = getSubmissionStatus(assignment);
                
                return (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="clay-card p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{
                            background: 'linear-gradient(135deg, #f093fb, #f5576c)'
                          }}>
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-800 mb-1">
                              {assignment.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">{assignment.description}</p>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                                {assignment.course_title}
                              </span>
                              <span className="flex items-center gap-1 text-gray-500">
                                <Calendar className="w-4 h-4" />
                                Due: {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                              </span>
                              <span className="text-gray-500">
                                {assignment.total_points} points
                              </span>
                              
                              {submissionStatus && (
                                <span className={`px-3 py-1 rounded-full font-medium ${
                                  submissionStatus.status === 'graded' ? 'bg-green-100 text-green-700' :
                                  submissionStatus.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {submissionStatus.status === 'graded' && `Graded: ${submissionStatus.grade}%`}
                                  {submissionStatus.status === 'submitted' && 'Submitted'}
                                  {submissionStatus.status === 'not_submitted' && 'Not Submitted'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {!hasSubmitted(assignment.id) && (
                        <button
                          onClick={() => {
                            setSelectedAssignment(assignment);
                            setNewSubmission({ content: "" }); // Clear previous submission content
                            setShowSubmitModal(true);
                          }}
                          className="clay-button px-4 py-2 text-purple-600 font-medium"
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create Assignment Modal */}
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
              className="clay-card p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Create Assignment</h2>
                <button onClick={() => setShowCreateModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={createAssignment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course
                  </label>
                  <select
                    required
                    value={newAssignment.course_id}
                    onChange={(e) => setNewAssignment({...newAssignment, course_id: e.target.value})}
                    className="clay-input w-full"
                  >
                    <option value="">Select a course</option>
                    {courses.filter(c => c.teacher_id === user?.id).map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assignment Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                    className="clay-input w-full"
                    placeholder="Enter assignment title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    required
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                    className="clay-input w-full h-24 resize-none"
                    placeholder="Assignment instructions"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newAssignment.due_date}
                    onChange={(e) => setNewAssignment({...newAssignment, due_date: e.target.value})}
                    className="clay-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Points
                  </label>
                  <input
                    type="number"
                    required
                    value={newAssignment.total_points}
                    onChange={(e) => setNewAssignment({...newAssignment, total_points: parseInt(e.target.value)})}
                    className="clay-input w-full"
                    min="1"
                  />
                </div>

                <button
                  type="submit"
                  className="clay-button w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-2xl"
                >
                  Create Assignment
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Assignment Modal */}
      <AnimatePresence>
        {showSubmitModal && selectedAssignment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowSubmitModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Submit Assignment</h2>
                <button onClick={() => setShowSubmitModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6 p-4 rounded-2xl bg-purple-50">
                <h3 className="font-bold text-gray-800 mb-1">{selectedAssignment.title}</h3>
                <p className="text-sm text-gray-600">{selectedAssignment.description}</p>
              </div>

              <form onSubmit={submitAssignment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Answer
                  </label>
                  <textarea
                    required
                    value={newSubmission.content}
                    onChange={(e) => setNewSubmission({...newSubmission, content: e.target.value})}
                    className="clay-input w-full h-32 resize-none"
                    placeholder="Enter your submission..."
                  />
                </div>

                <button
                  type="submit"
                  className="clay-button w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-2xl flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Submit Assignment
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Submissions Modal */}
      <AnimatePresence>
        {showSubmissionsModal && selectedAssignment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowSubmissionsModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Student Submissions</h2>
                  <p className="text-gray-600">{selectedAssignment.title}</p>
                </div>
                <button onClick={() => {
                  setShowSubmissionsModal(false);
                }} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {assignmentSubmissions.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No submissions yet for this assignment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignmentSubmissions.map((submission, index) => (
                    <motion.div
                      key={submission.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="clay-card p-4 bg-gradient-to-r from-blue-50 to-purple-50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-gray-800">{submission.student_name}</h4>
                          <p className="text-xs text-gray-500">
                            Submitted: {format(new Date(submission.submitted_at || submission.created_date), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        {submission.status === 'graded' && (
                          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium text-sm">
                            Graded: {submission.grade}%
                          </span>
                        )}
                      </div>
                      
                      <div className="mb-3 p-3 rounded-xl bg-white">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.content}</p>
                      </div>

                      {submission.feedback && (
                        <div className="p-3 rounded-xl bg-blue-100">
                          <p className="text-xs font-medium text-blue-900 mb-1">Feedback:</p>
                          <p className="text-sm text-blue-700">{submission.feedback}</p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
