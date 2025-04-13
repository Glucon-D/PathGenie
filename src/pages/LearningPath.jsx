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
  RiSearch2Line,
  RiAiGenerate,
  RiDeleteBin5Line,
  RiCloseLine
} from 'react-icons/ri';
import { generateAINudges } from "../config/gemini";
import NudgeCard from "../components/NudgeCard";
import { toast } from 'react-hot-toast';

const LearningPath = () => {
  const [careerPaths, setCareerPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  // New state for delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pathToDelete, setPathToDelete] = useState(null);
  const [deletingPath, setDeletingPath] = useState(false);
  // Add state for path nudges
  const [pathNudges, setPathNudges] = useState([]);
  
  const navigate = useNavigate();

  // Database constants
  const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const CAREER_PATHS_COLLECTION_ID = import.meta.env.VITE_CAREER_PATHS_COLLECTION_ID;
  const USERS_COLLECTION_ID = import.meta.env.VITE_USERS_COLLECTION_ID;

  // Function to normalize career names for comparison
  const normalizeCareerName = (name) => {
    return name.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ')    // Replace multiple spaces with one
      .trim();
  };

  // Enhanced function with less strict validation and better debugging
  const processCareerPaths = (paths, userCareerGoal, userInterests) => {
    console.log("Processing paths:", paths);
    console.log("User career goal:", userCareerGoal);
    
    // First create a map of normalized names to find potential duplicates
    const nameMap = new Map();
    const filteredOutPaths = []; // For debugging
    
    // Normalize the user's career goal for comparison
    const normalizedCareerGoal = userCareerGoal ? normalizeCareerName(userCareerGoal) : '';
    
    paths.forEach(path => {
      // Debug info
      console.log("Evaluating path:", path.careerName, "modules:", path.modules?.length || 0);
      
      if (!path.careerName) {
        filteredOutPaths.push({ path, reason: "Missing career name" });
        return; // Skip paths without name
      }
      
      const normalizedName = normalizeCareerName(path.careerName);
      
      // Skip paths that match the user's career goal
      if (normalizedCareerGoal && normalizedName === normalizedCareerGoal) {
        filteredOutPaths.push({ path: path.careerName, reason: "Matches career goal" });
        return;
      }

      // More permissive module validation
      // Check if this path has any modules at all
      const hasModules = Array.isArray(path.modules) && path.modules.length > 0;
      
      if (!hasModules) {
        filteredOutPaths.push({ path: path.careerName, reason: "No modules" });
        return; // Skip paths without modules
      }
      
      if (nameMap.has(normalizedName)) {
        // If this is a duplicate, keep the one that's more complete
        const existing = nameMap.get(normalizedName);
        // Choose the one with more modules or more progress as the primary
        if ((path.modules?.length || 0) > (existing.modules?.length || 0) || 
            path.progress > existing.progress) {
          nameMap.set(normalizedName, path);
        }
        filteredOutPaths.push({ path: path.careerName, reason: "Duplicate (kept better version)" });
      } else {
        nameMap.set(normalizedName, path);
      }
    });
    
    // Log debugging info
    console.log("Filtered out paths:", filteredOutPaths);
    console.log("Kept paths:", Array.from(nameMap.values()).map(p => p.careerName));
    
    // Return only unique interest-based paths
    return Array.from(nameMap.values());
  };

  useEffect(() => {
    fetchUserProfileAndPaths();
  }, []);

  const fetchUserProfileAndPaths = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      console.log("Current user:", user.$id);
      
      // First fetch user profile to get career goal and interests
      const profileResponse = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.equal("userID", user.$id)]
      );
      
      let userCareerGoal = '';
      let userInterests = [];
      
      if (profileResponse.documents.length > 0) {
        const profile = profileResponse.documents[0];
        setUserProfile(profile);
        userCareerGoal = profile.careerGoal || '';
        userInterests = profile.interests ? JSON.parse(profile.interests) : [];
        console.log("User profile loaded:", { userCareerGoal, interests: userInterests });
      } else {
        console.log("No user profile found");
      }
      
      // Then fetch career paths
      const pathsResponse = await databases.listDocuments(
        DATABASE_ID,
        CAREER_PATHS_COLLECTION_ID,
        [Query.equal("userID", user.$id)]
      );

      console.log("Raw paths from database:", pathsResponse.documents);

      // Parse JSON fields for each career path with better error handling
      const parsedPaths = pathsResponse.documents.map(path => {
        try {
          return {
            ...path,
            modules: typeof path.modules === 'string' ? JSON.parse(path.modules || "[]") : (path.modules || []),
            completedModules: typeof path.completedModules === 'string' ? JSON.parse(path.completedModules || "[]") : (path.completedModules || []),
            aiNudges: typeof path.aiNudges === 'string' ? JSON.parse(path.aiNudges || "[]") : (path.aiNudges || [])
          };
        } catch (e) {
          console.error("Error parsing path JSON for", path.careerName, e);
          return {
            ...path, 
            modules: [], 
            completedModules: [],
            aiNudges: []
          };
        }
      });
      
      console.log("Parsed paths:", parsedPaths);
      
      // Process paths with less filtering
      const processedPaths = processCareerPaths(parsedPaths, userCareerGoal, userInterests);
      
      setCareerPaths(processedPaths);
      setError("");
      
      // Generate nudges based on the paths
      await generatePathNudges(processedPaths);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load AI-generated learning paths. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Define the generatePathNudges function before it's used
  const generatePathNudges = async (paths) => {
    if (paths.length > 0) {
      try {
        const userData = await account.get();
        const nudges = await generateAINudges(
          userData,
          [], // No assessment data needed for path-specific nudges
          paths[0]
        );
        setPathNudges(nudges);
      } catch (error) {
        console.error("Error generating path nudges:", error);
      }
    }
  };

  // New function to handle path deletion
  const handleDeletePath = async () => {
    if (!pathToDelete) return;
    
    setDeletingPath(true);
    try {
      // Delete the path from Appwrite
      await databases.deleteDocument(
        DATABASE_ID,
        CAREER_PATHS_COLLECTION_ID,
        pathToDelete.$id
      );
      
      // Update local state to remove the deleted path
      setCareerPaths(careerPaths.filter(path => path.$id !== pathToDelete.$id));
      
      // Show success message
      toast.success(`Successfully deleted "${pathToDelete.careerName}" learning path`);
      
      // Close the modal
      setDeleteModalOpen(false);
      setPathToDelete(null);
    } catch (error) {
      console.error("Error deleting path:", error);
      toast.error("Failed to delete learning path. Please try again.");
    } finally {
      setDeletingPath(false);
    }
  };

  // Function to open delete confirmation modal
  const confirmDelete = (path, e) => {
    e.stopPropagation(); // Prevent navigating to path details
    setPathToDelete(path);
    setDeleteModalOpen(true);
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

  // Check if there are any career paths for the current user on initial load
  useEffect(() => {
    if (careerPaths.length === 0 && !loading && !error) {
      console.log("No paths were loaded. Showing empty state.");
    }
  }, [careerPaths, loading, error]);

  return (
    <div className="min-h-screen rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 p-6 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-40 -right-4 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-sky-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Delete Learning Path</h3>
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 rounded-full p-1 hover:bg-gray-100"
                >
                  <RiCloseLine size={24} />
                </button>
              </div>
              
              <div className="py-4">
                <p className="text-gray-600">
                  Are you sure you want to delete "<span className="font-medium text-gray-800">{pathToDelete?.careerName}</span>"? 
                  This action cannot be undone.
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg"
                  disabled={deletingPath}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePath}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
                  disabled={deletingPath}
                >
                  {deletingPath ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <RiDeleteBin5Line />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="max-w-6xl mx-auto space-y-8 relative z-10"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Enhanced Header Section with AI mention */}
        <motion.div
          variants={item}
          className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-blue-100/30 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-50" />
          <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100/50 rounded-full text-blue-700 text-sm font-medium">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                AI-Generated Learning Paths
              </div>
              <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Your Personalized Learning
              </h1>
              <p className="text-gray-600">
                Explore AI-crafted learning content based on your interests and preferences
              </p>
            </div>
            <div className="relative w-full md:w-auto">
              <input 
                type="text" 
                placeholder="Search your learning paths"
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
              onClick={fetchUserProfileAndPaths}
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
                <RiBrainLine className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800">No learning paths found</h3>
              <p className="text-gray-600">
                We couldn't find any AI-generated learning content yet. Update your profile to add more interests.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => navigate("/profile?update=true")}
                  className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Profile
                </button>
                <button 
                  onClick={fetchUserProfileAndPaths}
                  className="w-full px-6 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Refresh Data
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* AI-Generated Learning Paths Grid */}
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
                className="group relative bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-blue-100/30 shadow-lg hover:shadow-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                
                {/* Header section with badge and delete button */}
                <div className="flex justify-between items-center mb-4">
                  {/* AI-generated badge */}
                  <div className="px-2 py-1 bg-blue-600/10 rounded-full text-xs text-blue-600 font-medium flex items-center gap-1">
                    <RiBrainLine className="w-3 h-3" />
                    AI Generated
                  </div>
                  
                  {/* Delete button - visible on hover */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(path, e);
                    }}
                    className="p-1.5 bg-red-50 rounded-full text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all transform group-hover:scale-110"
                    aria-label="Delete learning path"
                  >
                    <RiDeleteBin5Line className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Path content section */}
                <div 
                  className="relative space-y-4"
                  onClick={() => navigate(`/learning-path/${path.$id}`)}
                >
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

        {/* Explanation of AI-generated content */}
        {!loading && !error && filteredCareerPaths.length > 0 && (
          <motion.div variants={item} className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <h3 className="text-blue-800 font-semibold mb-2">About Your Learning Paths</h3>
            <p className="text-blue-600 text-sm">
              These learning paths were uniquely created by our AI based on your interests. Each path 
              includes customized modules and content to help you progress on your learning journey.
            </p>
          </motion.div>
        )}

        {/* AI Nudges Section */}
        {!loading && careerPaths.length > 0 && careerPaths[0].aiNudges && careerPaths[0].aiNudges.length > 0 && (
          <motion.div variants={item} className="mt-12">
            <h2 className="text-xl font-semibold mb-4">AI Learning Nudges</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {careerPaths[0].aiNudges.slice(0, 2).map((nudge, index) => (
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

        {/* Add the nudges section after paths grid */}
        {!loading && pathNudges.length > 0 && (
          <motion.div
            variants={item}
            className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {pathNudges.map((nudge, index) => (
              <NudgeCard
                key={index}
                text={nudge.text}
                type={nudge.type}
                icon={nudge.icon}
                elevated={true}
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Debug section in development mode */}
      {import.meta.env.DEV && careerPaths.length === 0 && !loading && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs overflow-auto max-h-64">
          <h4 className="font-bold mb-2">Debug Info:</h4>
          <p>User ID: {userProfile?.userID || 'Not loaded'}</p>
          <p>Career Goal: {userProfile?.careerGoal || 'None'}</p>
          <p>Interests: {userProfile?.interests ? JSON.parse(userProfile.interests).join(', ') : 'None'}</p>
          <p className="mt-2 font-semibold">Check console for more debugging information</p>
        </div>
      )}
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
