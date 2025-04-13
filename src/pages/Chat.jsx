import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateChatResponse } from '../config/gemini';
import { 
  RiSendPlaneFill, 
  RiUserLine, 
  RiRobot2Line, 
  RiDeleteBin6Line,
  RiRefreshLine,
  RiLightbulbLine,
  RiTimeLine,
  RiChat1Line,
  RiSettings4Line,
  RiFileCopyLine,
  RiCheckLine
} from 'react-icons/ri';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import Portal from '../components/Portal';
import rehypeRaw from 'rehype-raw';
import { databases } from '../config/database';
import { useAuth } from '../context/AuthContext';
import { Query } from 'appwrite';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const chatEndRef = useRef(null);
  const { user } = useAuth();
  const [pathsData, setPathsData] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const preprocessGeminiResponse = (content) => {
    // Ensure code blocks are properly formatted
    return content.replace(/```([\s\S]*?)```/g, (match, code) => {
      const lines = code.trim().split('\n');
      let language = 'plaintext';
      
      // Check if first line contains language specification
      if (lines[0] && !lines[0].includes('=') && !lines[0].includes('{')) {
        language = lines[0].trim();
        lines.shift();
      }
      
      return `\`\`\`${language}\n${lines.join('\n')}\`\`\``;
    });
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setIsTyping(true);

    try {
      // Create enhanced context with learning paths
      const context = {
        paths: pathsData?.map(path => ({
          name: path.careerName,
          modules: JSON.parse(path.modules),
          progress: path.progress,
          completedModules: JSON.parse(path.completedModules)
        })) || [],
        currentGoals: pathsData?.[0]?.careerName || "career development",
      };

      const response = await generateChatResponse(input, context);
      const formattedResponse = preprocessGeminiResponse(response);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: formattedResponse 
      }]);
      
      // Generate new suggestions based on the conversation
      generateSuggestions(pathsData);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    fetchLearningPaths();
  }, [user]);

  const fetchLearningPaths = async () => {
    if (!user) return;
    
    try {
      const response = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        import.meta.env.VITE_CAREER_PATHS_COLLECTION_ID,
        [Query.equal("userID", user.$id)]
      );
      
      setPathsData(response.documents);
      generateSuggestions(response.documents);
    } catch (error) {
      console.error("Error fetching learning paths:", error);
    }
  };

  const generateSuggestions = (paths) => {
    if (!paths) return;
    
    const suggestions = [
      "Help me understand advanced concepts in " + (paths[0]?.careerName || "my career path"),
      "What should I focus on next in my learning journey?",
      "Can you explain " + (paths[0]?.modules ? JSON.parse(paths[0].modules)[0] : "the fundamentals"),
      "Give me practice exercises for " + (paths[0]?.careerName || "my current module"),
    ];
    
    setSuggestions(suggestions);
  };

  const handlePurgeChat = () => {
    const confirmPurge = window.confirm("Are you sure you want to clear the chat history?");
    if (confirmPurge) {
      setMessages([{ role: 'assistant', content: "👋 Hi! I'm your AI learning assistant. I have access to your learning paths and can help you with specific topics or general guidance. What would you like to discuss?" }]);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatMessage = (content) => {
    return (
      <div className={`prose prose-sm sm:prose-base max-w-none break-words ${
        messages.find(m => m.content === content)?.role === 'user' 
          ? 'prose-invert' 
          : ''
      }`}>
        <ReactMarkdown
          rehypePlugins={[rehypeRaw]}
          components={{
            code({ node, inline, children, ...props }) {
              const match = /language-(\w+)/.exec(props.className || '');
              const code = String(children).replace(/\n$/, '');
              
              return !inline && match ? (
                <div className="my-2 sm:my-4 rounded-lg overflow-hidden bg-gray-800">
                  <div className="px-2 sm:px-4 py-1.5 sm:py-2 flex justify-between items-center border-b border-gray-700">
                    <span className="text-[10px] sm:text-xs text-gray-400 uppercase">{match[1]}</span>
                    <button
                      onClick={() => handleCopyCode(code)}
                      className="text-gray-400 hover:text-gray-200 transition-colors text-xs sm:text-sm flex items-center gap-1"
                    >
                      {copiedCode === code ? (
                        <>
                          <RiCheckLine className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Copied!</span>
                        </>
                      ) : (
                        <>
                          <RiFileCopyLine className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      customStyle={{
                        margin: 0,
                        padding: '0.5rem',
                        background: 'transparent',
                        fontSize: '0.8rem',
                        lineHeight: '1.2'
                      }}
                      wrapLines={true}
                      wrapLongLines={true}
                    >
                      {code}
                    </SyntaxHighlighter>
                  </div>
                </div>
              ) : (
                <code className="px-1.5 py-0.5 text-sm rounded bg-gray-100 text-gray-800 break-all" {...props}>
                  {children}
                </code>
              );
            },
            p: ({ children }) => <p className="mb-2 sm:mb-4 last:mb-0 text-sm sm:text-base">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 sm:mb-4 last:mb-0 text-sm sm:text-base">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 sm:mb-4 last:mb-0 text-sm sm:text-base">{children}</ol>,
            li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>,
            pre: ({ children }) => <pre className="overflow-x-auto max-w-full">{children}</pre>
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  const renderSuggestions = () => (
    <div className="flex flex-wrap gap-2 px-4 py-2">
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={index}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-sm transition-colors"
          onClick={() => {
            setInput(suggestion);
            // Automatically send after a short delay
            setTimeout(() => handleSend(), 100);
          }}
        >
          {suggestion}
        </motion.button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-0 sm:p-6">
      <div className="h-[100dvh] sm:h-auto max-w-4xl mx-auto bg-white/80 backdrop-blur-sm rounded-none sm:rounded-2xl shadow-xl border-0 sm:border border-blue-100/30 overflow-hidden flex flex-col">
        {/* Enhanced Header */}
        <div className="p-4 sm:p-6 border-b border-purple-100/30 bg-white/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl"
                >
                  <RiRobot2Line className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </motion.div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  AI Learning Assistant
                </h1>
                {pathsData && (
                  <p className="text-sm text-gray-600 mt-1">
                    Supporting your journey in {pathsData[0]?.careerName || "learning"}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                title="New Chat"
              >
                <RiRefreshLine className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePurgeChat}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Clear chat"
              >
                <RiDeleteBin6Line className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Enhanced Chat Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex items-start gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className={`flex-shrink-0 p-1.5 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-500' 
                        : 'bg-gradient-to-br from-gray-100 to-gray-200'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <RiUserLine className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    ) : (
                      <RiRobot2Line className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                    )}
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    className={`max-w-[88%] sm:max-w-[85%] p-2 sm:p-4 rounded-xl shadow-sm ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ml-auto rounded-tr-none'
                        : 'bg-white text-gray-800 rounded-tl-none'
                    }`}
                  >
                    {formatMessage(message.content)}
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-gray-500"
              >
                <div className="flex items-center gap-1">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                    className="w-2 h-2 bg-blue-500 rounded-full"
                  />
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.5, delay: 0.2, repeat: Infinity, repeatType: "reverse" }}
                    className="w-2 h-2 bg-blue-500 rounded-full"
                  />
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.5, delay: 0.3, repeat: Infinity, repeatType: "reverse" }}
                    className="w-2 h-2 bg-blue-500 rounded-full"
                  />
                </div>
                <span className="text-sm">AI is thinking...</span>
              </motion.div>
            )}
          </div>
          {/* Show suggestions above input */}
          {!isTyping && renderSuggestions()}
        </div>

        {/* Enhanced Input Area */}
        <div className="border-t border-purple-100/30 bg-white/50 p-4">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 bg-white rounded-xl shadow-sm">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your learning journey..."
                className="w-full p-3 rounded-xl border border-blue-100 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 outline-none resize-none bg-transparent"
                rows="1"
                style={{
                  minHeight: '44px',
                  maxHeight: '120px',
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl disabled:opacity-50 shadow-lg hover:shadow-blue-500/20"
            >
              <RiSendPlaneFill className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
