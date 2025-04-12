import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { account } from "../config/appwrite";
import { databases } from "../config/database";
import { Query } from "appwrite";
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
  RiBrainLine,
  RiSearch2Line
} from 'react-icons/ri';
import NudgeCard from "../components/NudgeCard";

const LearningPath = () => {
  const [careerPaths, setCareerPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Database constants
  const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const CAREER_PATHS_COLLECTION_ID = import.meta.env.VITE_CAREER_PATHS_COLLECTION_ID;

  useEffect(() => {
    fetchCareerPaths();
  }, []);

  const fetchCareerPaths = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      
      // Fetch career paths from the new collection using Query class
      const response = await databases.listDocuments(
        DATABASE_ID,
        CAREER_PATHS_COLLECTION_ID,
        [Query.equal("userID", user.$id)]
      );

      // Parse JSON fields for each career path
      const parsedPaths = response.documents.map(path => ({
        ...path,
        modules: JSON.parse(path.modules || "[]"),
        completedModules: JSON.parse(path.completedModules || "[]"),
        aiNudges: path.aiNudges ? JSON.parse(path.aiNudges) : []
      }));
      
      setCareerPaths(parsedPaths);
      setError("");
    } catch (error) {
      console.error("Error fetching career paths:", error);
      setError("Failed to load career paths. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const getCareerIcon = (careerName) => {
    const career = careerName.toLowerCase();
    if (career.includes('javascript') || career.includes('frontend')) return <RiCodeBoxLine className="w-6 h-6 text-yellow-400" />;
    if (career.includes('react')) return <RiReactjsLine className="w-6 h-6 text-cyan-400" />;
    if (career.includes('python') || career.includes('backend')) return <RiCodeSSlashLine className="w-6 h-6 text-blue-400" />;
    if (career.includes('fullstack')) return <RiStackLine className="w-6 h-6 text-indigo-500" />;
    if (career.includes('database')) return <RiDatabase2Line className="w-6 h-6 text-green-500" />;
    if (career.includes('devops')) return <RiGitBranchLine className="w-6 h-6 text-orange-600" />;
    if (career.includes('ai') || career.includes('machine learning')) return <RiRobot2Line className="w-6 h-6 text-purple-500" />;
    if (career.includes('data science')) return <RiBrainLine className="w-6 h-6 text-blue-500" />;
    return <RiCodeSSlashLine className="w-6 h-6 text-blue-500" />; // default icon
  };

  // Filter career paths based on search term
  const filteredCareerPaths = careerPaths.filter(path => 
    path.careerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                AI-Powered Career Development
              </div>
              <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Your Career Paths
              </h1>
              <p className="text-gray-600">
                Track your progress on your chosen career journey
              </p>
            </div>
            <div className="relative w-full md:w-auto">
              <input 
                type="text" 
                placeholder="Search your career paths"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 px-4 py-2 pl-10 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <RiSearch2Line className="absolute left-3 top-3 text-blue-400" />
            </div>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full"
            />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <motion.div 
            variants={item}
            className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-center"
          >
            <p>{error}</p>
            <button 
              onClick={fetchCareerPaths}
              className="mt-2 px-4 py-2 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !error && careerPaths.length === 0 && (
          <motion.div 
            variants={item}
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 text-center border border-blue-100 shadow-lg"
          >
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <RiStackLine className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800">No career paths found</h3>
              <p className="text-gray-600">
                You don't have any career paths yet. Contact your administrator to set up a new career path.
              </p>
            </div>
          </motion.div>
        )}

        {/* Career Paths Grid */}
        {!loading && !error && filteredCareerPaths.length > 0 && (
          <motion.div
            variants={item}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredCareerPaths.map((path, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="group relative bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-blue-100/30 shadow-lg hover:shadow-xl cursor-pointer overflow-hidden"
                onClick={() => navigate(`/learning-path/${path.$id}`)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
              
                <div className="relative space-y-4">
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center transform transition-transform group-hover:scale-110">
                      {getCareerIcon(path.careerName)}
                    </div>
                    <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {path.careerName}
                    </h2>
                  </div>

                  <p className="text-gray-600 text-sm">
                    {path.modules?.length || 0} modules • {path.completedModules?.length || 0} completed
                  </p>

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
        )}

        {/* AI Nudges Section - Show for the most active career path */}
        {!loading && careerPaths.length > 0 && (
          <motion.div variants={item} className="mt-12">
            <h2 className="text-xl font-semibold mb-4">AI Learning Nudges</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {careerPaths[0].aiNudges && careerPaths[0].aiNudges.slice(0, 2).map((nudge, index) => (
                <NudgeCard 
                  key={index}
                  title={nudge.title || "Learning Recommendation"}
                  content={nudge.content}
                  type={nudge.type || "tip"}
                />
              ))}
            </div>
          </motion.div>
        )}
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
