import React from 'react';
import { motion } from 'framer-motion';

const QuizCard = ({ 
  question, 
  answers, 
  selectedAnswers, 
  onAnswerSelect, 
  questionType, 
  showResults, 
  correctAnswer,
  userAnswers,
  explanation 
}) => {
  const isCorrect = (answer) => {
    if (!showResults) return false;
    return Array.isArray(correctAnswer) 
      ? correctAnswer.includes(answer)
      : answer === correctAnswer;
  };

  const isSelected = (answer) => selectedAnswers?.includes(answer);

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6">
        <span className="text-xs font-medium text-blue-500 bg-blue-50 px-3 py-1 rounded-full">
          {questionType === 'multiple' ? 'Multiple Choice' : 'Single Choice'}
        </span>
        <h3 className="text-xl font-semibold mt-3 text-gray-800">
          {question}
        </h3>
      </div>

      <div className="space-y-3">
        {answers.map((answer, index) => (
          <motion.button
            key={index}
            onClick={() => !showResults && onAnswerSelect(answer)}
            className={`w-full text-left p-4 rounded-xl transition-all relative
              ${isSelected(answer) 
                ? showResults
                  ? isCorrect(answer)
                    ? 'bg-green-100 border-2 border-green-500 text-green-700'
                    : 'bg-red-100 border-2 border-red-500 text-red-700'
                  : 'bg-blue-100 border-2 border-blue-500 text-blue-700'
                : showResults && isCorrect(answer)
                  ? 'bg-green-50 border-2 border-green-300 text-green-600'
                  : 'bg-gray-50 border-2 border-transparent hover:border-blue-300'
              }`}
            whileHover={{ scale: showResults ? 1 : 1.01 }}
            whileTap={{ scale: showResults ? 1 : 0.99 }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm
                ${getOptionStyle(answer, isSelected(answer), isCorrect(answer), showResults)}`}
              >
                {String.fromCharCode(65 + index)}
              </div>
              <span className="font-medium">{answer}</span>
              {showResults && (
                <div className="absolute right-4 flex items-center gap-2">
                  {isSelected(answer) && (
                    <span className="text-sm">Your answer</span>
                  )}
                  {isCorrect(answer) && (
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {showResults && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200"
        >
          <h4 className="font-medium text-gray-700 mb-2">Explanation:</h4>
          <p className="text-gray-600">{explanation}</p>
        </motion.div>
      )}

      {questionType === 'multiple' && (
        <p className="text-sm text-gray-500 mt-4 italic">
          Select all that apply
        </p>
      )}
    </motion.div>
  );
};

// Helper function for option styling
const getOptionStyle = (answer, isSelected, isCorrect, showResults) => {
  if (!showResults) {
    return isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600';
  }

  if (isSelected && isCorrect) return 'bg-green-500 text-white';
  if (isSelected && !isCorrect) return 'bg-red-500 text-white';
  if (!isSelected && isCorrect) return 'bg-green-200 text-green-700';
  return 'bg-gray-200 text-gray-600';
};

export default QuizCard;
