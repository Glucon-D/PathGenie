import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { RiArrowRightLine, RiLightbulbLine, RiUserLine, RiCalendarLine, RiFlag2Line, RiHeartLine, RiToolsLine } from "react-icons/ri";
// Import Appwrite SDK
import { account } from "../config/appwrite";
import { databases } from "../config/database";
import { ID, Query } from "appwrite";
import { toast } from "react-hot-toast";
import { generateLearningPath } from "../config/gemini";
import { useAuth } from "../context/AuthContext";

const ProfileForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    careerGoal: "",
    interests: [],
    skills: [],
  });
  const [currentInterest, setCurrentInterest] = useState("");
  const [currentSkill, setCurrentSkill] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get environment variables for Appwrite database and collections
  const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const USERS_COLLECTION_ID = import.meta.env.VITE_USERS_COLLECTION_ID;
  const CAREER_PATHS_COLLECTION_ID = import.meta.env.VITE_CAREER_PATHS_COLLECTION_ID;

  // Check if user profile already exists
  useEffect(() => {
    if (user) {
      checkUserProfile();
    }
  }, [user]);

  const checkUserProfile = async () => {
    setIsLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.equal("userID", user.$id)]
      );
      
      if (response.documents.length > 0) {
        const userProfile = response.documents[0];
        setFormData({
          name: userProfile.name || "",
          age: userProfile.age?.toString() || "",
          careerGoal: userProfile.careerGoal || "",
          interests: userProfile.interests ? JSON.parse(userProfile.interests) : [],
          skills: userProfile.skills ? JSON.parse(userProfile.skills) : [],
        });
        setProfileExists(true);
        
        // Check if user already has career paths - only for informational purposes
        const pathsResponse = await databases.listDocuments(
          DATABASE_ID,
          CAREER_PATHS_COLLECTION_ID,
          [Query.equal("userID", user.$id)]
        );
        
        // We no longer redirect regardless of paths existing or not
        // This way users can always view and update their profile
      }
    } catch (error) {
      console.error("Error checking user profile:", error);
      toast.error("Error loading your profile data");
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
        duration: 0.5 
      }
    },
    exit: { 
      opacity: 0,
      y: 20,
      transition: { duration: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Interest suggestions (dummy data)
  const interestSuggestions = [
    "Web Development", "Data Science", "Mobile Apps", 
    "Machine Learning", "Cybersecurity", "Cloud Computing",
    "UI/UX Design", "Game Development", "DevOps", "Blockchain"
  ];

  // Skill suggestions (dummy data)
  const skillSuggestions = [
    "JavaScript", "Python", "React", "Node.js", "SQL", 
    "Java", "AWS", "Docker", "HTML/CSS", "TypeScript"
  ];

  const handleAddInterest = (interest) => {
    if (interest && !formData.interests.includes(interest)) {
      setFormData({
        ...formData,
        interests: [...formData.interests, interest],
      });
      setCurrentInterest("");
    }
  };

  const handleAddSkill = (skill) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skill],
      });
      setCurrentSkill("");
    }
  };

  const handleRemoveInterest = (interest) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter((i) => i !== interest),
    });
  };

  const handleRemoveSkill = (skill) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
    });
  };

  const generateCareerPaths = async (userID) => {
    try {
      // Generate career paths based on user interests and career goal
      const careerPaths = [];

      // Create a career path for the main career goal
      const mainCareerModules = await generateLearningPath(formData.careerGoal);
      careerPaths.push({
        userID,
        modules: JSON.stringify(mainCareerModules),
        progress: 0,
        careerName: formData.careerGoal,
        completedModules: JSON.stringify([]),
        recommendedSkills: JSON.stringify(formData.skills.slice(0, 5)),
        aiNudges: JSON.stringify([]),
        summaryGenerated: false
      });

      // Generate additional career paths based on top interests (max 2)
      for (const interest of formData.interests.slice(0, 2)) {
        const interestModules = await generateLearningPath(interest);
        careerPaths.push({
          userID,
          modules: JSON.stringify(interestModules),
          progress: 0,
          careerName: interest,
          completedModules: JSON.stringify([]),
          recommendedSkills: JSON.stringify(formData.skills.slice(0, 5)),
          aiNudges: JSON.stringify([]),
          summaryGenerated: false
        });
      }

      // Create career path documents in Appwrite
      for (const careerPath of careerPaths) {
        await databases.createDocument(
          DATABASE_ID,
          CAREER_PATHS_COLLECTION_ID,
          ID.unique(),
          careerPath
        );
      }

      return careerPaths.length;
    } catch (error) {
      console.error("Error generating career paths:", error);
      throw error;
    }
  };

  // New function to update existing career paths or create new ones based on updated profile
  const updateCareerPaths = async (userID) => {
    try {
      // Get existing career paths
      const existingPathsResponse = await databases.listDocuments(
        DATABASE_ID,
        CAREER_PATHS_COLLECTION_ID,
        [Query.equal("userID", userID)]
      );
      
      // Extract existing career path names
      const existingPaths = existingPathsResponse.documents.map(doc => ({
        id: doc.$id,
        name: doc.careerName
      }));
      
      // Check if career goal path exists
      const careerGoalPath = existingPaths.find(path => 
        path.name.toLowerCase() === formData.careerGoal.toLowerCase()
      );
      
      // If career goal changed, create new path for it
      if (!careerGoalPath) {
        const mainCareerModules = await generateLearningPath(formData.careerGoal);
        await databases.createDocument(
          DATABASE_ID,
          CAREER_PATHS_COLLECTION_ID,
          ID.unique(),
          {
            userID,
            modules: JSON.stringify(mainCareerModules),
            progress: 0,
            careerName: formData.careerGoal,
            completedModules: JSON.stringify([]),
            recommendedSkills: JSON.stringify(formData.skills.slice(0, 5)),
            aiNudges: JSON.stringify([]),
            summaryGenerated: false
          }
        );
        toast.success(`Added new learning path for ${formData.careerGoal}`);
      }
      
      // Update existing paths with new recommended skills
      for (const path of existingPaths) {
        await databases.updateDocument(
          DATABASE_ID,
          CAREER_PATHS_COLLECTION_ID,
          path.id,
          {
            recommendedSkills: JSON.stringify(formData.skills.slice(0, 5))
          }
        );
      }
      
      // Check for new interests and create paths for them (max 2 new ones)
      let newPathsCount = 0;
      for (const interest of formData.interests) {
        // Skip if we already have this interest path
        if (existingPaths.some(path => 
          path.name.toLowerCase() === interest.toLowerCase()
        )) {
          continue;
        }
        
        // Limit to creating 2 new interest paths
        if (newPathsCount >= 2) {
          break;
        }
        
        // Create new path for this interest
        const interestModules = await generateLearningPath(interest);
        await databases.createDocument(
          DATABASE_ID,
          CAREER_PATHS_COLLECTION_ID,
          ID.unique(),
          {
            userID,
            modules: JSON.stringify(interestModules),
            progress: 0,
            careerName: interest,
            completedModules: JSON.stringify([]),
            recommendedSkills: JSON.stringify(formData.skills.slice(0, 5)),
            aiNudges: JSON.stringify([]),
            summaryGenerated: false
          }
        );
        
        newPathsCount++;
      }
      
      return existingPaths.length + newPathsCount;
    } catch (error) {
      console.error("Error updating career paths:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Get the current user's information
      const currentUser = await account.get();
      
      // Format the data for Appwrite - removed createdAt field as it's not in the schema
      const userData = {
        userID: currentUser.$id,
        name: formData.name,
        age: parseInt(formData.age),
        careerGoal: formData.careerGoal,
        interests: JSON.stringify(formData.interests),
        skills: JSON.stringify(formData.skills)
      };
      
      if (profileExists) {
        // Update existing profile
        const response = await databases.listDocuments(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          [Query.equal("userID", currentUser.$id)]
        );
        
        if (response.documents.length > 0) {
          await databases.updateDocument(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            response.documents[0].$id,
            userData
          );
          
          // Update existing career paths or add new ones based on updated profile
          toast.loading("Updating your learning paths...", { duration: 5000 });
          const totalPaths = await updateCareerPaths(currentUser.$id);
          
          toast.success(`Profile and ${totalPaths} learning paths updated!`);
        }
      } else {
        // Create a new profile
        await databases.createDocument(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          ID.unique(),
          userData
        );
        
        // Generate career paths based on user profile
        toast.loading("Creating your personalized career paths...", { duration: 8000 });
        const pathsCount = await generateCareerPaths(currentUser.$id);
        
        // Show success message
        toast.success(`Profile created with ${pathsCount} career paths!`);
      }
      
      // Redirect to dashboard
      navigate("/learning-path");
    } catch (error) {
      console.error("Error creating/updating user profile:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const isStepValid = () => {
    switch(step) {
      case 1:
        return formData.name.trim() !== "" && formData.age !== "";
      case 2:
        return formData.careerGoal.trim() !== "";
      case 3:
        return formData.interests.length > 0;
      case 4:
        return true; // Skills are optional
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <motion.div
        className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-blue-600">Loading your profile...</span>
          </div>
        ) : (
          <>
            {profileExists && (
              <motion.div 
                className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-green-800 font-medium mb-1">Profile Data Loaded</h3>
                <p className="text-green-700 text-sm">
                  Your existing profile data has been loaded. You can review and update it as needed.
                </p>
              </motion.div>
            )}
          
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                {[1, 2, 3, 4].map((s) => (
                  <motion.span
                    key={s}
                    className={`text-xs font-medium ${
                      s <= step ? "text-blue-600" : "text-gray-400"
                    }`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: s * 0.1 }}
                  >
                    Step {s}
                  </motion.span>
                ))}
              </div>
              <div className="h-2 bg-blue-100 rounded-full">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${(step / 4) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Form Steps */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  <motion.h2 
                    variants={itemVariants}
                    className="text-2xl font-bold text-blue-800"
                  >
                    Tell us about yourself
                  </motion.h2>

                  <motion.div variants={itemVariants} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1 flex items-center gap-2">
                        <RiUserLine /> Your Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1 flex items-center gap-2">
                        <RiCalendarLine /> Your Age
                      </label>
                      <input
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="25"
                        min="1"
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500"
                  >
                    <div className="flex items-center gap-2 text-blue-800 font-medium">
                      <RiLightbulbLine className="text-xl text-blue-600" /> Tip
                    </div>
                    <p className="text-sm text-blue-800 mt-1">
                      Providing accurate information helps us personalize your learning experience.
                    </p>
                  </motion.div>
                </motion.div>
              )}

              {/* Step 2: Career Goals */}
              {step === 2 && (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  <motion.h2 
                    variants={itemVariants}
                    className="text-2xl font-bold text-blue-800"
                  >
                    What are your career goals?
                  </motion.h2>

                  <motion.div variants={itemVariants} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1 flex items-center gap-2">
                        <RiFlag2Line /> Career Goal
                      </label>
                      <textarea
                        value={formData.careerGoal}
                        onChange={(e) => setFormData({ ...formData, careerGoal: e.target.value })}
                        className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                        placeholder="I want to become a full-stack developer in 6 months..."
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500"
                  >
                    <div className="flex items-center gap-2 text-blue-800 font-medium">
                      <RiLightbulbLine className="text-xl text-blue-600" /> Tip
                    </div>
                    <p className="text-sm text-blue-800 mt-1">
                      Be specific about your career goals and timeline. This helps us recommend the right learning paths.
                    </p>
                  </motion.div>
                </motion.div>
              )}

              {/* Step 3: Interests */}
              {step === 3 && (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  <motion.h2 
                    variants={itemVariants}
                    className="text-2xl font-bold text-blue-800"
                  >
                    What are your interests?
                  </motion.h2>

                  <motion.div variants={itemVariants} className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={currentInterest}
                        onChange={(e) => setCurrentInterest(e.target.value)}
                        className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add an interest"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddInterest(currentInterest)}
                        disabled={!currentInterest}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>

                    {/* Interests tags */}
                    <div className="flex flex-wrap gap-2">
                      {formData.interests.map((interest, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2"
                        >
                          <span>{interest}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveInterest(interest)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            &times;
                          </button>
                        </motion.div>
                      ))}
                    </div>

                    {/* Suggestions */}
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Suggestions:</p>
                      <div className="flex flex-wrap gap-2">
                        {interestSuggestions.map((interest, i) => (
                          <motion.button
                            key={i}
                            type="button"
                            onClick={() => handleAddInterest(interest)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-3 py-1 bg-gray-100 hover:bg-blue-50 text-gray-700 rounded-full text-sm transition-colors"
                          >
                            + {interest}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500"
                  >
                    <div className="flex items-center gap-2 text-blue-800 font-medium">
                      <RiHeartLine className="text-xl text-blue-600" /> Tip
                    </div>
                    <p className="text-sm text-blue-800 mt-1">
                      Select interests that genuinely excite you. We'll use these to recommend relevant learning paths.
                    </p>
                  </motion.div>
                </motion.div>
              )}

              {/* Step 4: Skills */}
              {step === 4 && (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  <motion.h2 
                    variants={itemVariants}
                    className="text-2xl font-bold text-blue-800"
                  >
                    What skills do you already have?
                  </motion.h2>

                  <motion.div variants={itemVariants} className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={currentSkill}
                        onChange={(e) => setCurrentSkill(e.target.value)}
                        className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add a skill"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSkill(currentSkill)}
                        disabled={!currentSkill}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>

                    {/* Skills tags */}
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full flex items-center gap-2"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            &times;
                          </button>
                        </motion.div>
                      ))}
                    </div>

                    {/* Suggestions */}
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Suggestions:</p>
                      <div className="flex flex-wrap gap-2">
                        {skillSuggestions.map((skill, i) => (
                          <motion.button
                            key={i}
                            type="button"
                            onClick={() => handleAddSkill(skill)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-3 py-1 bg-gray-100 hover:bg-blue-50 text-gray-700 rounded-full text-sm transition-colors"
                          >
                            + {skill}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500"
                  >
                    <div className="flex items-center gap-2 text-blue-800 font-medium">
                      <RiToolsLine className="text-xl text-blue-600" /> Tip
                    </div>
                    <p className="text-sm text-blue-800 mt-1">
                      Don't worry if you're a beginner. This helps us understand your current level and tailor content accordingly.
                    </p>
                  </motion.div>
                </motion.div>
              )}

              {/* Navigation Buttons */}
              <motion.div
                className="flex justify-between mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {step > 1 && (
                  <motion.button
                    type="button"
                    onClick={handlePrevStep}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg"
                    disabled={isSubmitting}
                  >
                    Back
                  </motion.button>
                )}
                {step < 4 ? (
                  <motion.button
                    type="button"
                    onClick={handleNextStep}
                    disabled={!isStepValid() || isSubmitting}
                    whileHover={{ scale: isStepValid() && !isSubmitting ? 1.05 : 1 }}
                    whileTap={{ scale: isStepValid() && !isSubmitting ? 0.95 : 1 }}
                    className="ml-auto px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    Continue <RiArrowRightLine />
                  </motion.button>
                ) : (
                  <div className="ml-auto flex gap-3">
                    {profileExists && (
                      <motion.button
                        type="button"
                        onClick={() => navigate("/learning-path")}
                        whileHover={{ scale: !isSubmitting ? 1.05 : 1 }}
                        whileTap={{ scale: !isSubmitting ? 0.95 : 1 }}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg flex items-center gap-2"
                      >
                        Skip to Dashboard
                      </motion.button>
                    )}
                    <motion.button
                      type="submit"
                      whileHover={{ scale: !isSubmitting ? 1.05 : 1 }}
                      whileTap={{ scale: !isSubmitting ? 0.95 : 1 }}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : profileExists ? (
                        <>Update Profile <RiArrowRightLine /></>
                      ) : (
                        <>Complete Profile <RiArrowRightLine /></>
                      )}
                    </motion.button>
                  </div>
                )}
              </motion.div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ProfileForm;