import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  RiCloseLine,
  RiSearchLine,
  RiBrainLine,
  RiLightbulbLine
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
  
  // New states for topic elaboration popup
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [elaborationTopic, setElaborationTopic] = useState("");
  const [elaborationContent, setElaborationContent] = useState(null);
  const [loadingElaboration, setLoadingElaboration] = useState(false);

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

  // New function to elaborate on a specific topic
  const handleElaborate = async (topic) => {
    setElaborationTopic(topic);
    setIsPopupOpen(true);
    setLoadingElaboration(true);
    setElaborationContent(null);

    try {
      // Build a more specific prompt for the topic
      const fullTopic = `${moduleName}: ${topic}`;
      
      const elaboration = await generateModuleContent(fullTopic, {
        detailed: true,
        includeExamples: true,
        constrainToFacts: true,
        preventHallucination: true
      });

      if (elaboration.modelUsed) {
        // Update which model was used for elaboration
        setModelUsed(elaboration.modelUsed);
      }

      setElaborationContent(elaboration);
    } catch (error) {
      console.error("Error elaborating on topic:", error);
      setElaborationContent({
        title: topic,
        error: "Failed to generate elaboration. Please try again."
      });
    } finally {
      setLoadingElaboration(false);
    }
  };

  const closePopup = () => {
    setIsPopupOpen(false);
    // Small delay before clearing content to allow animation
    setTimeout(() => {
      setElaborationContent(null);
      setElaborationTopic("");
    }, 300);
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

  // Popup component for elaboration content
  const ElaborationPopup = () => (
    <AnimatePresence>
      {isPopupOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            // Close popup when clicking the backdrop (outside the popup content)
            if (e.target === e.currentTarget) closePopup();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-3 sm:p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                  <RiBrainLine className="text-blue-600 w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate max-w-[200px] sm:max-w-md">
                  {elaborationTopic}
                </h2>
              </div>
              <button 
                onClick={closePopup}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <RiCloseLine className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              {loadingElaboration ? (
                <div className="flex flex-col items-center justify-center h-40 sm:h-64">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="w-8 sm:w-10 h-8 sm:h-10 border-3 sm:border-4 border-blue-200 border-t-blue-600 rounded-full mb-4"
                  />
                  <p className="text-sm sm:text-base text-gray-600">Generating detailed explanation...</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">Using GROQ's advanced LLMs</p>
                </div>
              ) : elaborationContent?.error ? (
                <div className="bg-red-50 p-4 sm:p-6 rounded-xl text-center">
                  <p className="text-red-600 text-sm sm:text-base">{elaborationContent.error}</p>
                  <button
                    onClick={() => handleElaborate(elaborationTopic)}
                    className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg flex items-center gap-2 mx-auto text-sm"
                  >
                    <RiRefreshLine /> Try Again
                  </button>
                </div>
              ) : elaborationContent ? (
                <div className="space-y-4 sm:space-y-6">
                  <div className="border-l-4 border-blue-500 pl-3 sm:pl-4 py-1.5 sm:py-2 italic text-gray-600 bg-blue-50/50 rounded-r-lg text-xs sm:text-sm">
                    <p>A deeper exploration into {elaborationTopic}, expanding on the concepts covered in the module.</p>
                  </div>
                  
                  {elaborationContent.sections?.map((section, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white border border-gray-200 p-3 sm:p-5 rounded-xl shadow-sm"
                    >
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">{section.title}</h3>
                      <div className="prose prose-sm max-w-none text-xs sm:text-sm">
                        <ReactMarkdown components={renderers}>
                          {section.content}
                        </ReactMarkdown>
                      </div>

                      {section.codeExample && section.codeExample.code && (
                        <div className="mt-3 sm:mt-4 bg-gray-900 rounded-lg overflow-hidden">
                          <div className="bg-gray-800 px-3 py-1.5 sm:px-4 sm:py-2 text-xs text-gray-400 flex items-center gap-2">
                            <RiCodeLine />
                            <span>{section.codeExample.language}</span>
                          </div>
                          <SyntaxHighlighter
                            language={section.codeExample.language || "javascript"}
                            style={vscDarkPlus}
                            className="!m-0 !text-xs sm:!text-sm"
                            showLineNumbers={false}
                          >
                            {section.codeExample.code}
                          </SyntaxHighlighter>
                          {section.codeExample.explanation && (
                            <div className="px-3 sm:px-4 py-2 bg-gray-800 text-gray-300 text-xs sm:text-sm border-t border-gray-700">
                              {section.codeExample.explanation}
                            </div>
                          )}
                        </div>
                      )}

                      {section.keyPoints && section.keyPoints.length > 0 && (
                        <div className="mt-3 sm:mt-4 bg-blue-50 p-2 sm:p-3 rounded-lg">
                          <h4 className="text-xs sm:text-sm font-medium text-blue-700 mb-1 sm:mb-2">Key Takeaways</h4>
                          <ul className="list-disc pl-4 sm:pl-5 text-xs sm:text-sm text-gray-700">
                            {section.keyPoints.map((point, idx) => (
                              <li key={idx} className="mb-0.5 sm:mb-1">{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : null}
            </div>
            
            {/* Footer */}
            <div className="p-2 sm:p-4 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-500">
              Content powered by {modelUsed}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Custom renderer for code blocks with the "Elaborate" button for heading elements
  const renderers = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <div className="my-2 sm:my-4">
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match[1]}
            PreTag="div"
            className="rounded-lg text-xs sm:text-sm"
            {...props}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className="bg-purple-50 px-1.5 py-0.5 rounded text-xs sm:text-sm" {...props}>
          {children}
        </code>
      );
    },
    // Add custom renderer for headings to include an "Elaborate" button
    h3: ({ children }) => (
      <div className="group flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold">{children}</h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleElaborate(children)}
          className="opacity-0 group-hover:opacity-100 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded flex items-center gap-1 transition-opacity"
        >
          <RiLightbulbLine className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Elaborate
        </motion.button>
      </div>
    ),
    // Similarly for h4 elements
    h4: ({ children }) => (
      <div className="group flex items-center justify-between">
        <h4 className="text-sm sm:text-md font-medium">{children}</h4>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleElaborate(children)}
          className="opacity-0 group-hover:opacity-100 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded flex items-center gap-1 transition-opacity"
        >
          <RiLightbulbLine className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Elaborate
        </motion.button>
      </div>
    )
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
          className="flex justify-between items-center bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl border border-blue-100/30"
        >
          <button
            onClick={handleBackToPath}
            className="p-1.5 sm:p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2"
          >
            <RiArrowLeftLine className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span className="text-blue-600 hidden sm:inline text-sm">Back to Path</span>
          </button>
          
          <div className="text-xs sm:text-sm text-gray-600">
            Module {parseInt(moduleIndex, 10) + 1}
          </div>
        </motion.div>

        {/* Enhanced Header section */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 md:p-8 shadow-xl border border-blue-100/30"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg sm:rounded-xl">
              <RiBookOpenLine className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent line-clamp-2">
                {content?.title || moduleName}
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Content powered by {modelUsed}</p>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Content section with elaboration buttons */}
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
              className={`bg-white/70 backdrop-blur-sm p-3 sm:p-4 md:p-8 rounded-xl sm:rounded-2xl border border-blue-100/30 shadow-lg hover:shadow-xl transition-all duration-300 ${
                section.isNew ? "border-l-4 border-l-blue-500" : ""
              }`}
            >
              <div className="group">
                <div className="flex justify-between items-center mb-2 sm:mb-3 md:mb-6">
                  <h2 className="text-base sm:text-lg md:text-2xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
                    <span className="line-clamp-2">{section.title}</span>
                    {section.isAdvanced && (
                      <span className="text-[8px] sm:text-xs bg-blue-100 text-blue-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">Advanced</span>
                    )}
                  </h2>
                  
                  {/* Add Elaborate button to section headers */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleElaborate(section.title)}
                    className="opacity-0 group-hover:opacity-100 text-[10px] sm:text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg flex items-center gap-1 transition-opacity"
                  >
                    <RiLightbulbLine className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Elaborate
                  </motion.button>
                </div>
              </div>

              <div className="text-gray-600 space-y-2 md:space-y-4 text-sm sm:text-base">
                <ReactMarkdown components={renderers}>
                  {section.content}
                </ReactMarkdown>
              </div>

              {/* Only render code example if it exists */}
              {section.codeExample && section.codeExample.code && (
                <div className="flex justify-center mt-3 sm:mt-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full bg-gray-900 rounded-xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gray-800">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <RiCodeLine className="text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="text-[10px] sm:text-xs text-gray-400">
                          {section.codeExample.language}
                        </span>
                      </div>
                    </div>
                    <SyntaxHighlighter
                      language={section.codeExample.language || "javascript"}
                      style={vscDarkPlus}
                      className="!m-0 !text-[10px] sm:!text-xs md:!text-sm"
                      showLineNumbers
                    >
                      {section.codeExample.code}
                    </SyntaxHighlighter>
                    {section.codeExample.explanation && (
                      <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 bg-gray-800/50 border-t border-gray-700">
                        <p className="text-[10px] sm:text-xs text-gray-300">
                          {section.codeExample.explanation}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
              
              {/* Key Points with Elaboration button */}
              {section.keyPoints && section.keyPoints.length > 0 && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-100 group">
                  <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                    <h3 className="font-medium text-blue-700 text-sm sm:text-base">Key Points</h3>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleElaborate(`Key Points of ${section.title}`)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-200 hover:bg-blue-300 text-blue-700 rounded flex items-center gap-1 transition-opacity"
                    >
                      <RiSearchLine className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Explore Further
                    </motion.button>
                  </div>
                  <ul className="list-disc pl-4 sm:pl-5 text-gray-600 space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
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
              className="flex justify-center items-center p-4 sm:p-8"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 sm:w-6 sm:h-6 border-2 sm:border-3 border-blue-200 border-t-blue-600 rounded-full"
                />
                <span className="text-blue-600 font-medium text-xs sm:text-sm">Loading more content...</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Enhanced Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-2 sm:bottom-6 flex flex-col sm:flex-row justify-between items-center gap-2 sm:items-center bg-white/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-blue-100/30 shadow-xl"
        >
          {content?.hasMoreContent && !isExpanded && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => loadContent(true)}
              disabled={isLoadingMore}
              className="w-full sm:w-auto px-2 sm:px-6 py-2 sm:py-3 bg-blue-100 text-blue-600 rounded-lg sm:rounded-xl hover:bg-blue-200 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
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
                    className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full"
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
            className={`w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl text-white flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${
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

      {/* Elaboration Popup */}
      <ElaborationPopup />
    </div>
  );
};

export default ModuleDetails;
