import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { getLearningPaths, getUserProgress } from "../config/database";
import { useAuth } from "../context/AuthContext";

const Progress = () => {
  const { user, loading } = useAuth();
  const [paths, setPaths] = useState([]);
  const [quizScores, setQuizScores] = useState([]);
  const [flashcardCount, setFlashcardCount] = useState(0); // State for flashcard count

  useEffect(() => {
    if (user) {
      fetchPaths();
      fetchQuizStats();
    }
  }, [user]);

  const fetchPaths = async () => {
    try {
      const response = await getLearningPaths(user.$id);
      setPaths(response.documents);
    } catch (error) {
      console.error("Error fetching paths:", error);
    }
  };

  const fetchQuizStats = async () => {
    try {
      const response = await getUserProgress(user.$id);
      setQuizScores(response.quizScores.slice(-5)); // Get last 5 quiz stats
      setFlashcardCount(response.flashcardCount || 0); // Set flashcard count
    } catch (error) {
      console.error("Error fetching quiz stats:", error);
    }
  };

  if (loading) return <p className="text-center text-blue-600">Loading...</p>;
  if (!user)
    return <p className="text-center text-gray-500">No user data available.</p>;

  // Transforming data for learning progress chart
  const chartData = paths.map((path) => ({
    topic: path.topicName,
    progress: path.progress,
  }));

  // Transforming data for quiz accuracy chart
  const quizChartData = quizScores.map((quiz) => ({
    topic: quiz.topic,
    accuracy: parseFloat(quiz.accuracy),
  }));

  return (
    <motion.div
      className="flex flex-col items-center pb-14 p-6 bg-white min-h-screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h1 className="text-3xl text-center font-bold mb-8 bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
        Learning & Quiz Progress
      </h1>

      {/* Flashcard Count */}
      <motion.div
        className="w-full max-w-4xl bg-gray-100 p-4 md:p-7 rounded-xl shadow-md mb-8"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-lg md:text-2xl font-semibold flex items-center justify-center gap-2">
          <span>📚</span> Flashcards Created
        </h2>
        <p className="text-xl md:text-4xl text-center md:font-extrabold md:mt-2 drop-shadow-lg">
          {flashcardCount}
        </p>
      </motion.div>

      {chartData.length > 0 ? (
        <motion.div
          className="w-full max-w-4xl bg-gray-100 p-4 rounded-xl shadow-md mb-8"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-semibold text-blue-700 mb-4">
            Learning Path Progress
          </h2>
          <div className="h-[200px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                <XAxis dataKey="topic" tick={{ fill: "#2563EB" }} />
                <YAxis tick={{ fill: "#2563EB" }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="progress"
                  stroke="#2563EB"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      ) : (
        <p className="text-gray-500">No learning progress data available.</p>
      )}

      {quizChartData.length > 0 ? (
        <motion.div
          className="w-full max-w-4xl bg-gray-100 p-4 rounded-xl shadow-md"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-semibold text-blue-700 mb-4">
            Quiz Accuracy %(Last 5)
          </h2>
          <div className="h-[200px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quizChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                <XAxis dataKey="topic" tick={{ fill: "#2563EB" }} />
                <YAxis tick={{ fill: "#2563EB" }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="accuracy" fill="#2563EB" barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      ) : (
        <p className="text-gray-500">No quiz data available.</p>
      )}
    </motion.div>
  );
};

export default Progress;
