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

const INITIAL_QUESTIONS = [
  "What topic would you like to discuss today?",
  "What's your current knowledge level in this topic? (Beginner/Intermediate/Advanced)",
  "What specific aspects would you like to focus on?"
];

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [context, setContext] = useState({});
  const [setupComplete, setSetupComplete] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const chatEndRef = useRef(null);

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

    try {
      if (!setupComplete) {
        // Handle setup questions
        setContext(prev => ({
          ...prev,
          [INITIAL_QUESTIONS[currentQuestion]]: input
        }));

        if (currentQuestion < INITIAL_QUESTIONS.length - 1) {
          setCurrentQuestion(prev => prev + 1);
          const nextQuestion = { role: 'assistant', content: INITIAL_QUESTIONS[currentQuestion + 1] };
          setMessages(prev => [...prev, nextQuestion]);
        } else {
          setSetupComplete(true);
          // Generate initial context-aware response
          const response = await generateChatResponse(input, context);
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        }
      } else {
        // Normal chat interaction
        const response = await generateChatResponse(input, context);
        // Pre-process the response before adding to messages
        const formattedResponse = preprocessGeminiResponse(response);
        setMessages(prev => [...prev, { role: 'assistant', content: formattedResponse }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    // Initialize chat with first question
    setMessages([{ role: 'assistant', content: INITIAL_QUESTIONS[0] }]);
  }, []);

  const handlePurgeChat = () => {
    const confirmPurge = window.confirm("Are you sure you want to clear the chat history?");
    if (confirmPurge) {
      setMessages([{ role: 'assistant', content: INITIAL_QUESTIONS[0] }]);
      setCurrentQuestion(0);
      setContext({});
      setSetupComplete(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-0 sm:p-6">
      <div className="h-[100dvh] sm:h-auto max-w-4xl mx-auto bg-white/80 backdrop-blur-sm rounded-none sm:rounded-2xl shadow-xl border-0 sm:border border-blue-100/30 overflow-hidden flex flex-col">
        {/* Enhanced Header with Topic Info */}
        <div className="p-2 sm:p-6 border-b border-purple-100/30 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg sm:rounded-xl">
                  <RiChat1Line className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                {setupComplete && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  AI Chat Assistant
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {setupComplete ? (
                    <>
                      <span className="px-2 py-0.5 sm:py-1 bg-purple-100 rounded-full text-xs text-purple-600 max-w-[150px] sm:max-w-none truncate">
                        {context['What topic would you like to discuss today?']}
                      </span>
                      <span className="px-2 py-0.5 sm:py-1 bg-blue-100 rounded-full text-xs text-blue-600">
                        {context["What's your current knowledge level in this topic? (Beginner/Intermediate/Advanced)"]}
                      </span>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <RiSettings4Line className="animate-spin text-purple-500" />
                      Setting up...
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-auto">
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

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-6 space-y-3 sm:space-y-6">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex items-start gap-2 sm:gap-4 ${
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
          
          {/* Enhanced Loading Animation */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="p-2 bg-blue-100 rounded-xl">
                <RiTimeLine className="w-5 h-5 text-blue-600 animate-spin" />
              </div>
              <div className="flex items-center gap-1">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-2 bg-purple-600 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  className="w-2 h-2 bg-purple-600 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  className="w-2 h-2 bg-purple-600 rounded-full"
                />
              </div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Enhanced Input Area - Fixed at bottom on mobile */}
        <div className="p-2 sm:p-4 border-t border-purple-100/30 bg-white/50 sticky bottom-0 left-0 right-0">
          <div className="flex items-end gap-2 sm:gap-4 max-w-full">
            <div className="flex-1 bg-white rounded-xl shadow-sm">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={setupComplete ? "Type your message..." : "Type your answer..."}
                className="w-full p-2.5 sm:p-4 rounded-xl border border-purple-100 focus:border-purple-300 focus:ring-2 focus:ring-purple-200 outline-none resize-none bg-transparent text-sm sm:text-base"
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
              className="p-2.5 sm:p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl disabled:opacity-50 shadow-lg hover:shadow-blue-500/20 flex-shrink-0"
            >
              <RiSendPlaneFill className="w-5 h-5" />
            </motion.button>
          </div>
          {setupComplete && (
            <p className="text-xs text-gray-500 mt-2 px-2">
              Tip: Use ```language for code blocks
            </p>
          )}
        </div>

        {/* Mobile Action Menu Portal */}
        {isMobileMenuOpen && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4"
                onClick={e => e.stopPropagation()}
              >
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      window.location.reload();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full p-3 flex items-center gap-3 text-purple-600 hover:bg-purple-50 rounded-xl"
                  >
                    <RiRefreshLine className="w-5 h-5" />
                    <span>New Chat</span>
                  </button>
                  <button
                    onClick={() => {
                      handlePurgeChat();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full p-3 flex items-center gap-3 text-red-500 hover:bg-red-50 rounded-xl"
                  >
                    <RiDeleteBin6Line className="w-5 h-5" />
                    <span>Clear Chat</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </div>
    </div>
  );
};

export default Chat;
