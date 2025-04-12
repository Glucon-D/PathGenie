import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  RiArrowRightLine,
  RiPlayCircleLine,
  RiBrainLine,
  RiLightbulbLine,
  RiBarChartBoxLine,
} from "react-icons/ri";
import { useState, useEffect, useRef } from "react";
import { useInView } from "framer-motion";
import IllustrationImage from '../assets/Illustration.jpg'


const AnimatedCounter = ({ target, duration = 4000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const isPlus = target.includes("+");
    const isPercent = target.includes("%");
    const hasK = target.includes("K");

    const rawNumber = parseInt(target.replace(/\D/g, ""), 10);
    const end = hasK ? rawNumber * 1000 : rawNumber;

    const totalSteps = Math.floor(duration / 40);
    const step = Math.max(1, Math.floor(end / totalSteps));

    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 40);

    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  const display = target.includes("K")
    ? `${Math.floor(count / 1000)}K+`
    : target.includes("+")
      ? `${count}+`
      : target.includes("%")
        ? `${count}%`
        : count;

  return <span ref={ref}>{display}</span>;
};

const FaqItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="bg-gray-50 border border-gray-200 rounded-xl p-5 transition-all cursor-pointer hover:bg-gray-100 hover:border-gray-400"
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex justify-between items-center text-gray-800 font-medium">
        {question}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          ▼
        </motion.span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="text-gray-600 mt-3 text-sm leading-relaxed"
          >
            {answer}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

const features = [
  {
    icon: <RiBrainLine className="text-3xl text-white" />,
    title: "AI-Powered Learning",
    description: "Personalized learning paths tailored to your needs.",
    iconBg: "bg-blue-600",
    cardBg: "bg-blue-50",
    borderColor: "border-blue-600",
  },
  {
    icon: <RiLightbulbLine className="text-3xl text-white" />,
    title: "Smart Progress",
    description: "Track your growth with intelligent insights.",
    iconBg: "bg-yellow-500",
    cardBg: "bg-yellow-50",
    borderColor: "border-yellow-500",
  },
  {
    icon: <RiBarChartBoxLine className="text-3xl text-white" />,
    title: "Interactive Practice",
    description: "Hands-on modules with real-time feedback.",
    iconBg: "bg-red-500",
    cardBg: "bg-red-50",
    borderColor: "border-red-500",
  },
];

const stats = [
  { number: "10K+", label: "Active Learners" },
  { number: "50+", label: "Learning Paths" },
  { number: "95%", label: "Success Rate" },
  { number: "24/7", label: "AI Assistance" },
];

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Frontend Dev",
    avatar: "https://randomuser.me/api/portraits/women/1.jpg",
    quote: "PathGenie completely transformed how I learn. The AI recommendations are spot-on!",
  },
  {
    name: "Mike Chen",
    role: "Engineering Student",
    avatar: "https://randomuser.me/api/portraits/men/2.jpg",
    quote: "I love the interactive paths and quizzes — they keep me engaged and motivated.",
  },
  {
    name: "Emily Davis",
    role: "Data Analyst",
    avatar: "https://randomuser.me/api/portraits/women/3.jpg",
    quote: "The smart progress tracking helped me identify and fix my weak spots easily.",
  },
];

const faqs = [
  {
    q: "How does the AI personalize my learning?",
    a: "Our AI analyzes your performance, preferences, and goals to adaptively recommend modules, track your growth, and optimize your learning path.",
  },
  {
    q: "Is PathGenie suitable for complete beginners?",
    a: "Absolutely! Whether you're a beginner or an advanced learner, PathGenie adjusts difficulty and content to match your level.",
  },
  {
    q: "Can I learn at my own pace?",
    a: "Yes! PathGenie is fully self-paced. You can pause, resume, or skip modules anytime you like.",
  },
  {
    q: "What kind of content is available?",
    a: "Interactive modules, flashcards, quizzes, and real-world projects — all backed by AI for maximum impact.",
  },
];

