import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { account } from "../config/appwrite";
import { databases } from "../config/database";
import { Query } from "appwrite";
import { toast } from "react-hot-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paths, setPaths] = useState([]);
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [quizScores, setQuizScores] = useState([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get environment variables for Appwrite database and collections
  const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const CAREER_COLLECTION_ID = import.meta.env.VITE_CAREER_PATHS_COLLECTION_ID;
  const ASSESSMENTS_COLLECTION_ID = import.meta.env.VITE_ASSESSMENTS_COLLECTION_ID;

  useEffect(() => {
    fetchUserProgress();
    fetchPaths();
  }, []);

  const fetchUserProgress = async () => {
    try {
      setIsLoading(true);
      const user = await account.get(); // Get logged-in user
      
      // Fetch assessments for this user
      const assessmentsResponse = await databases.listDocuments(
        DATABASE_ID,
        ASSESSMENTS_COLLECTION_ID,
        [Query.equal("userID", user.$id)]
      );
      
      // Calculate flashcard count from assessments
      let totalFlashcardsMastered = 0;
      let quizScoresData = [];
      
      // Process assessments data
      assessmentsResponse.documents.forEach(assessment => {
        if (assessment.flashcardsMastered) {
          totalFlashcardsMastered += parseInt(assessment.flashcardsMastered);
        }
        
        if (assessment.quizScore) {
          // Add quiz data with date and score
          quizScoresData.push({
            moduleID: assessment.moduleID,
            score: assessment.quizScore,
            total: assessment.quizTotal || 10, // Default to 10 if not provided
            accuracy: ((assessment.quizScore / (assessment.quizTotal || 10)) * 100).toFixed(1),
            date: assessment.completedAt || new Date().toISOString(),
          });
        }
      });

      setFlashcardCount(totalFlashcardsMastered);
      setQuizScores(quizScoresData);
      
      // Calculate streak from quiz dates
      if (quizScoresData.length > 0) {
        const dates = quizScoresData.map(q => new Date(q.date).toDateString());
        const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));
        
        let streak = 0;
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
          streak = 1;
          for (let i = 1; i < uniqueDates.length; i++) {
            const dateDiff = Math.round(
              (new Date(uniqueDates[i-1]) - new Date(uniqueDates[i])) / 86400000
            );
            if (dateDiff === 1) streak++;
            else break;
          }
        }
        
        setCurrentStreak(streak);
      }
    } catch (error) {
      console.error("Error fetching user progress:", error);
      toast.error("Failed to load user progress");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaths = async () => {
    try {
      setIsLoading(true);
      const user = await account.get();
      
      // Query career paths collection for this user
      const response = await databases.listDocuments(
        DATABASE_ID,
        CAREER_COLLECTION_ID,
        [Query.equal("userID", user.$id)]
      );

      if (response.documents.length > 0) {
        // Process the paths data
        const processedPaths = response.documents.map(path => {
          return {
            ...path,
            modules: path.modules ? JSON.parse(path.modules) : [],
            aiNudges: path.aiNudges ? JSON.parse(path.aiNudges) : [],
            completedModules: path.completedModules ? JSON.parse(path.completedModules) : []
          };
        });
        
        // Filtering paths where progress is less than 100
        const incompletePaths = processedPaths.filter(
          (path) => path.progress < 100
        );

        setPaths(incompletePaths);
      } else {
        // If no paths found
        setPaths([]);
      }
    } catch (error) {
      console.error("Error fetching paths:", error);
      toast.error("Failed to load learning paths");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update career path progress
  const updatePathProgress = async (pathId, progress, completedModules) => {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        CAREER_COLLECTION_ID,
        pathId,
        {
          progress: progress,
          completedModules: JSON.stringify(completedModules),
          updatedAt: new Date().toISOString()
        }
      );
      toast.success("Progress updated!");
    } catch (error) {
      console.error("Error updating path progress:", error);
      toast.error("Failed to update progress");
    }
  };

  const calculateSuccessRate = () => {
    if (!quizScores.length) return 0; // Avoid division by zero

    const totalAccuracy = quizScores.reduce(
      (sum, score) => sum + parseFloat(score.accuracy),
      0
    );

    return (totalAccuracy / quizScores.length).toFixed(2); // Average accuracy
  };

  const cards = [
    {
      title: "Continue Learning",
      description: "Pick up where you left off",
      icon: "📚",
      gradient: "from-blue-500 to-indigo-500",
      path: "/learning-path",
      stats: `${paths.length} paths in progress`,
    },
    {
      title: "Flashcards",
      description: "Review and memorize concepts",
      icon: "🗂️",
      gradient: "from-purple-500 to-pink-500",
      path: "/flashcards",
      stats: `${flashcardCount} cards mastered`,
    },
    {
      title: "Quiz Performance",
      description: "Test your knowledge",
      icon: "📊",
      gradient: "from-indigo-500 to-blue-500",
      path: "/quiz",
      stats: `${calculateSuccessRate()}% success rate`,
    },
  ];

  const quickActions = [
    { 
      icon: "🎯", 
      label: "New Path",
      description: "Start a learning journey",
      path: "/learning-path",
      gradient: "from-blue-600 to-indigo-600"
    },
    { 
      icon: "🗂️", 
      label: "Flashcards",
      description: "Create study cards",
      path: "/flashcards",
      gradient: "from-indigo-600 to-purple-600"
    },
    { 
      icon: "📝", 
      label: "Quiz",
      description: "Test your knowledge",
      path: "/quiz",
      gradient: "from-purple-600 to-pink-600"
    },
    { 
      icon: "📈", 
      label: "Progress",
      description: "Track your growth",
      path: "/progress",
      gradient: "from-pink-600 to-rose-600"
    },
  ];

  return (
    <div className="flex-1 max-w-full p-4 md:p-8 overflow-x-hidden bg-gradient-to-br from-gray-50 to-blue-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* Enhanced Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-white/30 backdrop-blur-md rounded-3xl p-8 shadow-lg border border-white/50"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10" />
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Welcome back, {user?.name?.split(" ")[0] || "Learner"}! 👋
                </h1>
                <p className="text-gray-600">
                  Ready to continue your learning journey?
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="px-4 py-2 bg-blue-100 text-blue-600 rounded-xl">
                  Today's Streak: 🔥 {currentStreak} days
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Enhanced Quick Actions */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <motion.button
                  key={index}
                  onClick={() => navigate(action.path)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative overflow-hidden bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-lg transition-all duration-300"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className="relative space-y-3">
                    <span className="text-3xl">{action.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{action.label}</h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Enhanced Main Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map((card, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ 
                    scale: 1.02,
                    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
                  }}
                  onClick={() => navigate(card.path)}
                  className="group relative overflow-hidden bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className="relative space-y-4">
                    <div className="text-4xl group-hover:scale-110 transition-transform">
                      {card.icon}
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {card.title}
                      </h2>
                      <p className="text-gray-600">{card.description}</p>
                    </div>
                    <div className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600">
                      {card.stats}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Display paths section */}
            {paths.length > 0 && (
              <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-lg">
                <h2 className="text-xl font-semibold mb-4">Your Learning Paths</h2>
                <div className="space-y-4">
                  {paths.map((path, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 * index }}
                      className="bg-blue-50/60 p-4 rounded-xl"
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">{path.careerName}</h3>
                        <span className="text-sm">{path.progress}% Complete</span>
                      </div>
                      <div className="mt-2 h-2 bg-blue-100 rounded-full">
                        <div
                          className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                          style={{ width: `${path.progress}%` }}
                        ></div>
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/learning-path/${path.$id}`);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Continue Learning
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
