
import React, { useState, useEffect } from "react";
import { vignan } from "@/api/vignanClient";
import { FileText, Plus, Calendar, X, Upload, CheckCircle, Users, BookOpen } from "lucide-react";
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
  const [viewMode, setViewMode] = useState('enrolled'); // 'enrolled' or 'all'

  const [newAssignment, setNewAssignment] = useState({
    course_name: "",
    title: "",
    description: "",
    due_date: "",
    total_points: 100
  });

  const [newSubmission, setNewSubmission] = useState({
    content: "",
    file: null
  });

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

      const allCourses = await vignan.entities.Course.list();
      setCourses(allCourses);

      const allAssignments = await vignan.entities.Assignment.list('-created_date');
      const allSubs = await vignan.entities.Submission.list();

      if (currentUser.account_type === 'teacher') {
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
        // Student view - show ALL assignments (not just enrolled)
        setAssignments(allAssignments);

        const mySubmissions = allSubs.filter(s => s.student_id === currentUser.id);
        setSubmissions(mySubmissions);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading assignments:", error);
      // If there's an authentication error, redirect to login
      if (error.message && (error.message.includes("logged in") || error.message.includes("authenticated"))) {
        vignan.auth.redirectToLogin();
        return;
      }
      setLoading(false);
    }
  };

  const createAssignment = async (e) => {
    e.preventDefault();

    if (!newAssignment.course_name || !newAssignment.title || !newAssignment.description || !newAssignment.due_date) {
      alert("Please fill in all required fields!");
      return;
    }

    try {
      // Find course by name (case insensitive) or create new one
      let course = courses.find(c =>
        c.teacher_id === user.id && c.title.toLowerCase() === newAssignment.course_name.toLowerCase()
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
      }

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

      setNewAssignment({
        course_name: "",
        title: "",
        description: "",
        due_date: "",
        total_points: 100
      });
      setShowCreateModal(false);
      loadData();
      alert("Assignment created successfully! Students can enroll in the course to access it.");
    } catch (error) {
      console.error("Error creating assignment:", error);
      alert("Failed to create assignment. Please try again.");
    }
  };

  const submitAssignment = async (e) => {
    e.preventDefault();

    if (!newSubmission.content) {
      alert("Please provide your submission content!");
      return;
    }

    try {
      let fileUrl = null;

      if (newSubmission.file) {
        const { file_url } = await vignan.integrations.Core.UploadFile({ file: newSubmission.file });
        fileUrl = file_url;
      }

      await vignan.entities.Submission.create({
        assignment_id: selectedAssignment.id,
        assignment_title: selectedAssignment.title,
        student_id: user.id,
        student_name: user.full_name,
        student_email: user.email,
        content: newSubmission.content,
        file_url: fileUrl,
        submitted_at: new Date().toISOString(),
        status: "submitted"
      });

      // Find the course to notify teacher
      const course = courses.find(c => c.id === selectedAssignment.course_id);
      if (course) {
        await vignan.entities.Notification.create({
          user_id: course.teacher_id,
          message: `${user.full_name} submitted assignment: ${selectedAssignment.title}`,
          type: "assignment",
          read: false
        });
      }

      setNewSubmission({ content: "", file: null });
      setShowSubmitModal(false);
      setSelectedAssignment(null);
      loadData();
      alert("Assignment submitted successfully!");
    } catch (error) {
      console.error("Error submitting assignment:", error);
      alert("Failed to submit assignment. Please try again.");
    }
  };

  const enrollInCourse = async (courseId) => {
    try {
      const courseToEnroll = courses.find(c => c.id === courseId);
      if (!courseToEnroll) {
        console.error("Course not found for enrollment:", courseId);
        alert("Failed to enroll: Course not found.");
        return;
      }

      const enrolledCourses = user.enrolled_courses || [];
      if (!enrolledCourses.includes(courseId)) {
        // Update user's enrolled_courses
        await vignan.auth.updateMe({
          enrolled_courses: [...enrolledCourses, courseId]
        });

        // Update course's enrolled_students
        const enrolledStudents = courseToEnroll.enrolled_students || [];
        await vignan.entities.Course.update(courseId, {
          enrolled_students: [...enrolledStudents, user.id]
        });

        await vignan.entities.Notification.create({
          user_id: user.id,
          message: `You've enrolled in ${courseToEnroll.title}! You can now submit assignments for this course.`,
          type: "course",
          read: false
        });

        loadData(); // Re-fetch data to reflect enrollment status
        alert(`Successfully enrolled in ${courseToEnroll.title}!`);
      } else {
        alert("You are already enrolled in this course.");
      }
    } catch (error) {
      console.error("Error enrolling in course:", error);
      alert("Failed to enroll in course. Please try again.");
    }
  };

  const hasSubmitted = (assignmentId) => {
    return submissions.some(s => s.assignment_id === assignmentId && s.student_id === user.id);
  };

  const getSubmissionStatus = (assignment) => {
    const submission = submissions.find(s => s.assignment_id === assignment.id && s.student_id === user.id);
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

  const isDueDatePassed = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const isEnrolledInCourse = (courseId) => {
    return user?.enrolled_courses?.includes(courseId);
  };

  // Filter assignments based on view mode
  const getFilteredAssignments = () => {
    if (user?.account_type === 'teacher') {
      return assignments;
    }

    if (viewMode === 'enrolled') {
      const enrolledCourseIds = user?.enrolled_courses || [];
      return assignments.filter(a => enrolledCourseIds.includes(a.course_id));
    }

    return assignments; // 'all' mode
  };

  const filteredAssignments = getFilteredAssignments();

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
              Assignments
            </h1>
            <p className="text-slate-600">
              {user?.account_type === 'teacher'
                ? "Create and manage assignments for your courses"
                : "View and submit your assignments"}
            </p>
          </div>
          {user?.account_type === 'teacher' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="clay-button-primary px-6 py-3 flex items-center gap-2 rounded-lg"
            >
              <Plus className="w-5 h-5" />
              Create Assignment
            </button>
          )}
        </div>
      </div>

      {/* Student View Toggle */}
      {user?.account_type === 'student' && (
        <div className="clay-card p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('enrolled')}
                className={`clay-button px-4 py-2 text-sm font-medium ${viewMode === 'enrolled' ? 'bg-purple-100 text-purple-700' : 'text-gray-600'
                  }`}
              >
                My Courses Only
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`clay-button px-4 py-2 text-sm font-medium ${viewMode === 'all' ? 'bg-purple-100 text-purple-700' : 'text-gray-600'
                  }`}
              >
                All Assignments
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {viewMode === 'enrolled'
              ? `Showing ${filteredAssignments.length} assignment(s) from your enrolled courses`
              : `Showing all ${filteredAssignments.length} assignment(s)`
            }
          </div>
        </div>
      )}

      {/* Assignments Grid */}
      {filteredAssignments.length === 0 ? (
        <div className="clay-card p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            {user?.account_type === 'teacher'
              ? "No assignments created yet. Click 'Create Assignment' to get started."
              : viewMode === 'enrolled'
                ? "No assignments in your enrolled courses yet. Try viewing 'All Assignments' or enroll in more courses."
                : "No assignments available yet."}
          </p>
        </div>
      ) : (
        <>
          {user?.account_type === 'teacher' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssignments.map((assignment, index) => {
                const submissionCount = submissions.filter(s => s.assignment_id === assignment.id).length;

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
              {filteredAssignments.map((assignment, index) => {
                const submissionStatus = getSubmissionStatus(assignment);
                const dueDatePassed = isDueDatePassed(assignment.due_date);
                const enrolled = isEnrolledInCourse(assignment.course_id);

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
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg text-gray-800">
                                {assignment.title}
                              </h3>
                              {!enrolled && (
                                <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                                  Not Enrolled
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{assignment.description}</p>

                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                                {assignment.course_title}
                              </span>
                              <span className={`flex items-center gap-1 ${dueDatePassed ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                                <Calendar className="w-4 h-4" />
                                Due: {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                                {dueDatePassed && !hasSubmitted(assignment.id) && enrolled && ' (Overdue)'}
                              </span>
                              <span className="text-gray-500">
                                {assignment.total_points} points
                              </span>

                              {enrolled && (
                                <span className={`px-3 py-1 rounded-full font-medium ${submissionStatus.status === 'graded' ? 'bg-green-100 text-green-700' :
                                  submissionStatus.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                  {submissionStatus.status === 'graded' && `Graded: ${submissionStatus.grade}%`}
                                  {submissionStatus.status === 'submitted' && 'Submitted ✓'}
                                  {submissionStatus.status === 'not_submitted' && 'Not Submitted'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {!enrolled ? (
                          <button
                            onClick={() => enrollInCourse(assignment.course_id)}
                            className="clay-button px-4 py-2 font-medium text-purple-600 flex items-center gap-2"
                          >
                            <BookOpen className="w-4 h-4" />
                            Enroll First
                          </button>
                        ) : !hasSubmitted(assignment.id) ? (
                          <button
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setNewSubmission({ content: "", file: null });
                              setShowSubmitModal(true);
                            }}
                            className={`clay-button px-4 py-2 font-medium ${dueDatePassed
                              ? 'text-red-600'
                              : 'text-purple-600'
                              }`}
                          >
                            {dueDatePassed ? 'Submit Late' : 'Submit'}
                          </button>
                        ) : null}
                      </div>
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
                    Course Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAssignment.course_name}
                    onChange={(e) => setNewAssignment({ ...newAssignment, course_name: e.target.value })}
                    className="clay-input w-full"
                    placeholder="Type course name (e.g., Data Structures)"
                    list="teacher-courses-list"
                  />
                  <datalist id="teacher-courses-list">
                    {courses.filter(c => c.teacher_id === user?.id).map(course => (
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
                    placeholder="Enter assignment title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                    className="clay-input w-full h-24 resize-none"
                    placeholder="Assignment instructions"
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
                    Total Points *
                  </label>
                  <input
                    type="number"
                    required
                    value={newAssignment.total_points}
                    onChange={(e) => setNewAssignment({ ...newAssignment, total_points: parseInt(e.target.value) })}
                    className="clay-input w-full"
                    min="1"
                    max="1000"
                    placeholder="e.g., 100"
                  />
                </div>

                <button
                  type="submit"
                  className="clay-button-primary w-full px-6 py-3 font-medium rounded-lg"
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
              className="clay-card p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
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
                <p className="text-sm text-gray-600 mb-2">{selectedAssignment.description}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due: {format(new Date(selectedAssignment.due_date), 'MMM d, yyyy')}
                  </span>
                  <span>{selectedAssignment.total_points} points</span>
                </div>
              </div>

              <form onSubmit={submitAssignment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Answer *
                  </label>
                  <textarea
                    required
                    value={newSubmission.content}
                    onChange={(e) => setNewSubmission({ ...newSubmission, content: e.target.value })}
                    className="clay-input w-full h-32 resize-none"
                    placeholder="Write your answer here..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attach File (Optional)
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setNewSubmission({ ...newSubmission, file: e.target.files[0] })}
                    className="clay-input w-full"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can attach PDF, DOC, PPT, or TXT files
                  </p>
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
            onClick={() => setShowSubmissionsModal(false)}
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
                <button onClick={() => setShowSubmissionsModal(false)} className="clay-button p-2">
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

                      {submission.file_url && (
                        <a
                          href={submission.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mb-3"
                        >
                          <FileText className="w-4 h-4" />
                          View Attached File
                        </a>
                      )}

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
