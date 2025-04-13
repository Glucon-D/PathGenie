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
  RiQuestionLine,
  RiPlayCircleLine,
  RiYoutubeLine,
  RiRefreshLine
} from "react-icons/ri";
import { account } from "../config/appwrite";
import { databases } from "../config/database";
import toast from "react-hot-toast";
import { generateQuiz } from "../config/gemini";
import axios from 'axios';

// Add cache management at the top
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const YT_CACHE_KEY = 'yt_cache';
const SEARCH_CACHE_KEY = 'search_cache';

const getCache = (key, searchTerm) => {
  try {
    const cached = localStorage.getItem(`${key}_${searchTerm}`);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(`${key}_${searchTerm}`);
      return null;
    }
    return data;
  } catch (error) {
    return null;
  }
};

const setCache = (key, searchTerm, data) => {
  try {
    localStorage.setItem(`${key}_${searchTerm}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Cache set error:', error);
  }
};

const extractCoreTopic = (pathName) => {
  // Remove possessive names and common path words
  return pathName
    .replace(/^[^']+['']s\s+/i, '') // Remove possessive names like "Ayush's"
    .replace(/\b(path|domination|bridge|journey|guide|mastery)\b/gi, '') // Remove common path words
    .trim();
};

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
  const [youtubeContent, setYoutubeContent] = useState([]);
  const [loadingYoutube, setLoadingYoutube] = useState(false);
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [youtubePlaylists, setYoutubePlaylists] = useState([]);

  const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const CAREER_PATHS_COLLECTION_ID = import.meta.env.VITE_CAREER_PATHS_COLLECTION_ID;
  const YT_API_KEY = import.meta.env.VITE_YT_API_KEY;
  const SERPER_API_KEY = import.meta.env.VITE_SERPER_API_KEY;

  useEffect(() => {
    fetchCareerPath();
  }, [id]);

  useEffect(() => {
    if (careerPath?.careerName) {
      const cachedData = getCache(SEARCH_CACHE_KEY, careerPath.careerName);
      if (cachedData) {
        console.log('Using cached data');
        setYoutubeVideos(cachedData);
        return;
      }
      fetchYoutubeContent(careerPath.careerName);
    }
  }, [careerPath?.careerName]);

  const fetchCareerPath = async () => {
    try {
      setLoading(true);
      const response = await databases.getDocument(
        DATABASE_ID,
        CAREER_PATHS_COLLECTION_ID,
        id
      );
      let modules = [];
      try {
        modules = JSON.parse(response.modules || "[]");
        if (modules.length > 0 && typeof modules[0] === 'string') {
          modules = modules.map((module) => {
            if (typeof module === 'string') {
              return {
                title: module,
                description: `Learn more about ${module.split(':').pop().trim()}`,
                estimatedTime: "20-30 minutes",
                content: `This module will introduce you to ${module.split(':').pop().trim()}`
              };
            }
            return module;
          });
        }
      } catch (err) {
        modules = [];
      }
      const parsedPath = {
        ...response,
        modules: modules,
        completedModules: JSON.parse(response.completedModules || "[]")
      };
      setCareerPath(parsedPath);
      setCompletedModules(parsedPath.completedModules);
      const firstIncompleteIndex = parsedPath.modules.findIndex(
        (_, index) => !parsedPath.completedModules.includes(index.toString())
      );
      setSelectedModuleIndex(firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0);
      
      // Fetch YouTube videos after setting career path
      try {
        await fetchYoutubeContent(parsedPath.careerName);
      } catch (youtubeError) {
        console.error('YouTube fetch error:', youtubeError);
        // Don't fail the entire career path load if YouTube fails
      }
    } catch (error) {
      setError("Failed to load career path");
    } finally {
      setLoading(false);
    }
  };

  const handleModuleClick = (index) => {
    setSelectedModuleIndex(index);
    setQuizData(null);
  };

  const handleViewModule = (index) => {
    navigate(`/learning-path/${id}/module/${index}`);
  };

  const handleMarkComplete = async () => {
    if (selectedModuleIndex === null) return;
    try {
      const moduleIdStr = selectedModuleIndex.toString();
      const updatedCompletedModules = completedModules.includes(moduleIdStr)
        ? completedModules
        : [...completedModules, moduleIdStr];

      const newProgress = Math.round(
        (updatedCompletedModules.length / careerPath.modules.length) * 100
      );

      await databases.updateDocument(
        DATABASE_ID,
        CAREER_PATHS_COLLECTION_ID,
        id,
        {
          completedModules: JSON.stringify(updatedCompletedModules),
          progress: newProgress
        }
      );

      setCompletedModules(updatedCompletedModules);
      setCareerPath({
        ...careerPath,
        completedModules: updatedCompletedModules,
        progress: newProgress
      });

      toast.success("Module marked as complete!");

      if (selectedModuleIndex < careerPath.modules.length - 1) {
        setSelectedModuleIndex(selectedModuleIndex + 1);
      }
    } catch (error) {
      toast.error("Failed to mark module as complete");
    }
  };

  const handleRedirectToQuiz = () => {
    if (!careerPath?.modules[selectedModuleIndex]) return;
    
    const moduleTitle = careerPath.modules[selectedModuleIndex].title;
    
    // Navigate to the quiz page with path ID and module index as URL parameters
    navigate(`/quiz`);
  };

  const fetchYoutubeContent = async (searchTerm) => {
    if (!searchTerm || typeof searchTerm !== 'string') return;
    
    try {
      setLoadingYoutube(true);
      const cleanTopic = searchTerm
        .replace(/'s/g, '')
        .replace(/Path/g, '')
        .replace(/Domination/g, '')
        .split(' ')
        .filter(word => 
          !['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'].includes(word.toLowerCase())
        )
        .join(' ');

      const searchConfig = {
        method: 'post',
        url: 'https://google.serper.dev/search',
        headers: { 
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        data: {
          q: `${cleanTopic} programming tutorial course youtube`,
          num: 3,
          type: "videos"
        }
      };

      const response = await axios(searchConfig);
      const videos = response.data?.videos || [];
      
      // Updated video formatting with proper thumbnail handling
      const formattedVideos = videos.map(video => ({
        id: { videoId: video.link.split('v=')[1]?.split('&')[0] || '' },
        snippet: {
          title: video.title,
          channelTitle: video.channel || 'YouTube Channel',
          thumbnails: {
            high: { 
              url: video.thumbnail || `https://i.ytimg.com/vi/${video.link.split('v=')[1]?.split('&')[0]}/hqdefault.jpg`
            }
          }
        }
      }));

      // Filter out any videos without valid IDs
      const validVideos = formattedVideos.filter(video => 
        video.id.videoId && 
        video.id.videoId.length > 0 &&
        video.snippet.thumbnails.high.url
      );

      setYoutubeVideos(validVideos.slice(0, 3));
      console.log('Formatted videos:', validVideos); // Debug log

    } catch (error) {
      console.error('Failed to fetch video content:', error);
      setYoutubeVideos([]);
    } finally {
      setLoadingYoutube(false);
    }
  };

  const YoutubeSection = () => (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-blue-100/30">
      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
        <RiYoutubeLine className="text-red-500" />
        Related Tutorials
      </h3>

      {loadingYoutube ? (
        <div className="flex justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-3 border-red-100 border-t-red-500 rounded-full"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {youtubeVideos.map((video) => (
            <motion.a
              key={video.id.videoId}
              href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative rounded-lg overflow-hidden aspect-video bg-gray-100">
                <img
                  src={video.snippet.thumbnails.high.url}
                  alt={video.snippet.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <RiPlayCircleLine className="w-12 h-12 text-white" />
                </div>
              </div>
              <h4 className="mt-2 text-sm font-medium text-gray-800 line-clamp-2">
                {video.snippet.title}
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                {video.snippet.channelTitle}
              </p>
            </motion.a>
          ))}
          {youtubeVideos.length === 0 && (
            <div className="col-span-3 text-center py-4">
              <p className="text-gray-500">No related tutorials found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

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

        {/* YouTube Section */}
        <YoutubeSection />

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
                  className={`p-3 mb-2 rounded-lg cursor-pointer transition-all ${selectedModuleIndex === index
                      ? "bg-blue-50 border-l-4 border-blue-500"
                      : "hover:bg-blue-50"
                    }`}
                  onClick={() => handleModuleClick(index)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${completedModules.includes(index.toString())
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
                      <h3 className="text-sm font-medium text-gray-900 whitespace-normal break-words">
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
                    <div className="flex gap-2">
                      {/* View Full Content Button */}
                      <button
                        onClick={() => handleViewModule(selectedModuleIndex)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                      >
                        <span>View Content</span>
                        <RiArrowRightLine />
                      </button>

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

                      <div className="mt-6 flex items-center justify-center">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleViewModule(selectedModuleIndex)}
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                        >
                          <span>View Detailed Content</span>
                          <RiArrowRightLine />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quiz Section */}
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-blue-100/30">
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <RiQuestionLine className="text-blue-500" />
                    Knowledge Check
                  </h3>

                  <div className="text-center py-4">
                    <p className="text-gray-600 mb-4">Test your knowledge of this module with a quick quiz.</p>
                    <button
                      onClick={handleRedirectToQuiz}
                      className="px-4 py-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                    >
                      <span>Take Quiz</span>
                      <RiArrowRightLine />
                    </button>
                  </div>

                  {/* Remove the loading and quiz data sections since we're redirecting instead */}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between">
                  <button
                    onClick={() => {
                      if (selectedModuleIndex > 0) {
                        handleModuleClick(selectedModuleIndex - 1);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${selectedModuleIndex > 0
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
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${selectedModuleIndex < careerPath.modules.length - 1
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
