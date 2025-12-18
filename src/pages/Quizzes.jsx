import React, { useState, useEffect } from "react";
import { vignan } from "@/api/vignanClient";
import {
  FileQuestion, Plus, Edit, Trash2, Eye, Play, CheckCircle,
  XCircle, Award, Clock, BookOpen, Save, X, AlertCircle, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function Quizzes() {
  const [user, setUser] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAttemptModal, setShowAttemptModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showScoresModal, setShowScoresModal] = useState(false);

  // Selected items
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [quizScores, setQuizScores] = useState([]);

  // Quiz creation/editing
  const [quizData, setQuizData] = useState({
    title: "",
    description: "",
    course_id: "",
    time_limit: 30,
    questions: []
  });

  // Current question being added/edited
  const [currentQuestion, setCurrentQuestion] = useState({
    question: "",
    options: ["", "", "", ""],
    correct_answer: 0
  });

  // Quiz attempt
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState([]);

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
      const allQuizzes = await vignan.entities.Quiz.list('-created_date');
      const allAttempts = await vignan.entities.QuizAttempt.list('-created_date');

      if (currentUser.account_type === 'teacher') {
        const myCourses = allCourses.filter(c => c.teacher_id === currentUser.id);
        setCourses(myCourses);

        const myQuizzes = allQuizzes.filter(q => q.teacher_id === currentUser.id);
        setQuizzes(myQuizzes);

        const myQuizIds = myQuizzes.map(q => q.id);
        const relevantAttempts = allAttempts.filter(a => myQuizIds.includes(a.quiz_id));
        setAttempts(relevantAttempts);

        console.log(`Teacher: Found ${myQuizzes.length} quizzes, ${relevantAttempts.length} attempts`);
      } else {
        setCourses(allCourses);

        const enrolledCourseIds = currentUser.enrolled_courses || [];
        console.log("Student enrolled courses:", enrolledCourseIds);

        const availableQuizzes = allQuizzes.filter(q => {
          const isPublished = q.published === true;
          const isEnrolled = enrolledCourseIds.includes(q.course_id);
          console.log(`Quiz ${q.title}: published=${isPublished}, enrolled=${isEnrolled}, course=${q.course_id}`);
          return isPublished && isEnrolled;
        });

        setQuizzes(availableQuizzes);

        const myAttempts = allAttempts.filter(a => a.student_id === currentUser.id);
        setAttempts(myAttempts);

        console.log(`Student: Found ${availableQuizzes.length} available quizzes, ${myAttempts.length} attempts`);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading quizzes:", error);
      if (error.message && error.message.includes("logged in")) {
        vignan.auth.redirectToLogin();
        return;
      }
      setLoading(false);
    }
  };

  const addQuestion = () => {
    if (!currentQuestion.question || currentQuestion.options.some(o => !o.trim())) {
      alert("Please fill in the question and all 4 options!");
      return;
    }

    setQuizData({
      ...quizData,
      questions: [...quizData.questions, { ...currentQuestion }]
    });

    setCurrentQuestion({
      question: "",
      options: ["", "", "", ""],
      correct_answer: 0
    });
  };

  const removeQuestion = (index) => {
    const updated = quizData.questions.filter((_, i) => i !== index);
    setQuizData({ ...quizData, questions: updated });
  };

  const editQuestion = (index) => {
    setCurrentQuestion(quizData.questions[index]);
    removeQuestion(index);
  };

  const createQuiz = async (e) => {
    e.preventDefault();

    if (!quizData.course_id) {
      alert("Please select a course!");
      return;
    }

    if (quizData.questions.length === 0) {
      alert("Please add at least one question!");
      return;
    }

    try {
      const course = courses.find(c => c.id === quizData.course_id);

      await vignan.entities.Quiz.create({
        title: quizData.title,
        description: quizData.description,
        course_id: quizData.course_id,
        course_title: course?.title || "",
        teacher_id: user.id,
        teacher_name: user.full_name,
        questions: quizData.questions,
        total_points: quizData.questions.length * 10,
        time_limit: quizData.time_limit,
        published: false
      });

      setQuizData({
        title: "",
        description: "",
        course_id: "",
        time_limit: 30,
        questions: []
      });
      setShowCreateModal(false);
      loadData();
      alert("Quiz created successfully! Don't forget to publish it so students can see it.");
    } catch (error) {
      console.error("Error creating quiz:", error);
      alert("Failed to create quiz. Please try again.");
    }
  };

  const updateQuiz = async (e) => {
    e.preventDefault();

    if (quizData.questions.length === 0) {
      alert("Please add at least one question!");
      return;
    }

    try {
      await vignan.entities.Quiz.update(selectedQuiz.id, {
        title: quizData.title,
        description: quizData.description,
        questions: quizData.questions,
        total_points: quizData.questions.length * 10,
        time_limit: quizData.time_limit
      });

      setShowEditModal(false);
      setSelectedQuiz(null);
      loadData();
      alert("Quiz updated successfully!");
    } catch (error) {
      console.error("Error updating quiz:", error);
      alert("Failed to update quiz. Please try again.");
    }
  };

  const deleteQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to delete this quiz? This will also delete all student attempts.")) return;

    try {
      await vignan.entities.Quiz.delete(quizId);

      const quizAttempts = attempts.filter(a => a.quiz_id === quizId);
      for (const attempt of quizAttempts) {
        await vignan.entities.QuizAttempt.delete(attempt.id);
      }

      loadData();
      alert("Quiz deleted successfully!");
    } catch (error) {
      console.error("Error deleting quiz:", error);
      alert("Failed to delete quiz. Please try again.");
    }
  };

  const togglePublish = async (quiz) => {
    try {
      const newPublishedState = !quiz.published;

      await vignan.entities.Quiz.update(quiz.id, {
        published: newPublishedState
      });

      if (newPublishedState) {
        const course = courses.find(c => c.id === quiz.course_id);
        const enrolledStudents = course?.enrolled_students || [];

        console.log(`Publishing quiz to ${enrolledStudents.length} students in course ${course?.title}`);

        for (const studentId of enrolledStudents) {
          try {
            await vignan.entities.Notification.create({
              user_id: studentId,
              message: `New quiz published: "${quiz.title}" in ${quiz.course_title}`,
              type: "course",
              read: false
            });
          } catch (err) {
            console.error("Error notifying student:", err);
          }
        }

        alert(`Quiz published successfully! ${enrolledStudents.length} students have been notified.`);
      } else {
        alert("Quiz unpublished. Students can no longer see or attempt this quiz.");
      }

      loadData();
    } catch (error) {
      console.error("Error toggling publish:", error);
      alert("Failed to update quiz. Please try again.");
    }
  };

  const startQuiz = (quiz) => {
    if (confirm(`You are about to start: "${quiz.title}"\n\nOnce you start, make sure to complete it. Are you ready?`)) {
      setSelectedQuiz(quiz);
      setQuizAnswers(new Array(quiz.questions.length).fill(-1));
      setQuizStartTime(Date.now());
      setCurrentQuestionIndex(0);
      setBookmarkedQuestions([]);
      setShowAttemptModal(true);
    }
  };

  const toggleBookmark = (questionIndex) => {
    if (bookmarkedQuestions.includes(questionIndex)) {
      setBookmarkedQuestions(bookmarkedQuestions.filter(i => i !== questionIndex));
    } else {
      setBookmarkedQuestions([...bookmarkedQuestions, questionIndex]);
    }
  };

  const submitQuiz = async () => {
    const unanswered = quizAnswers.filter(a => a === -1).length;

    if (unanswered > 0) {
      if (!window.confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) {
        return;
      }
    }

    try {
      const timeTaken = Math.floor((Date.now() - quizStartTime) / 1000);

      let correctCount = 0;
      selectedQuiz.questions.forEach((q, i) => {
        if (quizAnswers[i] === q.correct_answer) {
          correctCount++;
        }
      });

      const wrongCount = selectedQuiz.questions.length - correctCount;
      const score = Math.round((correctCount / selectedQuiz.questions.length) * 100);

      console.log("Submitting quiz:", {
        quiz_id: selectedQuiz.id,
        student_id: user.id,
        score,
        correct: correctCount,
        wrong: wrongCount
      });

      const attempt = await vignan.entities.QuizAttempt.create({
        quiz_id: selectedQuiz.id,
        quiz_title: selectedQuiz.title,
        student_id: user.id,
        student_name: user.full_name,
        student_email: user.email,
        answers: quizAnswers,
        score: score,
        total_questions: selectedQuiz.questions.length,
        correct_answers: correctCount,
        wrong_answers: wrongCount,
        completed_at: new Date().toISOString(),
        time_taken: timeTaken
      });

      const pointsEarned = correctCount * 5;
      await vignan.auth.updateMe({
        points: (user.points || 0) + pointsEarned
      });

      await vignan.entities.Notification.create({
        user_id: user.id,
        message: `Quiz completed: "${selectedQuiz.title}". Score: ${score}% (+${pointsEarned} points)`,
        type: "course",
        read: false
      });

      console.log("Quiz submitted successfully!");

      setSelectedAttempt(attempt);
      setShowAttemptModal(false);
      setShowResultModal(true);
      loadData();
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Failed to submit quiz. Please try again.");
    }
  };

  const viewScores = async (quiz) => {
    const scores = attempts.filter(a => a.quiz_id === quiz.id);
    console.log(`Viewing scores for quiz ${quiz.title}: ${scores.length} attempts`);
    setQuizScores(scores);
    setSelectedQuiz(quiz);
    setShowScoresModal(true);
  };

  const hasAttempted = (quizId) => {
    return attempts.some(a => a.quiz_id === quizId && a.student_id === user?.id);
  };

  const getAttempt = (quizId) => {
    return attempts.find(a => a.quiz_id === quizId && a.student_id === user?.id);
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Quizzes
            </h1>
            <p className="text-slate-600">
              {user?.account_type === 'teacher'
                ? "Create and manage quizzes for your courses"
                : "Attempt published quizzes and test your knowledge"}
            </p>
          </div>
          {user?.account_type === 'teacher' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="clay-button-primary px-6 py-3 flex items-center gap-2 rounded-lg"
            >
              <Plus className="w-5 h-5" />
              Create Quiz
            </button>
          )}
        </div>
      </div>

      {/* Student Info Message */}
      {user?.account_type === 'student' && quizzes.length === 0 && (
        <div className="clay-card p-6 mb-6 bg-slate-50 border border-slate-200">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-slate-800 mb-2">No Quizzes Available Yet</h3>
              <p className="text-sm text-slate-600">
                You'll see quizzes here once your teachers publish them. Make sure you're enrolled in courses to see their quizzes!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quizzes Grid */}
      {quizzes.length === 0 && user?.account_type === 'teacher' ? (
        <div className="clay-card p-12 text-center">
          <FileQuestion className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            No quizzes created yet. Click 'Create Quiz' to get started.
          </p>
        </div>
      ) : quizzes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz, index) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="clay-card p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-purple-100 text-purple-600">
                  <FileQuestion className="w-6 h-6" />
                </div>

                {user?.account_type === 'teacher' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedQuiz(quiz);
                        setQuizData({
                          title: quiz.title,
                          description: quiz.description,
                          course_id: quiz.course_id,
                          time_limit: quiz.time_limit,
                          questions: [...quiz.questions]
                        });
                        setShowEditModal(true);
                      }}
                      className="clay-button p-2 text-blue-600 hover:bg-slate-50"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteQuiz(quiz.id)}
                      className="clay-button p-2 text-red-600 hover:bg-slate-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="font-bold text-lg text-gray-800 mb-2">{quiz.title}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{quiz.description}</p>

              <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                  {quiz.course_title}
                </span>
                <span className="flex items-center gap-1 text-gray-600">
                  <FileQuestion className="w-4 h-4" />
                  {quiz.questions?.length || 0} questions
                </span>
                {quiz.time_limit && (
                  <span className="flex items-center gap-1 text-gray-600">
                    <Clock className="w-4 h-4" />
                    {quiz.time_limit} min
                  </span>
                )}
              </div>

              {user?.account_type === 'teacher' ? (
                <div className="space-y-2">
                  <button
                    onClick={() => togglePublish(quiz)}
                    className={`clay-button w-full px-4 py-2 font-medium rounded-lg ${quiz.published
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                      }`}
                  >
                    {quiz.published ? '✓ Published' : '📝 Not Published - Click to Publish'}
                  </button>
                  <button
                    onClick={() => viewScores(quiz)}
                    className="clay-button w-full px-4 py-2 font-medium flex items-center justify-center gap-2 text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <Eye className="w-4 h-4" />
                    View Submissions ({attempts.filter(a => a.quiz_id === quiz.id).length})
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {hasAttempted(quiz.id) ? (
                    <>
                      <div className="px-4 py-2 rounded-lg bg-green-100 text-green-700 font-medium text-center border border-green-200">
                        ✓ Completed - {getAttempt(quiz.id).score}%
                      </div>
                      <button
                        onClick={() => {
                          setSelectedAttempt(getAttempt(quiz.id));
                          setSelectedQuiz(quiz);
                          setShowResultModal(true);
                        }}
                        className="clay-button w-full px-4 py-2 font-medium flex items-center justify-center gap-2 text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
                        View My Results
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startQuiz(quiz)}
                      className="clay-button-primary w-full px-4 py-3 font-medium flex items-center justify-center gap-2 rounded-lg"
                    >
                      <Play className="w-5 h-5" />
                      Start Quiz
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : null}

      {/* Create Quiz Modal */}
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
              className="clay-card p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Create Quiz</h2>
                <button onClick={() => setShowCreateModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={createQuiz} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quiz Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={quizData.title}
                      onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                      className="clay-input w-full"
                      placeholder="Enter quiz title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course *
                    </label>
                    <select
                      required
                      value={quizData.course_id}
                      onChange={(e) => setQuizData({ ...quizData, course_id: e.target.value })}
                      className="clay-input w-full"
                    >
                      <option value="">Select a course</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={quizData.description}
                    onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                    className="clay-input w-full h-20 resize-none"
                    placeholder="Quiz description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={quizData.time_limit}
                    onChange={(e) => setQuizData({ ...quizData, time_limit: parseInt(e.target.value) })}
                    className="clay-input w-full"
                  />
                </div>

                <div className="clay-card p-6 bg-gradient-to-r from-blue-50 to-purple-50">
                  <h3 className="font-bold text-lg text-gray-800 mb-4">Add Question</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question *
                      </label>
                      <input
                        type="text"
                        value={currentQuestion.question}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                        className="clay-input w-full"
                        placeholder="Enter your question"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Option {i + 1} *
                          </label>
                          <input
                            type="text"
                            value={currentQuestion.options[i]}
                            onChange={(e) => {
                              const newOptions = [...currentQuestion.options];
                              newOptions[i] = e.target.value;
                              setCurrentQuestion({ ...currentQuestion, options: newOptions });
                            }}
                            className="clay-input w-full"
                            placeholder={`Option ${i + 1}`}
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Correct Answer *
                      </label>
                      <select
                        value={currentQuestion.correct_answer}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: parseInt(e.target.value) })}
                        className="clay-input w-full"
                      >
                        <option value={0}>Option 1</option>
                        <option value={1}>Option 2</option>
                        <option value={2}>Option 3</option>
                        <option value={3}>Option 4</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={addQuestion}
                      className="clay-button w-full px-4 py-2 font-medium"
                      style={{
                        background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                        color: 'white'
                      }}
                    >
                      + Add Question
                    </button>
                  </div>
                </div>

                {quizData.questions.length > 0 && (
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 mb-4">
                      Questions ({quizData.questions.length})
                    </h3>
                    <div className="space-y-3">
                      {quizData.questions.map((q, index) => (
                        <div key={index} className="clay-card p-4 bg-white">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800 mb-2">
                                {index + 1}. {q.question}
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {q.options.map((opt, i) => (
                                  <div
                                    key={i}
                                    className={`px-3 py-1 rounded-lg ${i === q.correct_answer
                                      ? 'bg-green-100 text-green-700 font-medium'
                                      : 'bg-gray-100 text-gray-700'
                                      }`}
                                  >
                                    {String.fromCharCode(65 + i)}. {opt}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                type="button"
                                onClick={() => editQuestion(index)}
                                className="clay-button p-2"
                                style={{ color: '#3b82f6' }}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeQuestion(index)}
                                className="clay-button p-2"
                                style={{ color: '#ef4444' }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="clay-button-primary w-full px-6 py-3 font-medium rounded-lg flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Create Quiz
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Quiz Modal */}
      <AnimatePresence>
        {showEditModal && selectedQuiz && (
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
              className="clay-card p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Edit Quiz</h2>
                <button onClick={() => setShowEditModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={updateQuiz} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quiz Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={quizData.title}
                      onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                      className="clay-input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Limit (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={quizData.time_limit}
                      onChange={(e) => setQuizData({ ...quizData, time_limit: parseInt(e.target.value) })}
                      className="clay-input w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={quizData.description}
                    onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                    className="clay-input w-full h-20 resize-none"
                  />
                </div>

                <div className="clay-card p-6 bg-gradient-to-r from-blue-50 to-purple-50">
                  <h3 className="font-bold text-lg text-gray-800 mb-4">Add Question</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question *
                      </label>
                      <input
                        type="text"
                        value={currentQuestion.question}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                        className="clay-input w-full"
                        placeholder="Enter your question"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Option {i + 1} *
                          </label>
                          <input
                            type="text"
                            value={currentQuestion.options[i]}
                            onChange={(e) => {
                              const newOptions = [...currentQuestion.options];
                              newOptions[i] = e.target.value;
                              setCurrentQuestion({ ...currentQuestion, options: newOptions });
                            }}
                            className="clay-input w-full"
                            placeholder={`Option ${i + 1}`}
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Correct Answer *
                      </label>
                      <select
                        value={currentQuestion.correct_answer}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: parseInt(e.target.value) })}
                        className="clay-input w-full"
                      >
                        <option value={0}>Option 1</option>
                        <option value={1}>Option 2</option>
                        <option value={2}>Option 3</option>
                        <option value={3}>Option 4</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={addQuestion}
                      className="clay-button w-full px-4 py-2 font-medium"
                      style={{
                        background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                        color: 'white'
                      }}
                    >
                      + Add Question
                    </button>
                  </div>
                </div>

                {quizData.questions.length > 0 && (
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 mb-4">
                      Questions ({quizData.questions.length})
                    </h3>
                    <div className="space-y-3">
                      {quizData.questions.map((q, index) => (
                        <div key={index} className="clay-card p-4 bg-white">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800 mb-2">
                                {index + 1}. {q.question}
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {q.options.map((opt, i) => (
                                  <div
                                    key={i}
                                    className={`px-3 py-1 rounded-lg ${i === q.correct_answer
                                      ? 'bg-green-100 text-green-700 font-medium'
                                      : 'bg-gray-100 text-gray-700'
                                      }`}
                                  >
                                    {String.fromCharCode(65 + i)}. {opt}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                type="button"
                                onClick={() => editQuestion(index)}
                                className="clay-button p-2"
                                style={{ color: '#3b82f6' }}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeQuestion(index)}
                                className="clay-button p-2"
                                style={{ color: '#ef4444' }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="clay-button w-full px-6 py-3 font-medium rounded-2xl flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white'
                  }}
                >
                  <Save className="w-5 h-5" />
                  Update Quiz
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attempt Quiz Modal */}
      <AnimatePresence>
        {showAttemptModal && selectedQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">{selectedQuiz.title}</h2>
                  <div className="text-sm text-gray-600">
                    Question {currentQuestionIndex + 1} of {selectedQuiz.questions.length}
                  </div>
                </div>

                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / selectedQuiz.questions.length) * 100}%` }}
                  />
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedQuiz.questions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all relative ${idx === currentQuestionIndex
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                        : quizAnswers[idx] !== -1
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                        }`}
                    >
                      {idx + 1}
                      {bookmarkedQuestions.includes(idx) && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" />
                      )}
                    </button>
                  ))}
                </div>

                {bookmarkedQuestions.length > 0 && (
                  <div className="clay-card p-3 bg-gradient-to-r from-yellow-50 to-orange-50 mb-4">
                    <p className="text-xs font-medium text-gray-700 flex items-center gap-2">
                      <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                      {bookmarkedQuestions.length} question{bookmarkedQuestions.length !== 1 ? 's' : ''} bookmarked for review
                    </p>
                  </div>
                )}
              </div>

              <div className="clay-card p-6 bg-gradient-to-r from-blue-50 to-purple-50 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-lg font-medium text-gray-800 flex-1">
                    {selectedQuiz.questions[currentQuestionIndex].question}
                  </p>

                  <button
                    onClick={() => toggleBookmark(currentQuestionIndex)}
                    className={`clay-button p-2 ml-4 ${bookmarkedQuestions.includes(currentQuestionIndex)
                      ? 'bg-yellow-100'
                      : ''
                      }`}
                    title={bookmarkedQuestions.includes(currentQuestionIndex) ? "Remove bookmark" : "Bookmark for review"}
                  >
                    <svg
                      className={`w-5 h-5 ${bookmarkedQuestions.includes(currentQuestionIndex)
                        ? 'fill-yellow-500'
                        : 'fill-none stroke-gray-600'
                        }`}
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedQuiz.questions[currentQuestionIndex].options.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const newAnswers = [...quizAnswers];
                        newAnswers[currentQuestionIndex] = i;
                        setQuizAnswers(newAnswers);
                      }}
                      className={`clay-button w-full px-4 py-3 text-left font-medium transition-all ${quizAnswers[currentQuestionIndex] === i
                        ? 'ring-2 ring-purple-500 bg-purple-50'
                        : ''
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{
                          background: quizAnswers[currentQuestionIndex] === i
                            ? 'linear-gradient(135deg, #667eea, #764ba2)'
                            : '#e5e7eb',
                          color: quizAnswers[currentQuestionIndex] === i ? 'white' : '#6b7280'
                        }}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span>{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between gap-4">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="clay-button px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: '#6b7280' }}
                >
                  Previous
                </button>

                {currentQuestionIndex < selectedQuiz.questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    className="clay-button px-6 py-3 font-medium"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      color: 'white'
                    }}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={submitQuiz}
                    className="clay-button px-6 py-3 font-medium flex items-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                      color: 'white'
                    }}
                  >
                    <CheckCircle className="w-5 h-5" />
                    Submit Quiz
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Modal */}
      <AnimatePresence>
        {showResultModal && selectedAttempt && selectedQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowResultModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="clay-card p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center" style={{
                  background: selectedAttempt.score >= 70
                    ? 'linear-gradient(135deg, #43e97b, #38f9d7)'
                    : selectedAttempt.score >= 50
                      ? 'linear-gradient(135deg, #fa709a, #fee140)'
                      : 'linear-gradient(135deg, #f093fb, #f5576c)'
                }}>
                  <Award className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  Quiz Completed!
                </h2>
                <p className="text-gray-600">{selectedQuiz.title}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="clay-card p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">Total Questions</p>
                  <p className="text-2xl font-bold text-gray-800">{selectedAttempt.total_questions}</p>
                </div>
                <div className="clay-card p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">Correct</p>
                  <p className="text-2xl font-bold text-green-600">{selectedAttempt.correct_answers}</p>
                </div>
                <div className="clay-card p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">Wrong</p>
                  <p className="text-2xl font-bold text-red-600">{selectedAttempt.wrong_answers}</p>
                </div>
                <div className="clay-card p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">Score</p>
                  <p className="text-2xl font-bold text-purple-600">{selectedAttempt.score}%</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Review Answers</h3>
                <div className="space-y-4">
                  {selectedQuiz.questions.map((q, index) => {
                    const isCorrect = selectedAttempt.answers[index] === q.correct_answer;
                    return (
                      <div key={index} className={`clay-card p-4 ${isCorrect ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                        <div className="flex items-start gap-3">
                          {isCorrect ? (
                            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 mb-2">
                              {index + 1}. {q.question}
                            </p>
                            <div className="space-y-2">
                              <p className="text-sm">
                                <span className="font-medium">Your Answer: </span>
                                <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                                  {selectedAttempt.answers[index] >= 0
                                    ? q.options[selectedAttempt.answers[index]]
                                    : 'Not answered'}
                                </span>
                              </p>
                              {!isCorrect && (
                                <p className="text-sm">
                                  <span className="font-medium">Correct Answer: </span>
                                  <span className="text-green-700">
                                    {q.options[q.correct_answer]}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setShowResultModal(false)}
                className="clay-button w-full px-6 py-3 font-medium"
                style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white'
                }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scores Modal */}
      <AnimatePresence>
        {showScoresModal && selectedQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowScoresModal(false)}
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
                  <p className="text-gray-600">{selectedQuiz.title}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Total Submissions: {quizScores.length}
                  </p>
                </div>
                <button onClick={() => setShowScoresModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {quizScores.length === 0 ? (
                <div className="text-center py-12">
                  <FileQuestion className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No students have attempted this quiz yet.</p>
                  {!selectedQuiz.published && (
                    <p className="text-sm text-amber-600 mt-2">
                      ⚠️ This quiz is not published. Students cannot see it yet.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {quizScores.map((attempt, index) => (
                    <motion.div
                      key={attempt.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="clay-card p-4 bg-gradient-to-r from-blue-50 to-purple-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{
                            background: 'linear-gradient(135deg, #667eea, #764ba2)'
                          }}>
                            {attempt.student_name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{attempt.student_name}</p>
                            <p className="text-xs text-gray-500">{attempt.student_email}</p>
                            <p className="text-sm text-gray-600">
                              {format(new Date(attempt.completed_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Score</p>
                            <p className="text-2xl font-bold text-purple-600">{attempt.score}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Correct/Total</p>
                            <p className="text-xl font-bold text-green-600">{attempt.correct_answers}/{attempt.total_questions}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Wrong</p>
                            <p className="text-xl font-bold text-red-600">{attempt.wrong_answers}</p>
                          </div>
                        </div>
                      </div>
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