const Home = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="w-full bg-white text-gray-900">
      {/* Enhanced Hero Section */}
      <section className="relative w-full bg-gradient-to-br from-blue-100 via-white to-indigo-100 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-20 lg:py-28">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-radial from-blue-400/20 via-transparent to-transparent opacity-50"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative">
            <div className="text-center lg:text-left order-2 lg:order-1 z-10">
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-8"
              >
                <motion.div variants={itemVariants}>
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-600 border border-blue-200 shadow-sm">
                    <span className="mr-2">✨</span> Powered by Advanced AI
                  </span>
                </motion.div>

                <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                  <span className="block font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600 animate-gradient-x">
                    Master Skills
                  </span>
                  <span className="block mt-2 text-gray-900">With AI Guidance</span>
                </motion.h1>

                <motion.p variants={itemVariants} className="max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg lg:text-xl text-gray-600">
                  Experience the future of learning with personalized AI content, real-time feedback, and hands-on practice.
                </motion.p>

                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                  <button
                    onClick={() => navigate("/signup")}
                    className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl 
                    shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 
                    transform hover:-translate-y-1 transition-all duration-200
                    border border-white/10 backdrop-blur-sm flex items-center justify-center gap-2"
                  >
                    Start Learning Free 
                    <RiArrowRightLine className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button className="px-8 py-4 bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 
                    font-medium rounded-xl hover:bg-blue-50 hover:border-blue-200 transform hover:-translate-y-1 
                    transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    See How It Works 
                    <RiPlayCircleLine className="text-blue-600 text-xl group-hover:scale-110 transition-transform" />
                  </button>
                </motion.div>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="order-1 lg:order-2 relative"
            >
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border border-white/50 backdrop-blur-sm">
                <img 
                  className="w-full h-auto transform hover:scale-105 transition-transform duration-700" 
                  src={IllustrationImage} 
                  alt="AI Learning Illustration"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="relative w-full bg-gradient-to-b from-white to-gray-50/50 py-20 md:py-32">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Why Choose Our Platform?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className={`rounded-2xl p-6 md:p-8 transition-all hover:shadow-2xl shadow-md border ${feature.cardBg} ${feature.borderColor}`}
              >
                <div className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-xl mx-auto mb-5 md:mb-6 ${feature.iconBg}`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm md:text-base">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-14 md:py-16 lg:py-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="p-3"
            >
              <div className="text-3xl md:text-4xl font-bold">
                <AnimatedCounter target={stat.number} />
              </div>
              <div className="text-white/80 text-xs md:text-sm mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="bg-gray-50 py-16 md:py-20 lg:py-24 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-8 lg:mb-14">
            What Learners Are Saying
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {testimonials.map((t, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="bg-white p-5 md:p-6 rounded-2xl shadow-lg text-left"
              >
                <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 md:w-12 md:h-12 rounded-full" />
                  <div>
                    <div className="font-semibold text-gray-800">{t.name}</div>
                    <div className="text-xs md:text-sm text-gray-500">{t.role}</div>
                  </div>
                </div>
                <p className="text-gray-600 text-xs md:text-sm italic">"{t.quote}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/*FAQs section */}
      <section className="py-16 md:py-20 lg:py-24 bg-white px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-8 lg:mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-3 md:space-y-4 text-left">
            {faqs.map((item, i) => (
              <FaqItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/*Final CTA banner */}
      <section className="py-16 md:py-20 lg:py-24 bg-gradient-to-br from-blue-200 via-white to-blue-200 border border-blue-700 text-black text-center rounded-3xl lg:rounded-4xl mx-2 md:mx-4 my-4 md:my-6">
        <div className="max-w-3xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4"
          >
            Ready to Elevate Your Skills with AI?
          </motion.h2>
          <p className="text-gray-700 mb-6 md:mb-8 text-base md:text-lg">
            Join thousands of learners transforming their future through smart, guided learning.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/signup")}
            className="px-6 md:px-8 py-3 md:py-4 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/20 
              hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 
              hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-100 
              hover:backdrop-blur-sm border border-transparent hover:border-white/30 
              hover:text-white/90 w-full sm:w-auto"
          >
            Start Learning Now 🚀
          </motion.button>
        </div>
      </section>

      <style jsx>{`
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }
        
        @keyframes gradient-x {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
        
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, #6366f1 1px, transparent 1px),
            linear-gradient(to bottom, #6366f1 1px, transparent 1px);
          background-size: 40px 40px;
        }
        
        .bg-gradient-radial {
          background-image: radial-gradient(circle at center, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%);
        }
      `}</style>
    </div>
  );
};

export default Home;
