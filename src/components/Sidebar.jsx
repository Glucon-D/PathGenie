import React from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  RiDashboardLine,
  RiRocketLine,
  RiBookLine,
  RiQuestionLine,
  RiLineChartLine,
  RiSettings4Line,
  RiMessage3Line,
  RiCloseLine,
  RiMenuLine,
  RiAwardLine
} from 'react-icons/ri';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { 
      icon: <RiDashboardLine className="text-xl" />,
      label: "Dashboard",
      path: "/dashboard",
      active: location.pathname === "/dashboard",
    },
    {
      icon: <RiRocketLine className="text-xl" />,
      label: "Learning Paths",
      path: "/learning-path",
      active: location.pathname.includes("learning-path"),
    },
    {
      icon: <RiBookLine className="text-xl" />,
      label: "Flashcards",
      path: "/flashcards",
      active: location.pathname.includes("flashcards"),
    },
    {
      icon: <RiQuestionLine className="text-xl" />,
      label: "Quiz",
      path: "/quiz",
      active: location.pathname.includes("quiz"),
    },
    {
      icon: <RiLineChartLine className="text-xl" />,
      label: "Progress",
      path: "/progress",
      active: location.pathname.includes("progress"),
    },
    {
      icon: <RiAwardLine className="text-xl" />,
      label: "Career Summary",
      path: "/career-summary",
      active: location.pathname.includes("career-summary"),
    },
    {
      icon: <RiMessage3Line className="text-xl" />,
      label: "AI Chat",
      path: "/chat",
      active: location.pathname === "/chat",
    },
    {
      icon: <RiSettings4Line className="text-xl" />,
      label: "Settings",
      path: "/settings",
      active: location.pathname.includes("settings"),
    },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-[999] p-2 rounded-xl bg-white/80 backdrop-blur-sm border border-blue-100/30 shadow-lg md:hidden"
      >
        {isOpen ? <RiCloseLine className="w-6 h-6" /> : <RiMenuLine className="w-6 h-6" />}
      </motion.button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[997] md:hidden"
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={{ x: -250 }}
        animate={{
          x: isOpen ? 0 : -250,
          width: isOpen ? 256 : 0,
        }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="fixed left-0 top-0 z-[998] h-screen bg-white/80 backdrop-blur-md border-r border-blue-100/30 overflow-hidden"
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <motion.div 
            className="p-6 flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center">
              <motion.span 
                className="text-white text-xl font-bold"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                T
              </motion.span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ThinkForge
            </span>
          </motion.div>

          {/* Navigation Items */}
          <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <motion.button
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    navigate(item.path);
                    if (window.innerWidth < 768) setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${item.active 
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg" 
                      : "text-gray-600 hover:bg-blue-50"
                    }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                  {item.active && (
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-white ml-auto"
                      layoutId="activeIndicator"
                    />
                  )}
                </motion.button>
              </motion.div>
            ))}
          </div>

          {/* Bottom Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="p-4 border-t border-blue-100/30"
          >
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50">
              <p className="text-sm text-blue-600 font-medium">Need Help?</p>
              <p className="text-xs text-gray-600 mt-1">Check our documentation or contact support</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;
