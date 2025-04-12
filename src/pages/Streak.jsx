import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format, differenceInDays, parseISO } from "date-fns";
import { RiFireFill, RiCalendarLine, RiTrophyLine } from "react-icons/ri";
import { motion } from "framer-motion";

const QuizStreak = ({ quizScores }) => {
  const [quizDates, setQuizDates] = useState(new Set());
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  useEffect(() => {
    if (quizScores.length > 0) {
      // Extract & format quiz dates
      const dates = quizScores.map((q) =>
        format(parseISO(q.date), "yyyy-MM-dd")
      );
      setQuizDates(new Set(dates));

      // Calculate streaks
      calculateStreaks(dates);
    }
  }, [quizScores]);

  const calculateStreaks = (dates) => {
    if (dates.length === 0) return;

    // Sort dates & remove duplicates
    const sortedDates = [...new Set(dates)].sort();

    let tempStreak = 1,
      maxStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const diff = differenceInDays(
        parseISO(sortedDates[i]),
        parseISO(sortedDates[i - 1])
      );

      if (diff === 1) {
        tempStreak++; // Increase streak if consecutive
      } else if (diff > 1) {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1; // Reset streak if there's a gap
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak);

    // Calculate current streak
    const today = format(new Date(), "yyyy-MM-dd");
    const lastQuizDate = sortedDates[sortedDates.length - 1];
    const daysSinceLastQuiz = differenceInDays(
      parseISO(today),
      parseISO(lastQuizDate)
    );

    setCurrentStreak(daysSinceLastQuiz <= 1 ? tempStreak : 0);
    setLongestStreak(maxStreak);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 md:p-8 shadow-xl border border-blue-100/30 relative overflow-hidden"
    >
      {/* Background gradient decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 pointer-events-none" />

      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Learning Streak
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            Track your daily learning progress
          </p>
        </div>

        {/* Streak Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div 
            whileHover={{ y: -2 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <RiFireFill className="text-2xl text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Current Streak</p>
                <p className="text-2xl font-bold text-blue-700">{currentStreak} Days</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -2 }}
            className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl border border-blue-100"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <RiTrophyLine className="text-2xl text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-indigo-600 font-medium">Best Streak</p>
                <p className="text-2xl font-bold text-indigo-700">{longestStreak} Days</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Calendar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="calendar-wrapper bg-white rounded-xl p-4 shadow-lg border border-blue-100"
        >
          <Calendar
            className="custom-calendar"
            tileClassName={({ date }) => {
              const formattedDate = format(date, "yyyy-MM-dd");
              return quizDates.has(formattedDate)
                ? "quiz-date"
                : "";
            }}
            tileContent={({ date }) => {
              const formattedDate = format(date, "yyyy-MM-dd");
              return quizDates.has(formattedDate) ? (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex justify-center items-center"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <RiFireFill className="text-blue-600" />
                  </div>
                </motion.div>
              ) : null;
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

// Add these styles to your global CSS
const styles = `
.custom-calendar {
  width: 100% !important;
  border: none !important;
  background: transparent !important;
  font-family: inherit !important;
}

.custom-calendar .react-calendar__tile {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  position: relative;
  padding: 0.75rem !important;
}

.custom-calendar .react-calendar__month-view__weekdays {
  text-transform: uppercase;
  font-weight: 600;
  color: #3b82f6;
  font-size: 0.75rem;
}

.custom-calendar .react-calendar__tile--now {
  background: #dbeafe !important;
  color: #2563eb;
}

.custom-calendar .react-calendar__tile:enabled:hover,
.custom-calendar .react-calendar__tile:enabled:focus {
  background-color: #eff6ff !important;
}

.custom-calendar .react-calendar__tile--active {
  background: #bfdbfe !important;
  color: #2563eb !important;
}

.quiz-date {
  color: #2563eb;
  font-weight: 600;
}
`;

export default QuizStreak;
