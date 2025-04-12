import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { databases } from "../config/database";
import { useAuth } from "../context/AuthContext";
import { RiFireFill, RiBrainLine } from "react-icons/ri";
import { format, differenceInDays, parseISO } from "date-fns";
import { Query } from "appwrite";

const Navbar = ({ isDashboard, isSidebarOpen, setIsSidebarOpen }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { user, loading, logout, isAuthenticated } = useAuth();

  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    if (user) fetchUserProgress();
  }, [user]);

  const fetchUserProgress = async () => {
    try {
      // Get quiz data from career-paths collection instead of user_progress
      const response = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        import.meta.env.VITE_CAREER_PATHS_COLLECTION_ID,
        [Query.equal("userID", user.$id)]
      );
      
      // Process all career paths to find quiz scores
      const paths = response.documents || [];
      let quizScores = [];
      
      // Check if any assessments data exists in the career paths
      paths.forEach(path => {
        // If the path has quizScores, add them to our collection
        if (path.quizScores) {
          const pathQuizzes = JSON.parse(path.quizScores);
          if (Array.isArray(pathQuizzes) && pathQuizzes.length > 0) {
            quizScores = [...quizScores, ...pathQuizzes];
          }
        }
        
        // If there are assessment dates from completed modules
        if (path.completedModules) {
          const completedModules = JSON.parse(path.completedModules || '[]');
          if (completedModules.length > 0) {
            // Use completion dates as quiz dates for streak calculation
            completedModules.forEach((module, index) => {
              // If module has completion date, use it to calculate streak
              if (path.updatedAt) {
                quizScores.push({
                  topic: `Module ${module + 1}`,
                  date: path.updatedAt,
                  score: 100,
                  accuracy: 100
                });
              }
            });
          }
        }
      });

      calculateCurrentStreak(quizScores);
    } catch (error) {
      console.error("Error fetching career paths:", error);
    }
  };

  const calculateCurrentStreak = (quizScores) => {
    if (!quizScores.length) return;

    const dates = quizScores.map((q) => format(parseISO(q.date), "yyyy-MM-dd"));
    const sortedDates = [...new Set(dates)].sort();

    let tempStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = differenceInDays(
        parseISO(sortedDates[i]),
        parseISO(sortedDates[i - 1])
      );
      if (diff === 1) tempStreak++;
      else tempStreak = 1;
    }

    const today = format(new Date(), "yyyy-MM-dd");
    const lastQuizDate = sortedDates[sortedDates.length - 1];
    const daysSinceLastQuiz = differenceInDays(
      parseISO(today),
      parseISO(lastQuizDate)
    );

    setCurrentStreak(daysSinceLastQuiz <= 1 ? tempStreak : 0);
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleSignup = () => {
    navigate("/signup");
  };

  const handleLogout = () => {
    navigate("/");
  };

  const getUserDisplay = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-200 rounded-full animate-pulse" />
          <div className="w-20 h-4 bg-purple-200 rounded animate-pulse" />
        </div>
      );
    }

    if (!user) return null;

    return (
      <>
        <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
          {user.$id ? user.$id[0].toUpperCase() : "👤"}
        </div>
        <span className="text-gray-700 font-medium">
          {user.name || user.email?.split("@")[0] || user.$id}
        </span>
      </>
    );
  };

  const UserDropdown = () => (
    <AnimatePresence>
      {isDropdownOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 border border-purple-100"
        >
          <div className="px-4 py-2 border-b border-purple-100">
            <p className="text-sm font-medium text-gray-900">
              {user?.name || user?.email?.split("@")[0]}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>

          {[
            { label: "Dashboard", path: "/dashboard", icon: "🏠" },
            { label: "Profile", path: "/settings", icon: "👤" },
            { label: "Progress", path: "/progress", icon: "📊" },
          ].map((item) => (
            <motion.button
              key={item.path}
              whileHover={{ x: 2 }}
              onClick={() => {
                navigate(item.path);
                setIsDropdownOpen(false);
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-2"
            >
              <span>{item.icon}</span>
              {item.label}
            </motion.button>
          ))}

          <motion.button
            whileHover={{ x: 2 }}
            onClick={() => {
              logout();
              setIsDropdownOpen(false);
            }}
            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-purple-100"
          >
            <span>🚪</span>
            Logout
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      className="bg-white/80 backdrop-blur-md border-b border-purple-100 px-4 md:px-8 py-4 flex justify-between items-center fixed top-0 w-full z-[999]"
    >
      <div className="flex items-center gap-4">
        {isDashboard && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-purple-50 rounded-lg"
          >
            <svg
              className="w-6 h-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isSidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </motion.button>
        )}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-lg flex items-center justify-center"
          >
            <RiBrainLine className="text-white text-xl" />
          </motion.div>
          <span className="text-xl font-serif md:text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
            pathgenie
          </span>
        </motion.div>
      </div>

      {isAuthenticated ? (
        <div className="flex items-center gap-3 md:gap-6">
          <motion.span className="flex gap-1">
            {" "}
            <RiFireFill className="text-2xl text-amber-500" />
            {currentStreak}
          </motion.span>
          <div className="hidden md:block md:relative">
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="hidden md:flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-xl cursor-pointer"
            >
              <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                {user?.name?.[0]?.toUpperCase() ||
                  user?.email?.[0]?.toUpperCase() ||
                  "👤"}
              </div>
              <span className="text-gray-700 font-medium flex items-center gap-2">
                {user?.name || user?.email?.split("@")[0] || "Loading..."}
                <motion.svg
                  animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                  className="w-4 h-4 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </motion.svg>
              </span>
            </motion.div>
            <UserDropdown />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="md:hidden p-2 bg-purple-100 text-purple-600 rounded-lg"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </motion.button>
        </div>
      ) : (
        <div className="space-x-4">
          <motion.button
            onClick={handleLogin}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/20 hover:bg-blue-700"
          >
            Login
          </motion.button>
          <motion.button
            onClick={handleSignup}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
          >
            Sign Up
          </motion.button>
        </div>
      )}

      {/* horizontal bar in mobile view */}

      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className=" md:hidden fixed top-[72px] left-0 right-0 bg-white border-b border-purple-100 shadow-lg"
          >
            <div className="p-4 space-y-3">
              {isAuthenticated ? (
                <>
                  <div className="px-4 py-2 border-b border-purple-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.name || user?.email?.split("@")[0]}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                  {[
                    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
                    { label: "Profile", path: "/settings", icon: "👤" },
                    { label: "Progress", path: "/progress", icon: "📊" },
                  ].map((item) => (
                    <motion.button
                      key={item.path}
                      whileHover={{ x: 2 }}
                      onClick={() => {
                        navigate(item.path);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-2"
                    >
                      <span>{item.icon}</span>
                      {item.label}
                    </motion.button>
                  ))}
                  <motion.button
                    whileHover={{ x: 2 }}
                    onClick={() => {
                      logout();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-purple-100"
                  >
                    <span>🚪</span>
                    Logout
                  </motion.button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleLogin}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg"
                  >
                    Login
                  </button>
                  <button
                    onClick={handleSignup}
                    className="w-full px-4 py-2 border border-purple-600 text-purple-600 rounded-lg"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
