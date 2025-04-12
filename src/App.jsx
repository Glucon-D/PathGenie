import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import "./App.css";
import { useAuth } from './context/AuthContext';

const App = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const showSidebar = isAuthenticated && ![
    "/login",
    "/signup",
    "/",
    "/home",
    "/reset-password",
  ].includes(location.pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Sidebar starts closed

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
      {/* Navbar */}
      <Navbar
        isDashboard={showSidebar}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="flex flex-1 pt-16 relative">
        {/* Sidebar */}
        {showSidebar && (
          <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        )}

        {/* Main Content */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ${
            showSidebar && isSidebarOpen ? "md:ml-64" : ""
          }`}
        >
          <div className="flex-1 p-6">{children}</div>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default App;
