import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { account } from "../config/appwrite";
import { generateLearningPath } from "../config/gemini";
import {
  createLearningPath,
  getLearningPaths,
  deleteLearningPath,
} from "../config/database";
import { useNavigate } from "react-router-dom";
import { 
  RiCodeBoxLine, 
  RiDatabase2Line, 
  RiTerminalBoxLine, 
  RiReactjsLine, 
  RiHtml5Line,
  RiCss3Line,
  RiCodeSSlashLine,
  RiGitBranchLine,
  RiCommandLine,
  RiRobot2Line,
  RiStackLine,
  RiBrainLine
} from 'react-icons/ri';

const LearningPath = () => {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [topicName, setTopicName] = useState("");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  const topicSuggestions = [
    { name: "JavaScript Fundamentals", icon: "⚡" },
    { name: "React Basics", icon: "⚛️" },
    { name: "Python for Beginners", icon: "🐍" },
    { name: "Web Development", icon: "🌐" },
    { name: "Data Structures", icon: "🏗️" },
  ];

  useEffect(() => {
    fetchPaths();
  }, []);

  const fetchPaths = async () => {
    try {
      const user = await account.get();
      const response = await getLearningPaths(user.$id);
      setPaths(response.documents);
    } catch (error) {
      console.error("Error fetching paths:", error);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const user = await account.get();
      const modules = await generateLearningPath(topicName);

      if (!Array.isArray(modules) || modules.length === 0) {
        throw new Error("Invalid response from AI");
      }

      await createLearningPath(user.$id, topicName, modules);
      setShowModal(false);
      fetchPaths();
      // Show success message
    } catch (error) {
      console.error("Error creating path:", error);
      setError(error.message || "Failed to create learning path");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, pathId) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    try {
      await deleteLearningPath(pathId);
      await fetchPaths(); // Refresh the list
    } catch (error) {
      setError("Failed to delete learning path");
    }
  };

  const getTopicIcon = (topicName) => {
    const topic = topicName.toLowerCase();
    if (topic.includes('javascript')) return <RiCodeBoxLine className="w-6 h-6 text-yellow-400" />;
    if (topic.includes('react')) return <RiReactjsLine className="w-6 h-6 text-cyan-400" />;
    if (topic.includes('python')) return <RiCodeSSlashLine className="w-6 h-6 text-blue-400" />;
    if (topic.includes('html')) return <RiHtml5Line className="w-6 h-6 text-orange-500" />;
    if (topic.includes('css')) return <RiCss3Line className="w-6 h-6 text-blue-500" />;
    if (topic.includes('database')) return <RiDatabase2Line className="w-6 h-6 text-green-500" />;
    if (topic.includes('git')) return <RiGitBranchLine className="w-6 h-6 text-orange-600" />;
    if (topic.includes('ai') || topic.includes('machine')) return <RiRobot2Line className="w-6 h-6 text-purple-500" />;
    if (topic.includes('algorithm') || topic.includes('data structure')) return <RiStackLine className="w-6 h-6 text-indigo-500" />;
    if (topic.includes('terminal') || topic.includes('command')) return <RiCommandLine className="w-6 h-6 text-gray-700" />;
    return <RiCodeSSlashLine className="w-6 h-6 text-blue-500" />; // default icon
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 p-6 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-40 -right-4 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-sky-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      <motion.div
        className="max-w-6xl mx-auto space-y-8 relative z-10"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Enhanced Header Section */}
        <motion.div
          variants={item}
          className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-blue-100/30 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-50" />
          <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100/50 rounded-full text-blue-700 text-sm font-medium">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                AI-Powered Learning
              </div>
              <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Learning Paths
              </h1>
              <p className="text-gray-600">
                Create and manage your personalized learning journeys
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:shadow-blue-500/20 transition-all flex items-center gap-2 group"
            >
              <span>Create New Path</span>
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="group-hover:translate-x-1 transition-transform"
              >
                →
              </motion.span>
            </motion.button>
          </div>
        </motion.div>

        {/* Enhanced Learning Paths Grid */}
        <motion.div
          variants={item}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {paths.map((path, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="group relative bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-blue-100/30 shadow-lg hover:shadow-xl cursor-pointer overflow-hidden"
              onClick={() => navigate(`/learning-path/${path.$id}`)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
              
              {/* Delete Button */}
              <motion.button
                className="absolute top-4 right-4 p-2 bg-red-100/80 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                onClick={(e) => handleDelete(e, path.$id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </motion.button>

              <div className="relative space-y-4">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center transform transition-transform group-hover:scale-110">
                    {getTopicIcon(path.topicName)}
                  </div>
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {path.topicName}
                  </h2>
                </div>

                <div className="space-y-3">
                  <div className="w-full bg-blue-100 rounded-full h-2">
                    <motion.div
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${path.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-blue-600 font-medium text-sm">
                      {path.progress}% Complete
                    </p>
                    <motion.span
                      className="text-blue-600"
                      animate={{ x: [0, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      →
                    </motion.span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Enhanced Create Path Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl w-full max-w-lg shadow-2xl border border-blue-100/30"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-6">
                  {/* Header */}
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Create Your Learning Journey
                    </h2>
                    <p className="text-gray-600">
                      Enter a topic or select from suggestions to start learning
                    </p>
                  </div>

                  {/* Topic Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Topic Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g., JavaScript Fundamentals"
                        value={topicName}
                        onChange={(e) => setTopicName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-blue-100 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 outline-none transition-all pl-10"
                      />
                      <span className="absolute left-3 top-3 text-gray-400">
                        🎯
                      </span>
                    </div>
                  </div>

                  {/* Topic Suggestions */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">
                      Popular Topics
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {topicSuggestions.map((topic, index) => (
                        <motion.button
                          key={index}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setTopicName(topic.name)}
                          className={`p-3 rounded-xl flex items-center gap-2 transition-all ${
                            topicName === topic.name
                              ? "bg-blue-100 text-blue-700"
                              : "hover:bg-blue-50 text-gray-600"
                          }`}
                        >
                          <span>{topic.icon}</span>
                          <span className="text-sm">{topic.name}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowModal(false)}
                      className="px-6 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors text-sm"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCreate}
                      disabled={!topicName.trim() || loading}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg disabled:opacity-50 text-sm font-medium"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          />
                          <span>Generating Path...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>Create Path</span>
                          <span>→</span>
                        </div>
                      )}
                    </motion.button>
                  </div>

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-red-500 text-sm text-center"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// Add these to your global CSS
const additionalStyles = `
@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}
`;

export default LearningPath;
