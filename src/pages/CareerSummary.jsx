import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  RiCheckboxCircleFill,
  RiDownloadLine,
  RiHome2Line,
  RiCodeLine,
  RiBookOpenLine,
  RiUserStarLine,
  RiRocketLine,
  RiArrowRightLine,
  RiTimer2Line,
  RiBrainLine,
  RiAlertLine
} from 'react-icons/ri';
import NudgeCard from '../components/NudgeCard';
import { account } from "../config/appwrite";
import { databases } from "../config/database";
import { Query } from "appwrite";
import { toast } from "react-hot-toast";

const CareerSummary = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [summaryData, setSummaryData] = useState({
    userName: '',
    careerGoal: '',
    readiness: 0,
    completedModules: 0,
    totalModules: 0,
    timeSpent: 0,
    completionDate: new Date().toLocaleDateString(),
    skills: [],
    suggestions: []
  });
  
  // Get environment variables for Appwrite database and collections
  const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const CAREER_COLLECTION_ID = import.meta.env.VITE_CAREER_PATHS_COLLECTION_ID;
  const USERS_COLLECTION_ID = import.meta.env.VITE_USERS_COLLECTION_ID;

  useEffect(() => {
    fetchCareerData();
  }, []);

  const fetchCareerData = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const currentUser = await account.get();
      
      // Get user data from users collection
      const usersResponse = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.equal("userID", currentUser.$id)]
      );

      let userData = null;
      if (usersResponse.documents.length > 0) {
        userData = usersResponse.documents[0];
      }
      
      // Get career path data with 100% completion
      const careerResponse = await databases.listDocuments(
        DATABASE_ID,
        CAREER_COLLECTION_ID,
        [
          Query.equal("userID", currentUser.$id),
          Query.equal("progress", 100)
        ]
      );
      
      if (careerResponse.documents.length > 0 && userData) {
        const careerPath = careerResponse.documents[0];
        
        // Parse JSON string fields
        const modules = careerPath.modules ? JSON.parse(careerPath.modules) : [];
        const aiNudges = careerPath.aiNudges ? JSON.parse(careerPath.aiNudges) : [];
        const completedModules = careerPath.completedModules ? JSON.parse(careerPath.completedModules) : [];
        const recommendedSkills = careerPath.recommendedSkills ? JSON.parse(careerPath.recommendedSkills) : [];
        
        // Parse user skills
        const userSkills = userData.skills ? JSON.parse(userData.skills) : [];
        
        // Create skills array with progress level
        const skillsWithProgress = recommendedSkills.map(skill => {
          // Check if user has this skill already
          const hasSkill = userSkills.includes(skill);
          return {
            name: skill,
            level: hasSkill ? 'Advanced' : 'Mastered',
            progress: hasSkill ? 95 : 90
          };
        });
        
        // Add any user skills not in recommended skills
        userSkills.forEach(skill => {
          if (!recommendedSkills.includes(skill)) {
            skillsWithProgress.push({
              name: skill,
              level: 'Intermediate',
              progress: 75
            });
          }
        });
        
        // Calculate time spent (assume 2 hours per module)
        const timeSpentHours = completedModules.length * 2;
        
        setSummaryData({
          userName: userData.name || currentUser.name || 'Learner',
          careerGoal: careerPath.careerName || 'Career Path',
          readiness: careerPath.progress || 100,
          completedModules: completedModules.length,
          totalModules: modules.length,
          timeSpent: timeSpentHours,
          completionDate: careerPath.updatedAt ? new Date(careerPath.updatedAt).toLocaleDateString() : new Date().toLocaleDateString(),
          skills: skillsWithProgress,
          suggestions: aiNudges.length > 0 ? aiNudges : [
            'Consider diving deeper into backend architecture to complement your frontend skills',
            'Practice system design concepts to prepare for senior developer roles',
            'Build a full-stack project to showcase your skills'
          ]
        });
      } else {
        setHasError(true);
        toast.error("No completed career path found");
      }
    } catch (error) {
      console.error("Error fetching career summary data:", error);
      setHasError(true);
      toast.error("Failed to load career summary");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const handleDownloadReport = () => {
    // In a real app, this would generate and download a PDF report
    toast.success('Report download initiated!');
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="mt-4 text-blue-800 font-medium">Generating your career summary...</p>
        </motion.div>
      </div>
    );
  }
  
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-md text-center">
          <RiAlertLine className="text-red-500 text-5xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Completed Career Path Found</h2>
          <p className="text-gray-600 mb-6">
            It looks like you haven't completed a career path yet. Keep learning and come back when you're done!
          </p>
          <button
            onClick={() => navigate("/learning-path")}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg"
          >
            Go to Learning Paths
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 py-12">
      <motion.div 
        className="max-w-4xl mx-auto space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div 
          className="bg-gradient-to-br from-sky-500 to-blue-700 rounded-2xl p-8 text-white shadow-xl"
          variants={itemVariants}
        >
          <h1 className="text-3xl font-bold">Career Journey Complete!</h1>
          <p className="mt-2 text-blue-100">
            Congratulations {summaryData.userName}! You've completed all requirements for your {summaryData.careerGoal} track.
          </p>
          
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/20 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-100">
                <RiCheckboxCircleFill /> Readiness
              </div>
              <p className="text-2xl font-bold">{summaryData.readiness}%</p>
            </div>
            
            <div className="bg-white/20 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-100">
                <RiBookOpenLine /> Modules
              </div>
              <p className="text-2xl font-bold">{summaryData.completedModules}/{summaryData.totalModules}</p>
            </div>
            
            <div className="bg-white/20 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-100">
                <RiTimer2Line /> Time Spent
              </div>
              <p className="text-2xl font-bold">{summaryData.timeSpent} hrs</p>
            </div>
            
            <div className="bg-white/20 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-100">
                <RiCodeLine /> Skills
              </div>
              <p className="text-2xl font-bold">{summaryData.skills.length}</p>
            </div>
          </div>
        </motion.div>
        
        {/* Skills Mastered */}
        <motion.div 
          className="bg-white rounded-2xl p-6 shadow-lg"
          variants={itemVariants}
        >
          <h2 className="text-2xl font-bold text-blue-800 flex items-center gap-2 mb-6">
            <RiBrainLine className="text-blue-600" /> Skills Mastered
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summaryData.skills.map((skill, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (index * 0.1) }}
                className="bg-blue-50 rounded-xl p-4"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-blue-800">{skill.name}</span>
                  <span className="text-sm bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                    {skill.level}
                  </span>
                </div>
                
                <div className="w-full h-2 bg-blue-100 rounded-full">
                  <div 
                    className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                    style={{ width: `${skill.progress}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* AI Recommendations */}
        <motion.div 
          className="bg-white rounded-2xl p-6 shadow-lg"
          variants={itemVariants}
        >
          <h2 className="text-2xl font-bold text-blue-800 flex items-center gap-2 mb-6">
            <RiRocketLine className="text-blue-600" /> Next Steps
          </h2>
          
          <div className="space-y-4">
            {summaryData.suggestions.map((suggestion, index) => (
              <NudgeCard 
                key={index}
                text={suggestion}
                type="recommendation"
                elevated={true}
                actionText={index === 0 ? "Explore this path" : undefined}
                onAction={index === 0 ? () => navigate("/learning-path") : undefined}
              />
            ))}
          </div>
        </motion.div>
        
        {/* Actions */}
        <motion.div 
          className="flex flex-col sm:flex-row justify-center gap-4 pt-4"
          variants={itemVariants}
        >
          <motion.button
            onClick={handleDownloadReport}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 bg-blue-100 text-blue-700 rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <RiDownloadLine /> Download Report
          </motion.button>
          
          <motion.button
            onClick={() => navigate("/")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg flex items-center justify-center gap-2"
          >
            Go to Home <RiArrowRightLine />
          </motion.button>
        </motion.div>
        
        {/* Certificate Badge */}
        <motion.div 
          className="flex justify-center pt-6"
          variants={itemVariants}
        >
          <div className="flex items-center gap-2 text-blue-600 text-sm">
            <RiUserStarLine className="text-xl" />
            <span>Certificate issued on {summaryData.completionDate}</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CareerSummary;