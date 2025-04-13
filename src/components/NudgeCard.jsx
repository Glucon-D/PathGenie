import React from 'react';
import { motion } from 'framer-motion';
import { RiLightbulbLine, RiRocketLine, RiAwardLine, RiStarLine } from 'react-icons/ri';

/**
 * Enhanced NudgeCard Component
 * 
 * A visually appealing card component to display AI suggestions/nudges to the user.
 * 
 * @param {Object} props
 * @param {string} props.text - The suggestion text to display
 * @param {string} props.type - Optional: Type of nudge ("tip", "recommendation", "challenge", defaults to "tip")
 * @param {string} props.icon - Optional: Icon type ("bulb", "rocket", "star", defaults based on type)
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
    if (icon === 'rocket') return <RiRocketLine className="text-xl sm:text-2xl" />;
    if (icon === 'bulb') return <RiLightbulbLine className="text-xl sm:text-2xl" />;
    if (icon === 'star') return <RiStarLine className="text-xl sm:text-2xl" />;
    
    // Default icons based on type
    if (type === 'challenge') return <RiRocketLine className="text-xl sm:text-2xl" />;
    if (type === 'recommendation') return <RiAwardLine className="text-xl sm:text-2xl" />;
    return <RiLightbulbLine className="text-xl sm:text-2xl" />;
  };

  // Get background gradient and text color based on type
  const getStyles = () => {
    switch(type) {
      case 'recommendation':
        return {
          gradient: 'from-indigo-500/10 to-purple-500/10',
          iconBg: 'bg-indigo-100',
          iconColor: 'text-indigo-600',
          borderColor: 'border-l-indigo-500',
          hoverBg: 'hover:bg-indigo-50',
          buttonBg: 'bg-indigo-100 hover:bg-indigo-200',
          buttonText: 'text-indigo-700'
        };
      case 'challenge':
        return {
          gradient: 'from-purple-500/10 to-pink-500/10',
          iconBg: 'bg-purple-100',
          iconColor: 'text-purple-600',
          borderColor: 'border-l-purple-500',
          hoverBg: 'hover:bg-purple-50',
          buttonBg: 'bg-purple-100 hover:bg-purple-200',
          buttonText: 'text-purple-700'
        };
      default:
        return {
          gradient: 'from-blue-500/10 to-sky-500/10',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          borderColor: 'border-l-blue-500',
          hoverBg: 'hover:bg-blue-50',
          buttonBg: 'bg-blue-100 hover:bg-blue-200',
          buttonText: 'text-blue-700'
        };
    }
  };

  // Get title based on type
  const getTitle = () => {
    switch(type) {
      case 'recommendation': return 'Recommendation';
      case 'challenge': return 'Challenge';
      default: return 'AI Tip';
    }
  };

  const styles = getStyles();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
      transition={{ duration: 0.2 }}
      className={`
        ${elevated 
          ? `bg-white shadow-md bg-gradient-to-br ${styles.gradient}` 
          : 'bg-white/80'
        } 
        p-4 rounded-xl 
        ${elevated 
          ? 'border border-white/80' 
          : `border-l-4 ${styles.borderColor}`
        }
        transition-all duration-200 ${styles.hoverBg}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`${styles.iconBg} p-2 sm:p-3 rounded-lg ${styles.iconColor} flex-shrink-0`}>
          {getIcon()}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center">
            <h3 className={`font-medium ${styles.iconColor}`}>{getTitle()}</h3>
            <motion.span 
              className={`ml-2 inline-block w-1.5 h-1.5 rounded-full ${styles.iconColor} opacity-75`}
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          
          <p className="text-sm text-gray-700">{text}</p>
          
          {onAction && actionText && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAction}
              className={`mt-2 text-sm py-1.5 px-3 ${styles.buttonBg} ${styles.buttonText} rounded-lg transition-all duration-200 flex items-center gap-1.5 font-medium`}
            >
              {actionText}
              <motion.span 
                animate={{ x: [0, 3, 0] }} 
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-xs"
              >
                →
              </motion.span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default NudgeCard;