import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Award, FileText, ChevronDown, ChevronUp, Download } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function Grades() {
  const [user, setUser] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssignments: 0,
    completedAssignments: 0,
    averageGrade: 0,
    totalPoints: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser.role === 'user') {
        // Student view
        const mySubmissions = await base44.entities.Submission.filter(
          { student_id: currentUser.id },
          '-created_date'
        );
        setSubmissions(mySubmissions);

        // Calculate stats
        const graded = mySubmissions.filter(s => s.grade !== null && s.grade !== undefined);
        const avgGrade = graded.length > 0 
          ? graded.reduce((sum, s) => sum + s.grade, 0) / graded.length 
          : 0;
        const totalPoints = currentUser.points || 0;

        setStats({
          totalAssignments: mySubmissions.length,
          completedAssignments: graded.length,
          averageGrade: avgGrade.toFixed(1),
          totalPoints
        });

        // Get enrolled courses
        const enrolledCourseIds = currentUser.enrolled_courses || [];
        if (enrolledCourseIds.length > 0) {
          const allCourses = await base44.entities.Course.list();
          const enrolledCourses = allCourses.filter(c => enrolledCourseIds.includes(c.id));
          setCourses(enrolledCourses);
        }
      } else {
        // Teacher view - get all submissions for their courses
        const myCourses = await base44.entities.Course.filter({ teacher_id: currentUser.id });
        setCourses(myCourses);
        
        const allSubmissions = await base44.entities.Submission.list('-created_date');
        const myAssignments = await base44.entities.Assignment.list();
        const myAssignmentIds = myAssignments
          .filter(a => myCourses.some(c => c.id === a.course_id))
          .map(a => a.id);
        
        const relevantSubmissions = allSubmissions.filter(s => 
          myAssignmentIds.includes(s.assignment_id)
        );
        setSubmissions(relevantSubmissions);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading grades:", error);
      setLoading(false);
    }
  };

  const gradeSubmission = async (submissionId, grade, feedback) => {
    try {
      await base44.entities.Submission.update(submissionId, {
        grade: parseFloat(grade),
        feedback,
        status: "graded"
      });

      const submission = submissions.find(s => s.id === submissionId);
      
      await base44.entities.Notification.create({
        user_id: submission.student_id,
        message: `Your assignment "${submission.assignment_title}" has been graded: ${grade}%`,
        type: "grade",
        read: false
      });

      loadData();
    } catch (error) {
      console.error("Error grading submission:", error);
    }
  };

  const downloadGradesCSV = () => {
    if (user.role !== 'user') return;
    
    const csvContent = [
      ['Assignment', 'Course', 'Grade', 'Submitted Date', 'Feedback'],
      ...submissions.map(s => [
        s.assignment_title || 'N/A',
        courses.find(c => submissions.find(sub => sub.assignment_id)?.course_id === c.id)?.title || 'N/A',
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

  const getCourseSubmissions = (courseId) => {
    return submissions.filter(s => {
      const assignment = s.assignment_id;
      // This is simplified - in real app, you'd need to query assignments
      return true;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (user?.role === 'admin') {
    // Teacher View - Grading Interface
    return (
      <div className="max-w-7xl mx-auto">
        <div className="clay-card p-8 mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Grade Submissions
          </h1>
          <p className="text-gray-600">Review and grade student submissions</p>
        </div>

        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="clay-card p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No submissions to grade yet</p>
            </div>
          ) : (
            submissions.map((submission, index) => (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="clay-card p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{submission.assignment_title}</h3>
                    <p className="text-sm text-gray-600">Student: {submission.student_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted: {format(new Date(submission.submitted_at || submission.created_date), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  {submission.status === 'graded' && (
                    <div className="px-4 py-2 rounded-full bg-green-100 text-green-700 font-medium">
                      Graded: {submission.grade}%
                    </div>
                  )}
                </div>

                <div className="mb-4 p-4 rounded-2xl bg-gray-50">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.content}</p>
                </div>

                {submission.status !== 'graded' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Grade (0-100)"
                      className="clay-input"
                      id={`grade-${submission.id}`}
                    />
                    <input
                      type="text"
                      placeholder="Feedback (optional)"
                      className="clay-input md:col-span-2"
                      id={`feedback-${submission.id}`}
                    />
                    <button
                      onClick={() => {
                        const grade = document.getElementById(`grade-${submission.id}`).value;
                        const feedback = document.getElementById(`feedback-${submission.id}`).value;
                        if (grade) gradeSubmission(submission.id, grade, feedback);
                      }}
                      className="clay-button px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-medium rounded-2xl md:col-span-3"
                    >
                      Submit Grade
                    </button>
                  </div>
                ) : (
                  submission.feedback && (
                    <div className="p-4 rounded-2xl bg-blue-50">
                      <p className="text-sm font-medium text-blue-900 mb-1">Your Feedback:</p>
                      <p className="text-sm text-blue-700">{submission.feedback}</p>
                    </div>
                  )
                )}
              </motion.div>
            ))
          )}
        </div>
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
              My Grades
            </h1>
            <p className="text-gray-600">Track your academic performance</p>
          </div>
          <button
            onClick={downloadGradesCSV}
            className="clay-button px-6 py-3 flex items-center gap-2 text-green-600 font-medium"
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
            const courseSubmissions = submissions.filter(s => {
              // Simple filter - in production you'd query by course_id through assignments
              return true;
            });
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
                            {submission.grade !== null && submission.grade !== undefined ? (
                              <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold">
                                {submission.grade}%
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">
                                Pending
                              </span>
                            )}
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