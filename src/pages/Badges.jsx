import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Award, Plus, X, Star, Trophy, Medal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

const badgeTypes = [
  { name: 'Bronze', color: '#CD7F32', icon: Medal, gradient: 'linear-gradient(135deg, #CD7F32, #B87333)' },
  { name: 'Silver', color: '#C0C0C0', icon: Trophy, gradient: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)' },
  { name: 'Gold', color: '#FFD700', icon: Star, gradient: 'linear-gradient(135deg, #FFD700, #FFA500)' },
];

export default function Badges() {
  const [user, setUser] = useState(null);
  const [badges, setBadges] = useState([]);
  const [students, setStudents] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [newBadge, setNewBadge] = useState({
    title: "",
    description: "",
    icon: "Medal",
    color: "#CD7F32",
    criteria: ""
  });

  const [awardPoints, setAwardPoints] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const allBadges = await base44.entities.Badge.list('-created_date');
      setBadges(allBadges);
      
      if (currentUser.role === 'admin') {
        const allUsers = await base44.entities.User.list();
        const studentUsers = allUsers.filter(u => u.role === 'user');
        setStudents(studentUsers);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading badges:", error);
      setLoading(false);
    }
  };

  const createBadge = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.Badge.create({
        ...newBadge,
        awarded_to: []
      });
      
      setNewBadge({
        title: "",
        description: "",
        icon: "Medal",
        color: "#CD7F32",
        criteria: ""
      });
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error("Error creating badge:", error);
    }
  };

  const awardBadge = async (e) => {
    e.preventDefault();
    try {
      const badge = badges.find(b => b.id === selectedBadge);
      const student = students.find(s => s.id === selectedStudent);
      
      const awarded_to = badge.awarded_to || [];
      if (!awarded_to.some(a => a.student_id === selectedStudent)) {
        await base44.entities.Badge.update(selectedBadge, {
          awarded_to: [...awarded_to, {
            student_id: selectedStudent,
            student_name: student.full_name,
            awarded_at: new Date().toISOString()
          }]
        });
        
        const studentBadges = student.badges || [];
        await base44.entities.User.update(selectedStudent, {
          badges: [...studentBadges, selectedBadge],
          points: (student.points || 0) + awardPoints
        });
        
        await base44.entities.Notification.create({
          user_id: selectedStudent,
          message: `Congratulations! You've earned the "${badge.title}" badge and ${awardPoints} points!`,
          type: "badge",
          read: false
        });
        
        setShowAwardModal(false);
        setSelectedBadge(null);
        setSelectedStudent("");
        setAwardPoints(0);
        loadData();
      }
    } catch (error) {
      console.error("Error awarding badge:", error);
    }
  };

  const getUserBadges = () => {
    if (!user) return [];
    const userBadgeIds = user.badges || [];
    return badges.filter(b => userBadgeIds.includes(b.id));
  };

  const hasEarnedBadge = (badgeId) => {
    return user?.badges?.includes(badgeId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="clay-card p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 via-orange-500 to-red-600 bg-clip-text text-transparent mb-2">
              Badges & Achievements
            </h1>
            <p className="text-gray-600">
              {user?.role === 'admin'
                ? "Create and award badges to recognize student achievements"
                : `You've earned ${getUserBadges().length} badges and ${user?.points || 0} points!`}
            </p>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="clay-button px-6 py-3 flex items-center gap-2 text-yellow-600 font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Badge
            </button>
          )}
        </div>
      </div>

      {/* Student View - My Badges */}
      {user?.role === 'user' && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">My Badges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getUserBadges().length === 0 ? (
              <div className="col-span-full clay-card p-12 text-center">
                <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No badges earned yet. Keep working hard!</p>
              </div>
            ) : (
              getUserBadges().map((badge, index) => {
                const badgeType = badgeTypes.find(bt => badge.title.includes(bt.name));
                const Icon = badgeType?.icon || Award;
                
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="clay-card p-6 text-center"
                  >
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center" style={{
                      background: badgeType?.gradient || badge.color
                    }}>
                      <Icon className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 mb-2">{badge.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{badge.description}</p>
                    <p className="text-xs text-gray-500">
                      Earned: {format(new Date(badge.created_date), 'MMM d, yyyy')}
                    </p>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* All Badges */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {user?.role === 'admin' ? 'All Badges' : 'Available Badges'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((badge, index) => {
            const badgeType = badgeTypes.find(bt => badge.title.includes(bt.name));
            const Icon = badgeType?.icon || Award;
            const earned = hasEarnedBadge(badge.id);
            
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`clay-card p-6 ${!earned && user?.role === 'user' ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{
                    background: badgeType?.gradient || badge.color
                  }}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  {earned && user?.role === 'user' && (
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                      Earned ✓
                    </span>
                  )}
                </div>
                
                <h3 className="font-bold text-lg text-gray-800 mb-2">{badge.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{badge.description}</p>
                
                {badge.criteria && (
                  <div className="p-3 rounded-xl bg-gray-50 mb-4">
                    <p className="text-xs font-medium text-gray-700 mb-1">Criteria:</p>
                    <p className="text-xs text-gray-600">{badge.criteria}</p>
                  </div>
                )}
                
                {badge.awarded_to && badge.awarded_to.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Awarded to {badge.awarded_to.length} student{badge.awarded_to.length !== 1 ? 's' : ''}
                  </p>
                )}
                
                {user?.role === 'admin' && (
                  <button
                    onClick={() => {
                      setSelectedBadge(badge.id);
                      setShowAwardModal(true);
                    }}
                    className="clay-button w-full mt-4 px-4 py-2 text-yellow-600 font-medium"
                  >
                    Award to Student
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Create Badge Modal */}
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
              className="clay-card p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Create Badge</h2>
                <button onClick={() => setShowCreateModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={createBadge} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Badge Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {badgeTypes.map((type) => (
                      <button
                        key={type.name}
                        type="button"
                        onClick={() => setNewBadge({
                          ...newBadge,
                          title: `${type.name} Badge`,
                          icon: type.icon.name,
                          color: type.color
                        })}
                        className={`clay-button p-4 flex flex-col items-center gap-2 ${
                          newBadge.title.includes(type.name) ? 'ring-2 ring-yellow-500' : ''
                        }`}
                      >
                        <type.icon className="w-8 h-8" style={{ color: type.color }} />
                        <span className="text-xs font-medium">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Badge Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newBadge.title}
                    onChange={(e) => setNewBadge({...newBadge, title: e.target.value})}
                    className="clay-input w-full"
                    placeholder="e.g., Bronze Badge"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    required
                    value={newBadge.description}
                    onChange={(e) => setNewBadge({...newBadge, description: e.target.value})}
                    className="clay-input w-full h-20 resize-none"
                    placeholder="What does this badge represent?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Criteria
                  </label>
                  <input
                    type="text"
                    value={newBadge.criteria}
                    onChange={(e) => setNewBadge({...newBadge, criteria: e.target.value})}
                    className="clay-input w-full"
                    placeholder="e.g., Score above 80%"
                  />
                </div>

                <button
                  type="submit"
                  className="clay-button w-full px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-medium rounded-2xl"
                >
                  Create Badge
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Award Badge Modal */}
      <AnimatePresence>
        {showAwardModal && (
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
              className="clay-card p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Award Badge</h2>
                <button onClick={() => setShowAwardModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={awardBadge} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Student
                  </label>
                  <select
                    required
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="clay-input w-full"
                  >
                    <option value="">Choose a student...</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.full_name} ({student.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Points to Award
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={awardPoints}
                    onChange={(e) => setAwardPoints(parseInt(e.target.value))}
                    className="clay-input w-full"
                    placeholder="e.g., 100"
                  />
                </div>

                <button
                  type="submit"
                  className="clay-button w-full px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-medium rounded-2xl"
                >
                  Award Badge & Points
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}