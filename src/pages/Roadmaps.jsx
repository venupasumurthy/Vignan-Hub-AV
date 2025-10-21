
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Map, Plus, X, CheckCircle, Tag, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Roadmaps() {
  const [user, setUser] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [newRoadmap, setNewRoadmap] = useState({
    title: "",
    description: "",
    tags: [],
    steps: []
  });
  
  const [currentTag, setCurrentTag] = useState("");
  const [currentStep, setCurrentStep] = useState({
    title: "",
    description: "",
    course_id: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const allRoadmaps = await base44.entities.Roadmap.list('-created_date');
      setRoadmaps(allRoadmaps);
      
      const allCourses = await base44.entities.Course.list();
      setCourses(allCourses);
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading roadmaps:", error);
      setLoading(false);
    }
  };

  const createRoadmap = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.Roadmap.create({
        ...newRoadmap,
        created_by_id: user.id,
        created_by_name: user.full_name,
        followers: []
      });
      
      setNewRoadmap({ title: "", description: "", tags: [], steps: [] });
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error("Error creating roadmap:", error);
    }
  };

  const followRoadmap = async (roadmapId) => {
    try {
      const chosenRoadmaps = user.chosen_roadmaps || [];
      if (!chosenRoadmaps.includes(roadmapId)) {
        await base44.auth.updateMe({
          chosen_roadmaps: [...chosenRoadmaps, roadmapId]
        });
        
        const roadmap = roadmaps.find(r => r.id === roadmapId);
        await base44.entities.Roadmap.update(roadmapId, {
          followers: [...(roadmap.followers || []), user.id]
        });
        
        await base44.entities.Notification.create({
          user_id: user.id,
          message: `You're now following the "${roadmap.title}" roadmap!`,
          type: "general",
          read: false
        });
        
        loadData();
      }
    } catch (error) {
      console.error("Error following roadmap:", error);
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !newRoadmap.tags.includes(currentTag.trim())) {
      setNewRoadmap({
        ...newRoadmap,
        tags: [...newRoadmap.tags, currentTag.trim()]
      });
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setNewRoadmap({
      ...newRoadmap,
      tags: newRoadmap.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const addStep = () => {
    if (currentStep.title.trim()) {
      setNewRoadmap({
        ...newRoadmap,
        steps: [...newRoadmap.steps, {
          ...currentStep,
          order: newRoadmap.steps.length + 1
        }]
      });
      setCurrentStep({ title: "", description: "", course_id: "" });
    }
  };

  const removeStep = (index) => {
    setNewRoadmap({
      ...newRoadmap,
      steps: newRoadmap.steps.filter((_, i) => i !== index).map((step, i) => ({
        ...step,
        order: i + 1
      }))
    });
  };

  const isFollowing = (roadmapId) => {
    return user?.chosen_roadmaps?.includes(roadmapId);
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Learning Roadmaps
            </h1>
            <p className="text-gray-600">
              {user?.role === 'admin'
                ? "Create structured learning paths for students"
                : "Follow curated learning paths to achieve your goals"}
            </p>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="clay-button px-6 py-3 flex items-center gap-2 text-indigo-600 font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Roadmap
            </button>
          )}
        </div>
      </div>

      {/* Roadmaps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roadmaps.map((roadmap, index) => (
          <motion.div
            key={roadmap.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="clay-card p-6"
          >
            {/* Roadmap Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)'
              }}>
                <Map className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-800 mb-1">{roadmap.title}</h3>
                <p className="text-sm text-gray-600">{roadmap.description}</p>
                <p className="text-xs text-gray-500 mt-2">By {roadmap.created_by_name}</p>
              </div>
            </div>

            {/* Tags */}
            {roadmap.tags && roadmap.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {roadmap.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Steps */}
            {roadmap.steps && roadmap.steps.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Learning Path:</p>
                {roadmap.steps.slice(0, 3).map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {step.order}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{step.title}</p>
                      {step.description && (
                        <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                      )}
                    </div>
                  </div>
                ))}
                {roadmap.steps.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">+{roadmap.steps.length - 3} more steps</p>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-500">
                {roadmap.followers?.length || 0} followers
              </span>
              {user?.role === 'user' && (
                <button
                  onClick={() => followRoadmap(roadmap.id)}
                  disabled={isFollowing(roadmap.id)}
                  className={`clay-button px-4 py-2 font-medium ${
                    isFollowing(roadmap.id) ? 'text-green-600' : 'text-indigo-600'
                  }`}
                >
                  {isFollowing(roadmap.id) ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Following
                    </span>
                  ) : (
                    'Follow Roadmap'
                  )}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Roadmap Modal */}
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
              className="clay-card p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Create Learning Roadmap</h2>
                <button onClick={() => setShowCreateModal(false)} className="clay-button p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={createRoadmap} className="space-y-6">
                {/* Basic Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Roadmap Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoadmap.title}
                    onChange={(e) => setNewRoadmap({...newRoadmap, title: e.target.value})}
                    className="clay-input w-full"
                    placeholder="e.g., Full Stack Web Development"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    required
                    value={newRoadmap.description}
                    onChange={(e) => setNewRoadmap({...newRoadmap, description: e.target.value})}
                    className="clay-input w-full h-24 resize-none"
                    placeholder="Describe the learning path..."
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="clay-input flex-1"
                      placeholder="Add a tag..."
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="clay-button px-4 py-2 text-indigo-600"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newRoadmap.tags.map((tag, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm flex items-center gap-2">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Steps */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Learning Steps
                  </label>
                  
                  <div className="space-y-3 mb-4">
                    {newRoadmap.steps.map((step, i) => (
                      <div key={i} className="p-3 rounded-xl bg-indigo-50 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {step.order}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{step.title}</p>
                          {step.description && <p className="text-sm text-gray-600">{step.description}</p>}
                        </div>
                        <button type="button" onClick={() => removeStep(i)} className="clay-button p-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={currentStep.title}
                      onChange={(e) => setCurrentStep({...currentStep, title: e.target.value})}
                      className="clay-input w-full"
                      placeholder="Step title"
                    />
                    <textarea
                      value={currentStep.description}
                      onChange={(e) => setCurrentStep({...currentStep, description: e.target.value})}
                      className="clay-input w-full h-20 resize-none"
                      placeholder="Step description (optional)"
                    />
                    <select
                      value={currentStep.course_id}
                      onChange={(e) => setCurrentStep({...currentStep, course_id: e.target.value})}
                      className="clay-input w-full"
                    >
                      <option value="">Link to course (optional)</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addStep}
                      className="clay-button w-full px-4 py-2 text-indigo-600"
                    >
                      Add Step
                    </button>
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
                  Create Roadmap
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
