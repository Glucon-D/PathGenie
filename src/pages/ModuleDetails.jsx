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
} from "react-icons/ri";

const ModuleDetails = () => {
  const { pathId, moduleIndex } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedContent, setExpandedContent] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const databases = new Databases(client);

  const isCodeRelatedTopic = (title = "") => {
    const techKeywords = {
      programming: [
        "javascript",
        "python",
        "java",
        "coding",
        "programming",
        "typescript",
      ],
      web: [
        "html",
        "css",
        "react",
        "angular",
        "vue",
        "frontend",
        "backend",
        "fullstack",
      ],
      database: ["sql", "database", "mongodb", "postgres"],
      software: [
        "api",
        "development",
        "software",
        "git",
        "devops",
        "algorithms",
      ],
      tech: ["computer science", "data structures", "networking", "cloud"],
    };

    const lowerTitle = title.toLowerCase();
    return Object.values(techKeywords).some((category) =>
      category.some((keyword) => lowerTitle.includes(keyword))
    );
  };

  const loadContent = async (expanded = false) => {
    try {
      if (expanded) {
        setIsLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError("");

      const response = await databases.getDocument(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        import.meta.env.VITE_COLLECTION_ID,
        pathId
      );

      const modules = JSON.parse(response.modules);
      const moduleTitle = modules[parseInt(moduleIndex)];
      const isTechTopic = isCodeRelatedTopic(moduleTitle);

      if (expanded) {
        const detailedContent = await generateModuleContent(moduleTitle, {
          detailed: true,
          includeExamples: true,
        });

        console.log("Generated content:", detailedContent); // For debugging

        setContent((prevContent) => ({
          ...prevContent,
          type: detailedContent.type, // Ensure type is preserved
          sections: [
            ...prevContent.sections,
            ...detailedContent.sections.map((section) => ({
              ...section,
              isNew: true,
              isAdvanced: true,
            })),
          ],
          difficulty: "advanced",
          hasMoreContent: false,
        }));
      } else {
        const initialContent = await generateModuleContent(moduleTitle, {
          detailed: false,
        });
        setContent({
          ...initialContent,
          hasMoreContent: true,
        });
      }
    } catch (error) {
      console.error("Content loading error:", error);
      setError("Failed to load content. Please try again.");
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadContent(false);
  }, [pathId, moduleIndex]);

  const handleComplete = async () => {
    try {
      // Mark the module as complete
      await markModuleComplete(pathId, parseInt(moduleIndex));
      setIsCompleted(true);

      // Show success state and redirect after delay
      setTimeout(() => {
        navigate(`/learning-path/${pathId}`);
      }, 1500);
    } catch (error) {
      console.error("Error marking module complete:", error);
      setError("Failed to update progress");
    }
  };

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
        Preparing your learning materials...
      </motion.p>
    </div>
  );

  if (loading) return <LoadingScreen />;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500 text-center bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-red-100"
        >
          {error}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 md:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto space-y-3.5 md:space-y-8"
      >
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
                {content?.title}
              </h1>
              <p className="text-gray-600 mt-1">
                Module {parseInt(moduleIndex) + 1}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Content section */}
        <motion.div className="prose prose-purple max-w-none space-y-3 md:space-y-6">
          {content?.sections.map((section, index) => (
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
              </h2>

              <div className="text-gray-600 space-y-2 md:space-y-4">
                <ReactMarkdown components={renderers}>
                  {section.content}
                </ReactMarkdown>
              </div>

              {/* Only render code example if it exists and topic is code-related */}
              {section.codeExample && content.type === "technical" && (
                <div className="flex justify-center">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 max-w-64 lg:max-w-xl md:max-w-full md:mt-6 bg-gray-900 rounded-xl overflow-hidden"
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
                      language={section.codeExample.language}
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
            </motion.div>
          ))}

          {/* Expanded Content */}
          {isExpanded && expandedContent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.5 }}
              className="mt-8"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="p-6 bg-purple-50/50 backdrop-blur-sm rounded-2xl border border-purple-100/30 mb-3 md:mb-6"
              >
                <h3 className="text-lg md:text-xl font-semibold text-purple-600">
                  Additional Content
                </h3>
                <p className="text-gray-600 mt-1">
                  Explore more in-depth information about this topic
                </p>
              </motion.div>

              {expandedContent.sections.map((section, index) => (
                <motion.div
                  key={`expanded-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.5 }}
                  className="bg-white/70 backdrop-blur-sm p-4 md:p-8 rounded-2xl border border-purple-100/30 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <h2 className="text-lg md:text-2xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-6">
                    {section.title}
                  </h2>

                  <div className="text-gray-600 space-y-4 prose prose-purple max-w-none">
                    <ReactMarkdown
                      components={{
                        ...renderers,
                        p: ({ children }) => <p className="mb-4">{children}</p>,
                        ul: ({ children }) => (
                          <ul className="list-disc pl-3 md:pl-6 mb-4">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-3 md:pl-6 mb-4">
                            {children}
                          </ol>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                            {children}
                          </h3>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-purple-200 pl-4 italic my-4">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {section.content}
                    </ReactMarkdown>
                  </div>

                  {section.codeExample && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 md:mt-6"
                    >
                      <div className="bg-gray-900 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-2 md:px-4 py-2 bg-gray-800">
                          <div className="flex items-center gap-2">
                            <RiCodeLine className="text-gray-400" />
                            <span className="text-xs text-gray-400">
                              {section.codeExample.language}
                            </span>
                          </div>
                        </div>
                        <SyntaxHighlighter
                          language={section.codeExample.language}
                          style={vscDarkPlus}
                          className="!m-0"
                          showLineNumbers
                          wrapLines
                        >
                          {section.codeExample.code}
                        </SyntaxHighlighter>
                        {section.codeExample.explanation && (
                          <div className="px-4 py-3 bg-gray-800/50 border-t border-gray-700">
                            <p className="text-xs text-gray-300">
                              {section.codeExample.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Enhanced Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-6 flex justify-between items-center bg-white/80 backdrop-blur-sm p-4 gap-2 rounded-2xl border border-purple-100/30 shadow-xl"
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
                    className="w-4 h-4 border-2 border-purple-600/30 border-t-purple-600 rounded-full"
                  />
                  Loading...
                </>
              ) : (
                <>
                  Read More
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
