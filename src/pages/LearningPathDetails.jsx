import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  RiBookLine,
  RiCheckboxCircleFill,
  RiTimeLine,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiFileList3Line,
  RiQuestionLine
} from "react-icons/ri";
import { account } from "../config/appwrite";
import { databases } from "../config/database";
import toast from "react-hot-toast";
import { generateQuiz } from "../config/gemini";

const LearningPathDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [careerPath, setCareerPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completedModules, setCompletedModules] = useState([]);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  // Database constants
  const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const CAREER_PATHS_COLLECTION_ID = import.meta.env.VITE_CAREER_PATHS_COLLECTION_ID;

  useEffect(() => {
    fetchCareerPath();
  }, [id]);

  const fetchCareerPath = async () => {
    try {
      setLoading(true);
      // Get the career path document by ID
      const response = await databases.getDocument(
        DATABASE_ID,
        CAREER_PATHS_COLLECTION_ID,
        id
      );

      // Parse JSON fields
      const parsedPath = {
        ...response,
        modules: JSON.parse(response.modules || "[]"),
        completedModules: JSON.parse(response.completedModules || "[]")
      };
      
      setCareerPath(parsedPath);
      setCompletedModules(parsedPath.completedModules);
      // Set the first incomplete module as selected by default
      const firstIncompleteIndex = parsedPath.modules.findIndex(
        (_, index) => !parsedPath.completedModules.includes(index.toString())
      );
      setSelectedModuleIndex(firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0);
      
    } catch (error) {
      console.error("Error fetching career path:", error);
      setError("Failed to load career path");
    } finally {
      setLoading(false);
    }
  };

  const handleModuleClick = (index) => {
    setSelectedModuleIndex(index);
    // Clear any previous quiz data when switching modules
    setQuizData(null);
  };

  const handleMarkComplete = async () => {
    if (selectedModuleIndex === null) return;
    
    try {
      // Prepare updated completedModules array
      const moduleIdStr = selectedModuleIndex.toString();
      let updatedCompletedModules;
      
      if (!completedModules.includes(moduleIdStr)) {
        updatedCompletedModules = [...completedModules, moduleIdStr];
      } else {
        updatedCompletedModules = completedModules;
      }
      
      // Calculate new progress percentage
      const newProgress = Math.round(
        (updatedCompletedModules.length / careerPath.modules.length) * 100
      );
      
      // Update the document in Appwrite
      await databases.updateDocument(
        DATABASE_ID,
        CAREER_PATHS_COLLECTION_ID,
        id,
        {
          completedModules: JSON.stringify(updatedCompletedModules),
          progress: newProgress
        }
      );
      
      // Update local state
      setCompletedModules(updatedCompletedModules);
      setCareerPath({
        ...careerPath,
        completedModules: updatedCompletedModules,
        progress: newProgress
      });
      
      toast.success("Module marked as complete!");
      
      // Auto-advance to next module if available
      if (selectedModuleIndex < careerPath.modules.length - 1) {
        setSelectedModuleIndex(selectedModuleIndex + 1);
      }
      
    } catch (error) {
      console.error("Error updating completion status:", error);
      toast.error("Failed to mark module as complete");
    }
  };
  
  const generateModuleQuiz = async () => {
    if (!careerPath?.modules[selectedModuleIndex]) return;
    
    try {
      setLoadingQuiz(true);
      const moduleTitle = careerPath.modules[selectedModuleIndex].title;
      const quiz = await generateQuiz(moduleTitle);
      setQuizData(quiz);
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      toast.error("Failed to generate quiz");
    } finally {
      setLoadingQuiz(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <RiQuestionLine className="text-red-500 w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Career Path</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/learning-path')}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
          >
            Back to Career Paths
          </button>
        </div>
      </div>
    );
  }

  const selectedModule = careerPath?.modules[selectedModuleIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br rounded-2xl from-slate-50 to-blue-50 p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-5xl mx-auto space-y-8"
      >
        {/* Header - Career Path Title */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-blue-100/30"
        >
          <div className="space-y-2 md:space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/learning-path')}
                className="p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <RiArrowLeftLine className="w-5 h-5 text-blue-600" />
              </button>
              <div>
                <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {careerPath?.careerName}
                </h1>
                <p className="text-gray-600 mt-1">
                  {careerPath?.modules.length} modules • {completedModules.length} completed
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Overall Progress</span>
                <span className="font-medium">{careerPath?.progress}%</span>
              </div>
              <div className="w-full bg-blue-100 rounded-full h-3">
                <motion.div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${careerPath?.progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Modules Grid and Details Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Modules List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 pl-2">Career Modules</h2>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-blue-100/30 max-h-[500px] overflow-y-auto">
              {careerPath?.modules.map((module, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 mb-2 rounded-lg cursor-pointer transition-all ${
                    selectedModuleIndex === index
                      ? "bg-blue-50 border-l-4 border-blue-500"
                      : "hover:bg-blue-50"
                  }`}
                  onClick={() => handleModuleClick(index)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${
                        completedModules.includes(index.toString())
                          ? "bg-green-100 text-green-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {completedModules.includes(index.toString()) ? (
                        <RiCheckboxCircleFill />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {module.title}
                      </h3>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Selected Module Details */}
          <div className="lg:col-span-2">
            {selectedModule ? (
              <motion.div
                key={selectedModuleIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Module Header */}
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-blue-100/30">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">{selectedModule.title}</h2>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <RiTimeLine />
                        <span>{selectedModule.estimatedTime || "20-30 minutes"}</span>
                      </div>
                    </div>
                    <div>
                      {completedModules.includes(selectedModuleIndex.toString()) ? (
                        <div className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium flex items-center gap-1">
                          <RiCheckboxCircleFill />
                          <span>Completed</span>
                        </div>
                      ) : (
                        <button
                          onClick={handleMarkComplete}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                        >
                          <RiCheckboxCircleFill />
                          <span>Mark Complete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Module Content */}
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-blue-100/30">
                  <div className="prose max-w-none">
                    <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                      <RiFileList3Line className="text-blue-500" />
                      Description
                    </h3>
                    <div className="text-gray-700 space-y-4">
                      {selectedModule.description && (
                        <p>{selectedModule.description}</p>
                      )}
                      {selectedModule.content && (
                        <div className="mt-4">{selectedModule.content}</div>
                      )}
                      {!selectedModule.description && !selectedModule.content && (
                        <p>This module focuses on {selectedModule.title} concepts and techniques.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quiz Section */}
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-blue-100/30">
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <RiQuestionLine className="text-blue-500" />
                    Knowledge Check
                  </h3>

                  {!quizData && !loadingQuiz && (
                    <div className="text-center py-4">
                      <p className="text-gray-600 mb-4">Test your knowledge of this module with a quick quiz.</p>
                      <button
                        onClick={generateModuleQuiz}
                        className="px-4 py-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                      >
                        <span>Generate Quiz</span>
                        <RiArrowRightLine />
                      </button>
                    </div>
                  )}

                  {loadingQuiz && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 border-3 border-blue-100 border-t-blue-500 rounded-full mb-4"
                      />
                      <p className="text-blue-600">Generating quiz questions...</p>
                    </div>
                  )}

                  {quizData && (
                    <div className="space-y-6">
                      {quizData.questions?.map((question, qIndex) => (
                        <div key={qIndex} className="border border-blue-100 rounded-lg p-4 bg-blue-50/50">
                          <p className="font-medium text-gray-800 mb-3">
                            {qIndex + 1}. {question.question}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                            {question.options.map((option, oIndex) => (
                              <div
                                key={oIndex}
                                className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 hover:border-blue-300 cursor-pointer"
                              >
                                <input
                                  type="radio"
                                  name={`question-${qIndex}`}
                                  id={`q${qIndex}-o${oIndex}`}
                                  className="text-blue-500 focus:ring-blue-500"
                                />
                                <label
                                  htmlFor={`q${qIndex}-o${oIndex}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  {option}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-end">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          Submit Answers
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between">
                  <button
                    onClick={() => {
                      if (selectedModuleIndex > 0) {
                        handleModuleClick(selectedModuleIndex - 1);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                      selectedModuleIndex > 0
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        : "bg-gray-50 text-gray-400 cursor-not-allowed"
                    }`}
                    disabled={selectedModuleIndex === 0}
                  >
                    <RiArrowLeftLine />
                    <span>Previous</span>
                  </button>

                  <button
                    onClick={() => {
                      if (selectedModuleIndex < careerPath.modules.length - 1) {
                        handleModuleClick(selectedModuleIndex + 1);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                      selectedModuleIndex < careerPath.modules.length - 1
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        : "bg-gray-50 text-gray-400 cursor-not-allowed"
                    }`}
                    disabled={selectedModuleIndex === careerPath.modules.length - 1}
                  >
                    <span>Next</span>
                    <RiArrowRightLine />
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-blue-100/30 text-center">
                <p className="text-gray-600">Select a module to view its details</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LearningPathDetails;
