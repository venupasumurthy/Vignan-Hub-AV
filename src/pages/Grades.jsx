
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Award, FileText, ChevronDown, ChevronUp, Download, Trophy, Eye, Edit, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function Grades() {
  const [user, setUser] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [badges, setBadges] = useState([]);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showSubmissionDetailModal, setShowSubmissionDetailModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [awardData, setAwardData] = useState({
    grade: "",
    feedback: "",
    points: 0,
    badge_id: ""
  });
  const [stats, setStats] = useState({
    totalAssignments: 0, // For student
    completedAssignments: 0, // For student
    averageGrade: 0, // For student
    totalPoints: 0, // For student
    totalSubmissions: 0, // For teacher
    gradedSubmissions: 0, // For teacher
    pendingSubmissions: 0, // For teacher
    totalPointsAwarded: 0 // For teacher
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Check authentication first
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) {
        base44.auth.redirectToLogin();
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser.account_type === 'student') {
        // Student view
        const mySubmissions = await base44.entities.Submission.filter(
          { student_id: currentUser.id },
          '-created_date'
        );

        const allAssignments = await base44.entities.Assignment.list();
        const assignmentCourseMap = new Map(allAssignments.map(a => [a.id, a.course_id]));

        const enrichedSubmissions = mySubmissions.map(s => ({
          ...s,
          course_id: assignmentCourseMap.get(s.assignment_id)
        }));
        setSubmissions(enrichedSubmissions);

        const graded = enrichedSubmissions.filter(s => s.grade !== null && s.grade !== undefined);
        const avgGrade = graded.length > 0
          ? graded.reduce((sum, s) => sum + s.grade, 0) / graded.length
          : 0;
        const totalPoints = currentUser.points || 0;

        setStats({
          totalAssignments: enrichedSubmissions.length,
          completedAssignments: graded.length,
          averageGrade: avgGrade.toFixed(1),
          totalPoints
        });

        const enrolledCourseIds = currentUser.enrolled_courses || [];
        if (enrolledCourseIds.length > 0) {
          const allCourses = await base44.entities.Course.list();
          const enrolledCourses = allCourses.filter(c => enrolledCourseIds.includes(c.id));
          setCourses(enrolledCourses);
        }
      } else {
        // Teacher view
        const allCourses = await base44.entities.Course.list();
        const myCourses = allCourses.filter(c => c.teacher_id === currentUser.id);
        setCourses(myCourses);

        const courseIds = myCourses.map(c => c.id);

        const allAssignments = await base44.entities.Assignment.list();
        const myAssignments = allAssignments.filter(a => courseIds.includes(a.course_id));
        const myAssignmentIds = myAssignments.map(a => a.id);

        const allSubmissions = await base44.entities.Submission.list('-created_date');

        const relevantSubmissions = allSubmissions.filter(s =>
          myAssignmentIds.includes(s.assignment_id)
        );

        // Map assignments by ID for quick lookup
        const assignmentMap = new Map(myAssignments.map(a => [a.id, a]));
        // Map courses by ID for quick lookup of titles
        const courseTitleMap = new Map(myCourses.map(c => [c.id, c.title]));

        // Enrich submissions with assignment details and course title
        // student_email is no longer fetched here to avoid User.list() permission issue.
        // It's assumed student_name is part of the submission object, or can be fetched on demand.
        const enrichedSubmissions = relevantSubmissions.map(s => ({
          ...s,
          course_id: assignmentMap.get(s.assignment_id)?.course_id,
          // Use courseTitleMap to get the course title based on the assignment's course_id
          course_title: courseTitleMap.get(assignmentMap.get(s.assignment_id)?.course_id),
          total_points: assignmentMap.get(s.assignment_id)?.total_points
        }));
        setSubmissions(enrichedSubmissions);

        const allBadges = await base44.entities.Badge.list();
        setBadges(allBadges);

        const gradedCount = enrichedSubmissions.filter(s => s.status === 'graded').length;
        const totalPointsAwarded = enrichedSubmissions.reduce((sum, s) => sum + (s.points_awarded || 0), 0);

        setStats({
          totalSubmissions: enrichedSubmissions.length,
          gradedSubmissions: gradedCount,
          pendingSubmissions: enrichedSubmissions.length - gradedCount,
          totalPointsAwarded
        });
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading grades:", error);
      // If there's an authentication error, redirect to login
      if (error.message && error.message.includes("logged in")) {
        base44.auth.redirectToLogin();
        return;
      }
      setLoading(false);
    }
  };

  const handleAwardSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSubmission) return;

    try {
      // Update submission with grade, feedback, and points awarded
      await base44.entities.Submission.update(selectedSubmission.id, {
        grade: parseFloat(awardData.grade),
        feedback: awardData.feedback,
        points_awarded: parseInt(awardData.points, 10) || 0, // Store points awarded
        status: "graded"
      });

      // Award points to student if specified
      if (awardData.points > 0) {
        try {
          // Fetch the specific student by ID directly
          const student = await base44.entities.User.read(selectedSubmission.student_id);
          if (student) { // Check if student was found
            const currentPoints = student.points || 0;
            await base44.entities.User.update(student.id, {
              points: currentPoints + parseInt(awardData.points, 10)
            });
          }
        } catch (error) {
          console.error("Error awarding points:", error);
        }
      }

      // Award badge if specified
      if (awardData.badge_id) {
        try {
          const badge = badges.find(b => b.id === awardData.badge_id);
          // Fetch the specific student by ID directly
          const student = await base44.entities.User.read(selectedSubmission.student_id);
          if (student) { // Check if student was found
            const currentBadges = student.badges || [];

            if (!currentBadges.includes(awardData.badge_id)) {
              await base44.entities.User.update(student.id, {
                badges: [...currentBadges, awardData.badge_id]
              });

              // Update badge's awarded_to list
              const awardedTo = badge.awarded_to || [];
              awardedTo.push({
                student_id: student.id,
                student_name: selectedSubmission.student_name, // Assuming student_name is available in selectedSubmission
                awarded_at: new Date().toISOString()
              });
              await base44.entities.Badge.update(badge.id, { awarded_to: awardedTo });
            }
          }
        } catch (error) {
          console.error("Error awarding badge:", error);
        }
      }

      // Create comprehensive notification
      let notifMessage = `Your assignment "${selectedSubmission.assignment_title}" has been graded: ${awardData.grade}%`;
      if (awardData.points > 0) notifMessage += ` (+${awardData.points} points)`;
      if (awardData.badge_id) {
        const badge = badges.find(b => b.id === awardData.badge_id);
        if (badge) notifMessage += ` and you earned a badge: ${badge.title}!`;
      }

      await base44.entities.Notification.create({
        user_id: selectedSubmission.student_id,
        message: notifMessage,
        type: "grade",
        read: false
      });

      // Reset and close modal
      setAwardData({ grade: "", feedback: "", points: 0, badge_id: "" });
      setSelectedSubmission(null);
      setShowAwardModal(false);
      setShowSubmissionDetailModal(false); // Close detail modal if open
      loadData();
      alert("Grade, points, and badge awarded successfully!");
    } catch (error) {
      console.error("Error awarding grade:", error);
      alert("Failed to award grade. Please try again.");
    }
  };

  const downloadGradesCSV = () => {
    if (user.account_type !== 'student') return;

    const csvContent = [
      ['Assignment', 'Course', 'Grade', 'Submitted Date', 'Feedback'],
      ...submissions.map(s => [
        s.assignment_title || 'N/A',
        courses.find(c => c.id === s.course_id)?.title || 'N/A',
        s.grade !== null ? `${s.grade}%` : 'Not Graded',
        format(new Date(s.submitted_at || s.created_date), 'MMM d, yyyy'),
        s.feedback || 'No feedback'
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-grades.csv';
    a.click();
  };

  const viewSubmissionDetail = (submission) => {
    setSelectedSubmission(submission);
    setShowSubmissionDetailModal(true);
  };

  const startGrading = (submission) => {
    setSelectedSubmission(submission);
    setAwardData({
      grade: submission.grade !== null ? String(submission.grade) : "", // Convert to string for input value
      feedback: submission.feedback || "",
      points: submission.points_awarded || 0, // Pre-fill points_awarded if editing
      badge_id: ""
    });
    setShowSubmissionDetailModal(false); // Close detail modal if it was open
    setShowAwardModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600" />
      </div>
    );
  }

  // If user is null and not loading, it means redirection should have happened. 
  // This is a safeguard, or if base44.auth.me() fails for other reasons.
  if (!user) {
    return null;
  }

  if (user?.account_type === 'teacher') {
    // Teacher View - Improved Grading Interface
    const pendingSubmissions = submissions.filter(s => s.status !== 'graded');
    const gradedSubmissions = submissions.filter(s => s.status === 'graded');

    return (
      <div className="max-w-7xl mx-auto">
        <div className="clay-card p-8 mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Grade Submissions & Award Students
          </h1>
          <p className="text-slate-600">Review student submissions, award marks, points and badges</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="clay-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Pending Grading</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pendingSubmissions}</p>
              </div>
              <FileText className="w-12 h-12 text-orange-400" />
            </div>
          </div>

          <div className="clay-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Graded</p>
                <p className="text-3xl font-bold text-green-600">{stats.gradedSubmissions}</p>
              </div>
              <Award className="w-12 h-12 text-green-400" />
            </div>
          </div>

          <div className="clay-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Submissions</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalSubmissions}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-400" />
            </div>
          </div>

          <div className="clay-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Points Awarded</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.totalPointsAwarded}</p>
              </div>
              <Coins className="w-12 h-12 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Pending Submissions - Priority Section */}
        {pendingSubmissions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></span>
              Pending Grading ({pendingSubmissions.length})
            </h2>
            <div className="grid gap-4">
              {pendingSubmissions.map((submission, index) => (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="clay-card p-6 border-2 border-orange-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-gray-800">{submission.assignment_title}</h3>
                        <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
                          Needs Grading
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span className="font-medium">Student: {submission.student_name}</span>
                        <span>•</span>
                        <span>Course: {submission.course_title}</span>
                        <span>•</span>
                        <span>Submitted: {format(new Date(submission.submitted_at || submission.created_date), 'MMM d, yyyy h:mm a')}</span>
                        {submission.total_points && (
                          <>
                            <span>•</span>
                            <span>Max Points: {submission.total_points}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-sm font-medium text-slate-700 mb-2">Submission Content:</p>
                    <p className="text-sm text-slate-600 line-clamp-3">{submission.content}</p>
                  </div>

                  {submission.file_url && (
                    <div className="mb-4">
                      <a
                        href={submission.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        View Attached File
                      </a>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => viewSubmissionDetail(submission)}
                      className="clay-button px-4 py-2 flex items-center gap-2 text-blue-600 font-medium hover:bg-slate-50 border border-slate-200"
                    >
                      <Eye className="w-4 h-4" />
                      View Full Submission
                    </button>
                    <button
                      onClick={() => startGrading(submission)}
                      className="clay-button-primary px-6 py-2 rounded-lg flex items-center gap-2"
                    >
                      <Trophy className="w-5 h-5" />
                      Grade & Award Student
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Graded Submissions */}
        {gradedSubmissions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Graded Submissions ({gradedSubmissions.length})
            </h2>
            <div className="grid gap-4">
              {gradedSubmissions.map((submission, index) => (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="clay-card p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-bold text-lg text-gray-800">{submission.assignment_title}</h3>
                        <span className="px-4 py-1 rounded-full bg-green-100 text-green-700 font-bold">
                          {submission.grade}%
                        </span>
                        {submission.points_awarded > 0 && (
                          <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium flex items-center gap-1">
                            <Coins className="w-4 h-4" />
                            +{submission.points_awarded} pts
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span className="font-medium">Student: {submission.student_name}</span>
                        <span>•</span>
                        <span>Course: {submission.course_title}</span>
                        <span>•</span>
                        <span>Graded: {format(new Date(submission.updated_date || submission.created_date), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>

                  {submission.feedback && (
                    <div className="mb-4 p-4 rounded-2xl bg-blue-50">
                      <p className="text-sm font-medium text-blue-900 mb-1">Your Feedback:</p>
                      <p className="text-sm text-blue-700">{submission.feedback}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => viewSubmissionDetail(submission)}
                      className="clay-button px-4 py-2 flex items-center gap-2 text-blue-600 font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    <button
                      onClick={() => startGrading(submission)}
                      className="clay-button px-4 py-2 flex items-center gap-2 text-purple-600 font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Grade
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {submissions.length === 0 && (
          <div className="clay-card p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No submissions to grade yet</p>
          </div>
        )}

        {/* Submission Detail Modal */}
        <AnimatePresence>
          {showSubmissionDetailModal && selectedSubmission && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowSubmissionDetailModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="clay-card p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Submission Details</h2>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">Assignment:</span> {selectedSubmission.assignment_title}</p>
                      <p><span className="font-medium">Student:</span> {selectedSubmission.student_name}</p>
                      <p><span className="font-medium">Course:</span> {selectedSubmission.course_title}</p>
                      <p><span className="font-medium">Submitted:</span> {format(new Date(selectedSubmission.submitted_at || selectedSubmission.created_date), 'MMM d, yyyy h:mm a')}</p>
                      {selectedSubmission.total_points && (
                        <p><span className="font-medium">Max Points:</span> {selectedSubmission.total_points}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {selectedSubmission.status === 'graded' && (
                      <>
                        <div className="px-6 py-3 rounded-2xl bg-green-100 text-green-700 font-bold text-xl">
                          {selectedSubmission.grade}%
                        </div>
                        {selectedSubmission.points_awarded > 0 && (
                          <div className="px-4 py-2 rounded-2xl bg-yellow-100 text-yellow-700 font-bold flex items-center gap-2">
                            <Coins className="w-5 h-5" />
                            +{selectedSubmission.points_awarded} points
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-slate-800 mb-3">Submission Content:</h3>
                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-slate-700 whitespace-pre-wrap">{selectedSubmission.content}</p>
                    </div>
                  </div>

                  {selectedSubmission.file_url && (
                    <div>
                      <h3 className="font-bold text-slate-800 mb-3">Attached File:</h3>
                      <a
                        href={selectedSubmission.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="clay-button px-6 py-3 text-blue-600 font-medium flex items-center gap-2 inline-flex hover:bg-slate-50 border border-slate-200"
                      >
                        <FileText className="w-5 h-5" />
                        View Attached File
                      </a>
                    </div>
                  )}

                  {selectedSubmission.feedback && (
                    <div>
                      <h3 className="font-bold text-slate-800 mb-3">Your Feedback:</h3>
                      <div className="p-6 rounded-xl bg-blue-50 border border-blue-200">
                        <p className="text-blue-800">{selectedSubmission.feedback}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowSubmissionDetailModal(false)}
                      className="clay-button flex-1 px-6 py-3 text-slate-600 font-medium hover:bg-slate-50 border border-slate-200"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => startGrading(selectedSubmission)}
                      className="clay-button-primary flex-1 px-6 py-3 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Trophy className="w-5 h-5" />
                      {selectedSubmission.status === 'graded' ? 'Edit Grade & Points' : 'Grade & Award Points'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Award Modal */}
        <AnimatePresence>
          {showAwardModal && selectedSubmission && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowAwardModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="clay-card p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Grade & Award Student</h2>
                <div className="mb-6 p-4 rounded-2xl bg-purple-50">
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-bold">Student:</span> {selectedSubmission.student_name}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-bold">Assignment:</span> {selectedSubmission.assignment_title}
                  </p>
                  {selectedSubmission.total_points && (
                    <p className="text-sm text-gray-600">
                      <span className="font-bold">Max Points:</span> {selectedSubmission.total_points}
                    </p>
                  )}
                </div>

                <form onSubmit={handleAwardSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grade (0-100) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.1"
                      value={awardData.grade}
                      onChange={(e) => setAwardData({ ...awardData, grade: e.target.value })}
                      className="clay-input w-full text-lg font-bold"
                      placeholder="Enter grade percentage"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Feedback to Student
                    </label>
                    <textarea
                      value={awardData.feedback}
                      onChange={(e) => setAwardData({ ...awardData, feedback: e.target.value })}
                      className="clay-input w-full h-24 resize-none"
                      placeholder="Provide detailed feedback on their work..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Award Points to Student *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={awardData.points}
                      onChange={(e) => setAwardData({ ...awardData, points: e.target.value })}
                      className="clay-input w-full text-lg"
                      placeholder="Enter points to award"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💎 Points will be added to student's total points and shown in their profile
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Award Badge (Optional)
                    </label>
                    <select
                      value={awardData.badge_id}
                      onChange={(e) => setAwardData({ ...awardData, badge_id: e.target.value })}
                      className="clay-input w-full"
                    >
                      <option value="">No badge</option>
                      {badges.map(badge => (
                        <option key={badge.id} value={badge.id}>{badge.title}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      🏆 Award a badge for outstanding achievement
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAwardModal(false);
                        setSelectedSubmission(null);
                        setAwardData({ grade: "", feedback: "", points: 0, badge_id: "" });
                      }}
                      className="clay-button flex-1 px-6 py-3 text-gray-600 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="clay-button-primary flex-1 px-6 py-3 rounded-lg"
                    >
                      Submit Grade & Points
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

  // Student View
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="clay-card p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              My Grades
            </h1>
            <p className="text-slate-600">Track your academic performance</p>
          </div>
          <button
            onClick={downloadGradesCSV}
            className="clay-button-primary px-6 py-3 flex items-center gap-2 rounded-lg"
          >
            <Download className="w-5 h-5" />
            Download CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="clay-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Assignments</p>
              <p className="text-3xl font-bold text-purple-600">{stats.totalAssignments}</p>
            </div>
            <FileText className="w-12 h-12 text-purple-400" />
          </div>
        </div>

        <div className="clay-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Graded</p>
              <p className="text-3xl font-bold text-blue-600">{stats.completedAssignments}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-400" />
          </div>
        </div>

        <div className="clay-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Average Grade</p>
              <p className="text-3xl font-bold text-green-600">{stats.averageGrade}%</p>
            </div>
            <Award className="w-12 h-12 text-green-400" />
          </div>
        </div>

        <div className="clay-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Points</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.totalPoints}</p>
            </div>
            <Award className="w-12 h-12 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Grades by Course */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Grades by Course</h2>

        {courses.length === 0 ? (
          <div className="clay-card p-12 text-center">
            <p className="text-gray-500">Enroll in courses to see your grades</p>
          </div>
        ) : (
          courses.map((course) => {
            const courseSubmissions = submissions.filter(s => s.course_id === course.id);
            const isExpanded = expandedCourse === course.id;

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="clay-card overflow-hidden"
              >
                <button
                  onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                  className="w-full p-6 flex items-center justify-between hover:bg-white/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                      background: course.thumbnail_color || 'linear-gradient(135deg, #667eea, #764ba2)'
                    }}>
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-lg text-gray-800">{course.title}</h3>
                      <p className="text-sm text-gray-600">{courseSubmissions.length} assignments</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                </button>

                {isExpanded && (
                  <div className="p-6 pt-0 space-y-3">
                    {courseSubmissions.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No submissions yet</p>
                    ) : (
                      courseSubmissions.map((submission) => (
                        <div key={submission.id} className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-gray-800">{submission.assignment_title}</p>
                              <p className="text-xs text-gray-500">
                                Submitted: {format(new Date(submission.submitted_at || submission.created_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              {submission.grade !== null && submission.grade !== undefined ? (
                                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold">
                                  {submission.grade}%
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">
                                  Pending
                                </span>
                              )}
                              {submission.points_awarded > 0 && (
                                <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium flex items-center gap-1">
                                  <Coins className="w-3 h-3" />
                                  +{submission.points_awarded} pts
                                </span>
                              )}
                            </div>
                          </div>
                          {submission.feedback && (
                            <div className="mt-2 p-3 rounded-xl bg-white/60">
                              <p className="text-xs font-medium text-gray-700 mb-1">Teacher Feedback:</p>
                              <p className="text-sm text-gray-600">{submission.feedback}</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
