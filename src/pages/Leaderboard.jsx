import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trophy, Medal, Crown, TrendingUp, Award } from "lucide-react";
import { motion } from "framer-motion";

export default function Leaderboard() {
  const [user, setUser] = useState(null);
  const [topPerformers, setTopPerformers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) {
        base44.auth.redirectToLogin();
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const allSubmissions = await base44.entities.Submission.list();

      const studentStats = {};

      allSubmissions.forEach(submission => {
        const studentId = submission.student_id;
        const studentName = submission.student_name;

        if (!studentStats[studentId]) {
          studentStats[studentId] = {
            id: studentId,
            name: studentName,
            totalSubmissions: 0,
            gradedSubmissions: 0,
            totalGrade: 0
          };
        }

        studentStats[studentId].totalSubmissions++;

        if (submission.grade !== null && submission.grade !== undefined) {
          studentStats[studentId].gradedSubmissions++;
          studentStats[studentId].totalGrade += submission.grade;
        }
      });

      const performanceData = [];
      for (const stats of Object.values(studentStats)) {
        let studentPoints = 0;
        let studentBadges = 0;

        if (stats.id === currentUser.id) {
          studentPoints = currentUser.points || 0;
          studentBadges = currentUser.badges?.length || 0;
        }

        performanceData.push({
          id: stats.id,
          name: stats.name,
          points: studentPoints,
          badges: studentBadges,
          avgGrade: stats.gradedSubmissions > 0
            ? stats.totalGrade / stats.gradedSubmissions
            : 0,
          totalSubmissions: stats.totalSubmissions,
          gradedSubmissions: stats.gradedSubmissions
        });
      }

      const sorted = performanceData
        .filter(p => p.totalSubmissions > 0)
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return b.avgGrade - a.avgGrade;
        });

      setTopPerformers(sorted.slice(0, 10));
      setLoading(false);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      setLoading(false);
    }
  };

  const getMedalIcon = (rank) => {
    if (rank === 0) return <Crown className="w-8 h-8 text-yellow-500" />;
    if (rank === 1) return <Medal className="w-8 h-8 text-gray-400" />;
    if (rank === 2) return <Medal className="w-8 h-8 text-orange-600" />;
    return <span className="text-2xl font-bold text-gray-600">#{rank + 1}</span>;
  };

  const getRankColor = (rank) => {
    if (rank === 0) return 'from-yellow-400 to-orange-500';
    if (rank === 1) return 'from-gray-300 to-gray-400';
    if (rank === 2) return 'from-orange-400 to-orange-600';
    return 'from-purple-400 to-blue-400';
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
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-yellow-100">
            <Trophy className="w-8 h-8 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              🏆 Leaderboard - Top Performers
            </h1>
            <p className="text-slate-600">
              Celebrating our best learners and their achievements!
            </p>
          </div>
        </div>
      </div>

      {topPerformers.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="clay-card p-6 text-center mt-8"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-slate-500 bg-slate-200 font-bold text-2xl">
              {topPerformers[1].name[0].toUpperCase()}
            </div>
            <Medal className="w-10 h-10 mx-auto mb-2 text-slate-400" />
            <h3 className="font-bold text-lg text-slate-800 mb-1">{topPerformers[1].name}</h3>
            <p className="text-2xl font-bold text-blue-600 mb-2">{topPerformers[1].points} pts</p>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {topPerformers[1].avgGrade.toFixed(1)}%
              </span>
              <span className="flex items-center gap-1">
                <Award className="w-3 h-3" />
                {topPerformers[1].badges}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="clay-card p-6 text-center relative border-2 border-yellow-200"
          >
            <Crown className="w-8 h-8 absolute top-2 right-2 text-yellow-500" />
            <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center text-yellow-700 bg-yellow-100 font-bold text-3xl shadow-lg">
              {topPerformers[0].name[0].toUpperCase()}
            </div>
            <Medal className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
            <h3 className="font-bold text-xl text-slate-800 mb-1">{topPerformers[0].name}</h3>
            <p className="text-3xl font-bold text-blue-600 mb-2">{topPerformers[0].points} pts</p>
            <div className="flex items-center justify-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {topPerformers[0].avgGrade.toFixed(1)}%
              </span>
              <span className="flex items-center gap-1">
                <Award className="w-4 h-4" />
                {topPerformers[0].badges}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="clay-card p-6 text-center mt-12"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-orange-700 bg-orange-100 font-bold text-2xl">
              {topPerformers[2].name[0].toUpperCase()}
            </div>
            <Medal className="w-10 h-10 mx-auto mb-2 text-orange-600" />
            <h3 className="font-bold text-lg text-slate-800 mb-1">{topPerformers[2].name}</h3>
            <p className="text-2xl font-bold text-blue-600 mb-2">{topPerformers[2].points} pts</p>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {topPerformers[2].avgGrade.toFixed(1)}%
              </span>
              <span className="flex items-center gap-1">
                <Award className="w-3 h-3" />
                {topPerformers[2].badges}
              </span>
            </div>
          </motion.div>
        </div>
      )}

      <div className="clay-card p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">All Rankings</h2>
        <div className="space-y-3">
          {topPerformers.map((performer, index) => (
            <motion.div
              key={performer.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-xl ${performer.id === user?.id
                ? 'bg-blue-50 ring-2 ring-blue-400'
                : 'bg-white border border-slate-100'
                }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 text-center flex-shrink-0">
                  {getMedalIcon(index)}
                </div>

                <div className="w-12 h-12 rounded-full flex items-center justify-center text-blue-600 bg-blue-100 font-bold flex-shrink-0">
                  {performer.name[0].toUpperCase()}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-800">{performer.name}</h4>
                    {performer.id === user?.id && (
                      <span className="px-2 py-1 rounded-full bg-purple-600 text-white text-xs">You</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-purple-600 text-xl">{performer.points}</p>
                    <p className="text-xs text-gray-500">Points</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-green-600">{performer.avgGrade.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Avg Grade</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-yellow-600">{performer.badges}</p>
                    <p className="text-xs text-gray-500">Badges</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-blue-600">{performer.gradedSubmissions}/{performer.totalSubmissions}</p>
                    <p className="text-xs text-gray-500">Graded</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {topPerformers.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No data yet. Complete assignments to get on the leaderboard!</p>
          </div>
        )}
      </div>
    </div>
  );
}