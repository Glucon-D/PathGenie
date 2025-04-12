import React from 'react';
import { motion } from 'framer-motion';
import { RiLightbulbLine, RiRocketLine } from 'react-icons/ri';

/**
 * NudgeCard Component
 * 
 * A reusable card component to display AI suggestions/nudges to the user.
 * 
 * @param {Object} props
 * @param {string} props.text - The suggestion text to display
 * @param {string} props.type - Optional: Type of nudge ("tip", "recommendation", "challenge", defaults to "tip")
 * @param {string} props.icon - Optional: Icon type ("bulb" or "rocket", defaults based on type)
 * @param {function} props.onAction - Optional: Callback function when action button is clicked
 * @param {string} props.actionText - Optional: Text for the action button
 * @param {boolean} props.elevated - Optional: Whether to use elevated/enhanced styling
 */
const NudgeCard = ({ 
  text, 
  type = 'tip', 
  icon,
  onAction,
  actionText,
  elevated = false 
}) => {
  // Determine which icon to show based on type or explicit icon prop
  const getIcon = () => {
    if (icon === 'rocket') return <RiRocketLine className="text-xl text-blue-600" />;
    if (icon === 'bulb') return <RiLightbulbLine className="text-xl text-blue-600" />;
    
    // Default icons based on type
    if (type === 'recommendation' || type === 'challenge') {
      return <RiRocketLine className="text-xl text-blue-600" />;
    }
    return <RiLightbulbLine className="text-xl text-blue-600" />;
  };

  // Get title based on type
  const getTitle = () => {
    switch(type) {
      case 'recommendation':
        return 'Recommendation';
      case 'challenge':
        return 'Challenge';
      default:
        return 'AI Tip';
    }
  };

  // Get border color based on type
  const getBorderColor = () => {
    switch(type) {
      case 'recommendation':
        return 'border-indigo-500';
      case 'challenge':
        return 'border-purple-500';
      default:
        return 'border-blue-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        ${elevated ? 'bg-white shadow-lg' : 'bg-blue-50'} 
        p-4 rounded-xl 
        ${elevated ? 'border border-blue-100' : `border-l-4 ${getBorderColor()}`}
      `}
    >
      <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
        {getIcon()}
        <span>{getTitle()}</span>
      </div>
      
      <p className="text-sm text-sky-800">{text}</p>
      
      {onAction && actionText && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onAction}
          className="mt-3 text-sm py-1.5 px-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors inline-flex items-center gap-1"
        >
          {actionText}
        </motion.button>
      )}
    </motion.div>
  );
};

export default NudgeCard;