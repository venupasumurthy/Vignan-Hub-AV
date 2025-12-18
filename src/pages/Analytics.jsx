import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Award, BookOpen, FileText, Target, BarChart3, FileQuestion, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const COLORS = ['#667eea', '#f093fb', '#43e97b', '#fa709a', '#30cfd0', '#FFD700'];

export default function Analytics() {
  const [user, setUser] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    gradeDistribution: [],
    coursePerformance: [],
    assignmentStatus: [],
    badgesProgress: [],
    pointsOverTime: [],
    quizScoreDistribution: [],
    quizPerformance: [],
    quizVsAssignment: []
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) {
        base44.auth.redirectToLogin();
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Load submissions
      const mySubmissions = await base44.entities.Submission.filter(
        { student_id: currentUser.id },
        '-created_date'
      );
      setSubmissions(mySubmissions);

      // Load quiz attempts
      const myQuizAttempts = await base44.entities.QuizAttempt.filter(
        { student_id: currentUser.id },
        '-created_date'
      );
      setQuizAttempts(myQuizAttempts);

      // Load courses
      const allCourses = await base44.entities.Course.list();
      const enrolledCourses = allCourses.filter(c =>
        currentUser.enrolled_courses?.includes(c.id)
      );
      setCourses(enrolledCourses);

      // Load badges
      const allBadges = await base44.entities.Badge.list();
      setBadges(allBadges);

      // Calculate analytics
      calculateAnalytics(mySubmissions, myQuizAttempts, enrolledCourses, allBadges, currentUser);

      setLoading(false);
    } catch (error) {
      console.error("Error loading analytics:", error);
      if (error.message && (error.message.includes("logged in") || error.message.includes("authenticated"))) {
        base44.auth.redirectToLogin();
        return;
      }
      setLoading(false);
    }
  };

  const calculateAnalytics = (subs, quizzes, courses, allBadges, currentUser) => {
    // Grade Distribution (Assignments)
    const gradeRanges = {
      'A (90-100)': 0,
      'B (80-89)': 0,
      'C (70-79)': 0,
      'D (60-69)': 0,
      'F (Below 60)': 0
    };

    subs.forEach(sub => {
      if (sub.grade !== null && sub.grade !== undefined) {
        if (sub.grade >= 90) gradeRanges['A (90-100)']++;
        else if (sub.grade >= 80) gradeRanges['B (80-89)']++;
        else if (sub.grade >= 70) gradeRanges['C (70-79)']++;
        else if (sub.grade >= 60) gradeRanges['D (60-69)']++;
        else gradeRanges['F (Below 60)']++;
      }
    });

    const gradeDistribution = Object.entries(gradeRanges).map(([name, value]) => ({
      name,
      value
    }));

    // Quiz Score Distribution
    const quizScoreRanges = {
      'A (90-100)': 0,
      'B (80-89)': 0,
      'C (70-79)': 0,
      'D (60-69)': 0,
      'F (Below 60)': 0
    };

    quizzes.forEach(quiz => {
      if (quiz.score >= 90) quizScoreRanges['A (90-100)']++;
      else if (quiz.score >= 80) quizScoreRanges['B (80-89)']++;
      else if (quiz.score >= 70) quizScoreRanges['C (70-79)']++;
      else if (quiz.score >= 60) quizScoreRanges['D (60-69)']++;
      else quizScoreRanges['F (Below 60)']++;
    });

    const quizScoreDistribution = Object.entries(quizScoreRanges).map(([name, value]) => ({
      name,
      value
    }));

    // Course Performance
    const coursePerformance = courses.map(course => {
      const courseSubs = subs.filter(s => s.assignment_title?.includes(course.title));
      const gradedSubs = courseSubs.filter(s => s.grade !== null && s.grade !== undefined);
      const avgGrade = gradedSubs.length > 0
        ? gradedSubs.reduce((sum, s) => sum + s.grade, 0) / gradedSubs.length
        : 0;

      return {
        name: course.title.length > 15 ? course.title.substring(0, 15) + '...' : course.title,
        grade: parseFloat(avgGrade.toFixed(1)),
        assignments: courseSubs.length
      };
    }).filter(c => c.assignments > 0);

    // Quiz Performance Over Time
    const quizPerformance = quizzes.slice(0, 10).reverse().map((quiz, index) => ({
      quiz: `Quiz #${index + 1}`,
      score: quiz.score,
      correct: quiz.correct_answers,
      wrong: quiz.wrong_answers
    }));

    // Assignment Status
    const graded = subs.filter(s => s.grade !== null && s.grade !== undefined).length;
    const pending = subs.filter(s => s.grade === null || s.grade === undefined).length;

    const assignmentStatus = [
      { name: 'Graded', value: graded },
      { name: 'Pending', value: pending }
    ];

    // Quiz vs Assignment Performance Comparison
    const avgAssignmentGrade = subs.filter(s => s.grade !== null && s.grade !== undefined)
      .reduce((sum, s) => sum + s.grade, 0) / Math.max(subs.filter(s => s.grade !== null).length, 1);

    const avgQuizScore = quizzes.length > 0
      ? quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length
      : 0;

    const quizVsAssignment = [
      { name: 'Assignments', score: parseFloat(avgAssignmentGrade.toFixed(1)) },
      { name: 'Quizzes', score: parseFloat(avgQuizScore.toFixed(1)) }
    ];

    // Badges Progress
    const earnedBadges = currentUser.badges?.length || 0;
    const totalBadges = allBadges.length;

    const badgesProgress = [
      { name: 'Earned', value: earnedBadges },
      { name: 'Not Earned', value: Math.max(0, totalBadges - earnedBadges) }
    ];

    // Points Over Time
    let cumulativePoints = 0;
    const pointsOverTime = subs
      .slice(0, 10)
      .reverse()
      .map((sub, index) => {
        if (sub.grade !== null && sub.grade !== undefined) {
          cumulativePoints += sub.grade;
        }
        return {
          assignment: `#${index + 1}`,
          points: cumulativePoints
        };
      });

    setAnalytics({
      gradeDistribution,
      coursePerformance,
      assignmentStatus,
      badgesProgress,
      pointsOverTime,
      quizScoreDistribution,
      quizPerformance,
      quizVsAssignment
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600" />
      </div>
    );
  }

  const gradedSubmissions = submissions.filter(s => s.grade !== null && s.grade !== undefined);
  const avgGrade = gradedSubmissions.length > 0
    ? (gradedSubmissions.reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions.length).toFixed(1)
    : 0;

  const avgQuizScore = quizAttempts.length > 0
    ? (quizAttempts.reduce((sum, q) => sum + q.score, 0) / quizAttempts.length).toFixed(1)
    : 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="clay-card p-8 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-blue-100">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              My Analytics
            </h1>
            <p className="text-slate-600">Track your academic performance and progress</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="clay-card p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-10 h-10 text-green-500" />
            <span className="text-3xl font-bold text-green-600">{avgGrade}%</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Avg Assignment Grade</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="clay-card p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <FileQuestion className="w-10 h-10 text-blue-500" />
            <span className="text-3xl font-bold text-blue-600">{avgQuizScore}%</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Avg Quiz Score</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="clay-card p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-10 h-10 text-purple-500" />
            <span className="text-3xl font-bold text-purple-600">{submissions.length}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Total Submissions</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="clay-card p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Trophy className="w-10 h-10 text-amber-500" />
            <span className="text-3xl font-bold text-amber-600">{quizAttempts.length}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Quizzes Attempted</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="clay-card p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Target className="w-10 h-10 text-pink-500" />
            <span className="text-3xl font-bold text-pink-600">{user?.points || 0}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Total Points</p>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assignment Grade Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="clay-card p-6"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Assignment Grade Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.gradeDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.gradeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quiz Score Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="clay-card p-6"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-blue-600" />
            Quiz Score Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.quizScoreDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.quizScoreDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quiz vs Assignment Performance */}
        {analytics.quizVsAssignment.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="clay-card p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Quiz vs Assignment Performance
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.quizVsAssignment}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" fill="#667eea" name="Average Score %" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Quiz Performance Over Time */}
        {analytics.quizPerformance.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="clay-card p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-600" />
              Quiz Performance Trend
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.quizPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quiz" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Score %"
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Course Performance */}
        {analytics.coursePerformance.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="clay-card p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-600" />
              Course Performance
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.coursePerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="grade" fill="#667eea" name="Average Grade %" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Assignment Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="clay-card p-6"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Assignment Status
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.assignmentStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.assignmentStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#43e97b' : '#fa709a'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Badges Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="clay-card p-6"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-600" />
            Badges Progress
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.badgesProgress}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.badgesProgress.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#FFD700' : '#E0E0E0'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              You've earned <span className="font-bold text-yellow-600">{user?.badges?.length || 0}</span> out of{' '}
              <span className="font-bold">{badges.length}</span> badges
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full"
                style={{
                  width: `${badges.length > 0 ? ((user?.badges?.length || 0) / badges.length) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Points Progress */}
        {analytics.pointsOverTime.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="clay-card p-6 lg:col-span-2"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-pink-600" />
              Cumulative Points Progress
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.pointsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="assignment" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="points"
                  stroke="#f093fb"
                  strokeWidth={3}
                  name="Cumulative Points"
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>

      {/* Performance Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="clay-card p-8 mt-8"
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-4">📊 Performance Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-green-50 border border-green-200">
            <h3 className="font-bold text-green-900 mb-2">🎯 Strengths</h3>
            <ul className="text-sm text-slate-700 space-y-1">
              {avgGrade >= 80 && <li>✅ Excellent average assignment grade ({avgGrade}%)</li>}
              {avgQuizScore >= 80 && <li>✅ Great quiz performance ({avgQuizScore}%)</li>}
              {(user?.badges?.length || 0) > 0 && <li>✅ Earned {user?.badges?.length} badge{(user?.badges?.length || 0) !== 1 ? 's' : ''}</li>}
              {gradedSubmissions.length > 0 && <li>✅ {gradedSubmissions.length} assignments graded</li>}
              {quizAttempts.length > 0 && <li>✅ Completed {quizAttempts.length} quiz{quizAttempts.length !== 1 ? 'zes' : ''}</li>}
              {(user?.points || 0) >= 100 && <li>✅ Accumulated {user?.points} points</li>}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
            <h3 className="font-bold text-orange-900 mb-2">📈 Areas to Improve</h3>
            <ul className="text-sm text-slate-700 space-y-1">
              {avgGrade < 70 && <li>⚠️ Focus on improving assignment grades</li>}
              {avgQuizScore < 70 && <li>⚠️ Work on quiz preparation and understanding</li>}
              {submissions.length - gradedSubmissions.length > 0 && (
                <li>⚠️ {submissions.length - gradedSubmissions.length} pending assignment{submissions.length - gradedSubmissions.length !== 1 ? 's' : ''}</li>
              )}
              {(user?.badges?.length || 0) < badges.length && (
                <li>⚠️ {badges.length - (user?.badges?.length || 0)} more badge{badges.length - (user?.badges?.length || 0) !== 1 ? 's' : ''} to earn</li>
              )}
              {quizAttempts.length === 0 && <li>⚠️ No quizzes attempted yet</li>}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <h3 className="font-bold text-blue-900 mb-2">🎓 Quick Stats</h3>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>📚 Enrolled in {courses.length} course{courses.length !== 1 ? 's' : ''}</li>
              <li>📝 Submitted {submissions.length} assignment{submissions.length !== 1 ? 's' : ''}</li>
              <li>🎯 Attempted {quizAttempts.length} quiz{quizAttempts.length !== 1 ? 'zes' : ''}</li>
              <li>⭐ {(user?.completed_courses?.length || 0)} course{(user?.completed_courses?.length || 0) !== 1 ? 's' : ''} completed</li>
              <li>🏆 Rank: {(user?.points || 0) >= 500 ? 'Gold' : (user?.points || 0) >= 200 ? 'Silver' : 'Bronze'}</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}