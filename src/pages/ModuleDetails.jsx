import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { generateModuleContent } from "../config/gemini";
import {
  updateLearningPathProgress,
  markModuleComplete,
} from "../config/database";
import client from "../config/appwrite";
import { Databases } from "appwrite";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  RiBookOpenLine,
  RiCheckLine,
  RiArrowRightLine,
  RiCodeLine,
  RiArrowLeftLine,
  RiLoader4Line,
  RiRefreshLine,
} from "react-icons/ri";

const ModuleDetails = () => {
  const { pathId, moduleIndex } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [contentError, setContentError] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [modelUsed, setModelUsed] = useState("GROQ (Llama 3 70B)");
  const databases = new Databases(client);

  const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const COLLECTION_ID = import.meta.env.VITE_CAREER_PATHS_COLLECTION_ID;

  const loadContent = async (expanded = false) => {
    try {
      setError("");
      if (expanded) setIsLoadingMore(true);
      else setLoading(true);

      const response = await databases.getDocument(
        DATABASE_ID,
        COLLECTION_ID,
        pathId
      );

      const modules = JSON.parse(response.modules || "[]");
      const moduleIndexNum = parseInt(moduleIndex, 10);
      const module = modules[moduleIndexNum];

      const moduleTitle =
        typeof module === "string"
          ? module.split(":").pop().trim()
          : module?.title || `Module ${moduleIndexNum + 1}`;

      setModuleName(moduleTitle);

      // Define max retries and attempt counter
      const maxRetries = 2;
      let attempts = 0;
      let success = false;
      let aiResponse;
      
      // Retry logic for handling potential hallucinations
      while (attempts <= maxRetries && !success) {
        try {
          aiResponse = await generateModuleContent(moduleTitle, {
            detailed: expanded,
            includeExamples: expanded,
            // Add specific constraints to prevent hallucinations
            constrainToFacts: true,
            preventHallucination: true
          });
          
          // Check if a response header was returned indicating which model was used
          if (aiResponse.modelUsed) {
            setModelUsed(aiResponse.modelUsed);
          } else {
            setModelUsed("GROQ (Llama 3)"); // Default if not specified
          }
          
          // Validate the response has essential properties
          if (!aiResponse || !aiResponse.sections || aiResponse.sections.length === 0) {
            throw new Error("Invalid content structure");
          }
          
          // Additional validation for content quality
          const isContentValid = aiResponse.sections.every(section => {
            return (
              section.title && 
              section.content && 
              section.content.length > 100 && // Minimum content length
              !section.content.includes("I don't know") && // Avoid uncertainty phrases
              !section.content.includes("I'm not sure") &&
              !section.content.includes("As an AI")  // Avoid self-references
            );
          });
          
          if (isContentValid) {
            success = true;
          } else {
            throw new Error("Generated content didn't meet quality standards");
          }
        } catch (err) {
          attempts++;
          console.warn(`Attempt ${attempts}/${maxRetries} failed: ${err.message}`);
          if (attempts > maxRetries) {
            throw err; // Re-throw if we've exhausted retries
          }
          // Short delay before retry
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (expanded) {
        setIsExpanded(true);
        setContent((prev) => ({
          ...prev,
          difficulty: "advanced",
          hasMoreContent: false,
          sections: [
            ...prev.sections,
            ...aiResponse.sections.map((s) => ({ ...s, isNew: true })),
          ],
        }));
      } else {
        setContent({ ...aiResponse, hasMoreContent: true });
      }
    } catch (err) {
      console.error("Load error:", err);
      setError("Failed to load content. Try again.");
      setContentError(true);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Add a retry handler for content generation errors
  const handleRetryContent = () => {
    setContentError(false);
    setError("");
    loadContent(false); // Reload content from scratch
  };
  
  const handleComplete = async () => {
    try {
      const moduleIndexNum = parseInt(moduleIndex, 10);
  
      // ✅ Mark in backend
      const result = await markModuleComplete(pathId, moduleIndexNum);
  
      // ✅ Optional: update local UI
      setIsCompleted(true);
  
      // ✅ Optional: show success or navigate back to LearningPath
      setTimeout(() => {
        navigate(`/learning-path/${pathId}`);
      }, 1200);
    } catch (error) {
      console.error("Error marking module complete:", error);
      setError("Failed to update module completion");
    }
  };
  

  useEffect(() => {
    loadContent(false);
    const fetchCompletion = async () => {
      try {
        const doc = await databases.getDocument(
          DATABASE_ID,
          COLLECTION_ID,
          pathId
        );
        const completed = JSON.parse(doc.completedModules || "[]");
        setIsCompleted(completed.includes(moduleIndex.toString()));
      } catch (e) {
        console.error("Check complete error:", e);
      }
    };
    fetchCompletion();
  }, [pathId, moduleIndex]);

  const LoadingScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br rounded-2xl from-slate-50 to-purple-50">
      <motion.div
        className="relative w-16 h-16"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute inset-0 rounded-full border-4 border-purple-100" />
        <div className="absolute inset-0 rounded-full border-4 border-t-purple-600 border-r-transparent border-b-transparent border-l-transparent" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-gray-600"
      >
        Preparing your learning materials with AI...
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-xs text-gray-500"
      >
        Using GROQ to find the best model for your content
      </motion.p>
    </div>
  );

  if (loading) return <LoadingScreen />;

  if (contentError || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-red-100 max-w-md"
        >
          <div className="text-red-500 flex flex-col items-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold mt-4 text-red-600">Content Generation Failed</h2>
          </div>
          
          <p className="text-gray-700 mb-6">
            {error || "We couldn't generate content for this module. This might be due to a temporary issue with our AI service."}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRetryContent}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg flex justify-center items-center gap-2"
            >
              <RiRefreshLine /> Try Again
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBackToPath}
              className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg flex justify-center items-center gap-2"
            >
              <RiArrowLeftLine /> Back to Learning Path
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Custom renderer for code blocks
  const renderers = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <div className="my-4">
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match[1]}
            PreTag="div"
            className="rounded-lg"
            {...props}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className="bg-purple-50 px-2 py-1 rounded" {...props}>
          {children}
        </code>
      );
    },
  };


  const handleBackToPath = () => {
    navigate(`/learning-path/${pathId}`);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 md:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto space-y-3.5 md:space-y-8"
      >
        {/* Navigation Bar */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="flex justify-between items-center bg-white/70 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-blue-100/30"
        >
          <button
            onClick={handleBackToPath}
            className="p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <RiArrowLeftLine className="w-5 h-5 text-blue-600" />
            <span className="text-blue-600 hidden sm:inline">Back to Path</span>
          </button>
          
          <div className="text-sm text-gray-600">
            Module {parseInt(moduleIndex, 10) + 1}
          </div>
        </motion.div>

        {/* Enhanced Header section */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 md:p-8 shadow-xl border border-blue-100/30"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <RiBookOpenLine className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {content?.title || moduleName}
              </h1>
              <p className="text-xs text-gray-500 mt-1">Content powered by {modelUsed}</p>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Content section */}
        <motion.div className="prose prose-purple max-w-none space-y-3 md:space-y-6">
          {content?.sections?.map((section, index) => (
            <motion.div
              key={index}
              initial={
                section.isNew ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: section.isNew ? 0.2 : index * 0.1,
                duration: 0.5,
              }}
              className={`bg-white/70 backdrop-blur-sm p-4 md:p-8 rounded-2xl border border-blue-100/30 shadow-lg hover:shadow-xl transition-all duration-300 ${
                section.isNew ? "border-l-4 border-l-blue-500" : ""
              }`}
            >
              <h2 className="text-lg md:text-2xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3 md:mb-6 flex items-center gap-3">
                <span>{section.title}</span>
                {section.isAdvanced && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Advanced</span>
                )}
              </h2>

              <div className="text-gray-600 space-y-2 md:space-y-4">
                <ReactMarkdown components={renderers}>
                  {section.content}
                </ReactMarkdown>
              </div>

              {/* Only render code example if it exists */}
              {section.codeExample && section.codeExample.code && (
                <div className="flex justify-center mt-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full bg-gray-900 rounded-xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-3 md:px-4 py-2 bg-gray-800">
                      <div className="flex items-center gap-2">
                        <RiCodeLine className="text-gray-400" />
                        <span className="text-sm text-gray-400">
                          {section.codeExample.language}
                        </span>
                      </div>
                    </div>
                    <SyntaxHighlighter
                      language={section.codeExample.language || "javascript"}
                      style={vscDarkPlus}
                      className="!m-0"
                      showLineNumbers
                    >
                      {section.codeExample.code}
                    </SyntaxHighlighter>
                    {section.codeExample.explanation && (
                      <div className="px-3 md:px-4 py-3 bg-gray-800/50 border-t border-gray-700">
                        <p className="text-sm text-gray-300">
                          {section.codeExample.explanation}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
              
              {/* Key Points */}
              {section.keyPoints && section.keyPoints.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h3 className="font-medium text-blue-700 mb-2">Key Points</h3>
                  <ul className="list-disc pl-5 text-gray-600 space-y-1">
                    {section.keyPoints.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          ))}
          
          {/* Loading more content indicator */}
          {isLoadingMore && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center items-center p-8"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full"
                />
                <span className="text-blue-600 font-medium">Loading more content...</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Enhanced Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-6 flex justify-between items-center bg-white/80 backdrop-blur-sm p-4 gap-2 rounded-2xl border border-blue-100/30 shadow-xl"
        >
          {content?.hasMoreContent && !isExpanded && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => loadContent(true)}
              disabled={isLoadingMore}
              className="px-2 md:px-6 py-2 md:py-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors flex items-center gap-2"
            >
              {isLoadingMore ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full"
                  />
                  Loading...
                </>
              ) : (
                <>
                  Load Advanced Content
                  <RiArrowRightLine />
                </>
              )}
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleComplete}
            disabled={isCompleted}
            className={`px-4 md:px-6 py-2 md:py-3 rounded-xl text-white flex items-center gap-2 ${
              isCompleted
                ? "bg-green-500"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/20"
            } transition-all`}
          >
            {isCompleted ? (
              <>
                <RiCheckLine />
                Completed!
              </>
            ) : (
              <>
                Mark as Complete
                <RiArrowRightLine className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ModuleDetails;
