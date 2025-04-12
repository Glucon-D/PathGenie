import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { generateQuizData } from "../config/gemini";
import QuizCard from "../components/QuizCard";
import { useAuth } from "../context/AuthContext";
import { updateUserProgress, getLearningPaths } from "../config/database";
import { AiOutlineLeft, AiOutlineRight } from "react-icons/ai";
import { useParams, useLocation } from "react-router-dom";

const Quiz = () => {
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [quizData, setQuizData] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paths, setPaths] = useState([]);
  const [selectedPathId, setSelectedPathId] = useState("");
  const [selectedPath, setSelectedPath] = useState(null);
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState("all");
  const [quizContent, setQuizContent] = useState("");
  const { user } = useAuth();
  
  // Get parameters from URL if they exist
  const { pathId } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const moduleIndex = queryParams.get('module');

  useEffect(() => {
    if (user) {
      fetchPaths();
    }
  }, [user]);

  // Handle URL parameters for direct quiz generation
  useEffect(() => {
    if (pathId && paths.length > 0) {
      setSelectedPathId(pathId);
      const path = paths.find(p => p.$id === pathId);
      if (path) {
        handlePathChange(path);
        
        // If module is specified, select it
        if (moduleIndex !== null) {
          const moduleIdx = parseInt(moduleIndex);
          if (!isNaN(moduleIdx) && moduleIdx >= 0 && 
              path.modules && path.modules.length > moduleIdx) {
            // Make sure we have valid data before accessing
            if (path.modules[moduleIdx]) {
              setSelectedModule(moduleIdx.toString());
              
              // Extract the actual module content for the topic
              const module = path.modules[moduleIdx];
              // Use the exact module title as the quiz topic (without any "Module X:" prefix)
              const moduleTitle = module.title || `Module ${moduleIdx + 1}`;
              const cleanTitle = moduleTitle.replace(/^Module\s+\d+\s*:\s*/i, '');
              
              // Set the clean title as topic
              setTopic(cleanTitle || path.careerName || 'Learning Path');
            }
          }
        }
      }
    }
  }, [pathId, moduleIndex, paths]);

  const fetchPaths = async () => {
    try {
      setLoading(true);
      const response = await getLearningPaths(user.$id);
      if (response.documents.length > 0) {
        // Ensure all path documents have properly parsed modules
        const validatedPaths = response.documents.map(path => {
          // Make sure modules are properly parsed 
          let modules = [];
          
          try {
            // If modules is already an array, use it; otherwise try to parse
            if (Array.isArray(path.modules)) {
              modules = path.modules;
            } else if (typeof path.modules === 'string') {
              modules = JSON.parse(path.modules);
            }
            
            // Validate each module has a title
            modules = modules.map((module, idx) => ({
              ...module,
              title: module.title || `Module ${idx + 1}`
            }));
            
          } catch (e) {
            console.error("Error parsing modules for path:", path.careerName, e);
            modules = [];
          }
          
          return {
            ...path,
            modules,
            careerName: path.careerName || "Unnamed Path"
          };
        });
        
        setPaths(validatedPaths);
        
        // Only set default if no pathId is provided
        if (!pathId && validatedPaths.length > 0) {
          setSelectedPathId(validatedPaths[0].$id);
          handlePathChange(validatedPaths[0]);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching paths:", error);
      setLoading(false);
    }
  };

  const handlePathChange = (path) => {
    if (!path) return;
    
    setSelectedPath(path);
    
    // Ensure path has modules property and it's an array
    const modules = Array.isArray(path.modules) ? path.modules : [];
    
    if (modules.length > 0) {
      setModules(modules);
      // Set default topic to path name without any career-specific prefix
      const pathName = path.careerName || "Quiz";
      setTopic(pathName.replace(/^(career|path|learning path|track):\s*/i, ''));
      
      // Extract quiz content for the entire path with proper validation
      const allContent = modules.map(module => {
        // Make sure module has a title - get the raw title without prefixes
        const moduleTitle = module.title || "Unnamed Module";
        const cleanTitle = moduleTitle.replace(/^Module\s+\d+\s*:\s*/i, '');
        
        // Start content with the clean title for better context
        let content = `${cleanTitle}:\n${module.description || ''}`;
        
        // Include sections/lessons if available with null checks
        if (Array.isArray(module.sections)) {
          content += '\n' + module.sections
            .map(section => `${section?.title || ''}: ${section?.content || ''}`)
            .filter(Boolean)
            .join('\n\n');
        } else if (Array.isArray(module.lessons)) {
          content += '\n' + module.lessons
            .map(lesson => `${lesson?.title || ''}: ${lesson?.content || ''}`)
            .filter(Boolean)
            .join('\n\n');
        } else if (module.content) {
          content += '\n' + module.content;
        }
        
        return content;
      }).join('\n\n');
      
      setQuizContent(allContent);
    } else {
      setModules([]);
      setQuizContent("");
      setTopic(path.careerName || "Quiz");
    }
  };

  const handleModuleChange = (e) => {
    const moduleValue = e.target.value;
    setSelectedModule(moduleValue);
    
    if (!selectedPath) return;
    
    if (moduleValue === "all") {
      // Set topic for all modules - use path name directly without prefixes
      const pathName = selectedPath.careerName || "Quiz";
      setTopic(pathName.replace(/^(career|path|learning path|track):\s*/i, ''));
      
      // Get content from all modules with validation
      const allContent = modules.map(module => {
        // Ensure module title is included in the content for context
        const moduleTitle = module.title || "Unnamed Module";
        let content = `${moduleTitle}:\n${module.description || ''}`;
        
        // Include sections/lessons if available with null checks
        if (Array.isArray(module.sections)) {
          content += '\n' + module.sections
            .map(section => `${section?.title || ''}: ${section?.content || ''}`)
            .filter(Boolean)
            .join('\n\n');
        } else if (Array.isArray(module.lessons)) {
          content += '\n' + module.lessons
            .map(lesson => `${lesson?.title || ''}: ${lesson?.content || ''}`)
            .filter(Boolean)
            .join('\n\n');
        } else if (module.content) {
          content += '\n' + module.content;
        }
        
        return content;
      }).join('\n\n');
      
      setQuizContent(allContent);
    } else {
      // Get selected module index with validation
      try {
        const moduleIndex = parseInt(moduleValue);
        if (isNaN(moduleIndex) || moduleIndex < 0 || moduleIndex >= modules.length) {
          console.error("Invalid module index:", moduleValue);
          return;
        }
        
        const module = modules[moduleIndex];
        if (!module) {
          console.error("Module not found at index:", moduleIndex);
          return;
        }
        
        // Extract the raw module title without any numbering or prefixes
        let moduleTitle = module.title || `Module ${moduleIndex + 1}`;
        // Clean up title by removing any "Module X:" prefix
        const cleanTitle = moduleTitle.replace(/^Module\s+\d+\s*:\s*/i, '');
        
        // Set topic to just the module title (not prefixed with path name)
        // This ensures Gemini focuses exclusively on this module's content
        setTopic(cleanTitle);
        
        // Get content from specific module with validation - include full title for context
        let moduleContent = `${cleanTitle}:\n${module.description || ''}`;
        
        // Include sections/lessons if available with null checks
        if (Array.isArray(module.sections)) {
          moduleContent += '\n' + module.sections
            .map(section => `${section?.title || ''}: ${section?.content || ''}`)
            .filter(Boolean)
            .join('\n\n');
        } else if (Array.isArray(module.lessons)) {
          moduleContent += '\n' + module.lessons
            .map(lesson => `${lesson?.title || ''}: ${lesson?.content || ''}`)
            .filter(Boolean)
            .join('\n\n');
        } else if (module.content) {
          moduleContent += '\n' + module.content;
        }
        
        setQuizContent(moduleContent);
      } catch (error) {
        console.error("Error processing module selection:", error);
        // Default back to path topic on error
        setTopic(selectedPath.careerName || "Quiz");
      }
    }
  };

  const handlePathSelect = (e) => {
    const pathId = e.target.value;
    setSelectedPathId(pathId);
    
    // Find the selected path object
    const path = paths.find(p => p.$id === pathId);
    if (path) {
      handlePathChange(path);
    } else {
      setSelectedPath(null);
      setModules([]);
      setQuizContent("");
    }
    
    // Reset module selection
    setSelectedModule("all");
  };

  const extractModuleContent = (module) => {
    if (!module) return "";
    
    let content = [];
    
    // Add title and description
    if (module.title) content.push(`${module.title}`);
    if (module.description) content.push(`${module.description}`);
    
    // Extract content from sections or lessons
    if (Array.isArray(module.sections)) {
      module.sections.forEach(section => {
        if (section?.title) content.push(section.title);
        if (section?.content) content.push(section.content);
      });
    } else if (Array.isArray(module.lessons)) {
      module.lessons.forEach(lesson => {
        if (lesson?.title) content.push(lesson.title);
        if (lesson?.content) content.push(lesson.content);
      });
    } else if (module.content) {
      content.push(module.content);
    }
    
    return content.join('\n\n');
  };

  const handleGenerateQuiz = async () => {
    if (!topic || numQuestions < 1) {
      alert("Please enter a valid topic and number of questions.");
      return;
    }

    if (!selectedPathId) {
      alert("Please select a learning path to associate with this quiz.");
      return;
    }

    setLoading(true);
    try {
      // Use the module title directly as the quiz topic
      let quizTopic = topic;
      
      // Ensure the topic isn't too generic
      if (quizTopic.match(/^(module|section|lesson|chapter)\s+\d+$/i)) {
        // If it's just "Module X", add the path name for context
        quizTopic = `${selectedPath?.careerName || 'Learning'}: ${quizTopic}`;
      }
      
      // Ensure there is enough content to generate a quiz
      let enhancedContent = quizContent;
      
      // If selected specific module, focus only on that module's content
      if (selectedModule !== "all" && modules.length > 0) {
        const moduleIndex = parseInt(selectedModule);
        if (!isNaN(moduleIndex) && moduleIndex >= 0 && moduleIndex < modules.length) {
          const module = modules[moduleIndex];
          // Add introduction to specify what the quiz should focus on
          enhancedContent = `This quiz should focus specifically on ${quizTopic}.\n\n${enhancedContent}`;
        }
      }
      
      if (!enhancedContent || enhancedContent.trim().length < 50) {
        // If module content is too short, add path name and module titles for context
        enhancedContent = `${selectedPath?.careerName || 'Learning Path'}\n\n` + 
          modules.map(m => {
            const cleanTitle = (m.title || '').replace(/^Module\s+\d+\s*:\s*/i, '');
            return `${cleanTitle}: ${m.description || ''}`;
          }).join('\n\n');
      }
      
      console.log("Generating quiz about:", quizTopic);
      
      // Generate quiz using the content from the selected module/path
      const data = await generateQuizData(quizTopic, numQuestions, enhancedContent);
      setQuizData(data);
      setUserAnswers({});
      setShowResults(false);
      setScore(0);
      setAccuracy(0);
      setCurrentIndex(0);
    } catch (error) {
      console.error("Error generating quiz:", error);
      alert("Failed to generate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer) => {
    setUserAnswers((prev) => {
      const question = quizData.questions[currentIndex];

      if (question.questionType === "single") {
        return { ...prev, [currentIndex]: [answer] }; // Only one can be selected
      }

      const updatedAnswers = prev[currentIndex]
        ? prev[currentIndex].includes(answer)
          ? prev[currentIndex].filter((a) => a !== answer)
          : [...prev[currentIndex], answer]
        : [answer];

      return { ...prev, [currentIndex]: updatedAnswers };
    });
  };

  useEffect(() => {
    if (showResults && quizData && user?.$id && selectedPathId) {
      let totalScore = 0;
      let correctCount = 0;

      quizData.questions.forEach((q, index) => {
        const correctAnswer = Array.isArray(q.correctAnswer)
          ? q.correctAnswer.sort()
          : [q.correctAnswer];
        const userAnswer = userAnswers[index]?.sort() || [];

        if (JSON.stringify(correctAnswer) === JSON.stringify(userAnswer)) {
          totalScore += q.point || 10;
          correctCount++;
        }
      });

      setScore(totalScore);
      const accuracyValue = (
        (correctCount / quizData.questions.length) *
        100
      ).toFixed(2);
      setAccuracy(accuracyValue);

      // Update user progress with the selected path ID
      updateUserProgress(user.$id, selectedPathId, {
        topicName: topic,
        quizScores: {
          topic,
          score: totalScore,
          accuracy: accuracyValue,
          totalQuestions: quizData.questions.length,
          date: new Date().toISOString(),
        },
      }).catch(console.error);
    }
  }, [showResults, quizData, userAnswers, user, selectedPathId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-lg font-semibold text-blue-600">
            Generating Quiz...
          </p>
        </motion.div>
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-blue-50 via-white to-blue-50 p-4 sm:p-8">
        <motion.div
          className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-4 sm:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
            AI-Powered Learning Path Quiz
          </h1>
          <div className="space-y-4">
            {paths.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Learning Path
                </label>
                <select
                  value={selectedPathId}
                  onChange={handlePathSelect}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="">-- Select Learning Path --</option>
                  {paths.map((path) => (
                    <option key={path.$id} value={path.$id}>
                      {path.careerName || "Unnamed Path"}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                <p className="text-yellow-700 text-sm">
                  You don't have any learning paths yet. Create a learning path first.
                </p>
              </div>
            )}
            
            {modules.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Module
                </label>
                <select
                  value={selectedModule}
                  onChange={handleModuleChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="all">All Modules</option>
                  {modules.map((module, index) => (
                    <option key={index} value={index.toString()}>
                      {module.title || `Module ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="e.g., JavaScript Arrays, React Hooks"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Questions
              </label>
              <input
                type="number"
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                min="1"
                max="10"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
            <motion.button
              onClick={handleGenerateQuiz}
              disabled={!selectedPathId || !topic}
              className={`w-full py-3 ${
                !selectedPathId || !topic
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-blue-500 text-white"
              } rounded-xl font-medium shadow-lg text-sm sm:text-base`}
              whileHover={{ scale: selectedPathId && topic ? 1.02 : 1 }}
              whileTap={{ scale: selectedPathId && topic ? 0.98 : 1 }}
            >
              Generate Quiz
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = quizData.questions[currentIndex];
  const userAnswer = userAnswers[currentIndex] || [];
  const correctAnswer = Array.isArray(currentQuestion.correctAnswer)
    ? currentQuestion.correctAnswer
    : [currentQuestion.correctAnswer];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-blue-50 via-white to-blue-50 p-4 sm:p-8">
      {!showResults ? (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{topic} Quiz</h2>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-2">
              <span className="text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Question {currentIndex + 1} of {quizData.questions.length}
              </span>
              <span className="text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Points: {currentQuestion.point}
              </span>
            </div>
          </div>

          <QuizCard
            question={currentQuestion.question}
            answers={currentQuestion.answers}
            selectedAnswers={userAnswers[currentIndex] || []}
            onAnswerSelect={handleAnswerSelect}
            questionType={currentQuestion.questionType}
            showResults={false}
          />

          <div className="flex justify-between mt-6">
            <motion.button
              onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
              className={`flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full ${
                currentIndex === 0
                  ? "bg-blue-300 text-white cursor-not-allowed"
                  : "bg-blue-400 text-white"
              }`}
              disabled={currentIndex === 0}
              whileHover={{ scale: currentIndex === 0 ? 1 : 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <AiOutlineLeft className="text-base sm:text-lg" />
            </motion.button>

            {/* Next Button */}
            <motion.button
              onClick={() =>
                setCurrentIndex((prev) =>
                  Math.min(prev + 1, quizData.questions.length - 1)
                )
              }
              className={`flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full ${
                currentIndex === quizData.questions.length - 1
                  ? "bg-blue-300 text-white cursor-not-allowed"
                  : "bg-blue-400 text-white"
              }`}
              disabled={currentIndex === quizData.questions.length - 1}
              whileHover={{
                scale: currentIndex === quizData.questions.length - 1 ? 1 : 1.1,
              }}
              whileTap={{ scale: 0.9 }}
            >
              <AiOutlineRight className="text-base sm:text-lg" />
            </motion.button>
          </div>

          {currentIndex === quizData.questions.length - 1 && (
            <div className="flex justify-center mt-6">
              <motion.button
                onClick={() => setShowResults(true)}
                className="bg-gradient-to-r from-blue-400 to-blue-500 text-white text-lg sm:text-2xl px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg w-full sm:w-auto"
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0px 4px 10px rgba(37, 99, 235, 0.5)",
                }}
                whileTap={{ scale: 0.95 }}
              >
                Show Result
              </motion.button>
            </div>
          )}
        </div>
      ) : (
        <motion.div
          className="max-w-4xl mx-auto space-y-6 sm:space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Results Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent mb-4">
              Quiz Results
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-xs sm:text-sm text-blue-600">Total Score</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700">
                  {score} / {quizData.questions.length * 10}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-xs sm:text-sm text-blue-600">Accuracy</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700">
                  {accuracy}%
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-xs sm:text-sm text-blue-600">Questions</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700">
                  {quizData.questions.length}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Review */}
          <div className="space-y-4 sm:space-y-6">
            {quizData.questions.map((q, index) => (
              <QuizCard
                key={index}
                question={q.question}
                answers={q.answers}
                selectedAnswers={userAnswers[index] || []}
                onAnswerSelect={() => {}}
                questionType={q.questionType}
                showResults={true}
                correctAnswer={q.correctAnswer}
                explanation={q.explanation}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 pb-8">
            <motion.button
              onClick={() => setQuizData(null)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-medium shadow-lg text-sm sm:text-base w-full sm:w-auto"
            >
              Start New Quiz
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Quiz;
