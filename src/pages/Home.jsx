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

  return (
    <div className="w-full bg-white text-gray-900">

      {/* HERO SECTION */}
      <section className="w-full bg-gradient-to-br from-blue-200 via-white to-blue-200 border border-blue-700 rounded-4xl text-gray-900 grid grid-cols-2">
        <div className="max-w-5xl mx-auto px-4 py-28 text-center col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-600 mb-6"
          >
            <span className="mr-2">✨</span> Powered by Advanced AI
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-5xl sm:text-7xl font-bold leading-tight mb-4"
          >
            <span className="block font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-800 via-purple-500 to-blue-800">
              Master Skills
            </span>
            <span className="block mt-2 text-gray-900">With AI Guidance</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 mb-10"
          >
            Experience the future of learning with personalized AI content, real-time feedback, and hands-on practice.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <button
              onClick={() => navigate("/signup")}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/20 
              hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 
              hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-100 
              hover:backdrop-blur-sm border border-transparent hover:border-white/30 
              hover:text-white/90 flex items-center justify-center gap-2"
            >
              Start Learning Free <RiArrowRightLine />
            </button>
            <button
              className="px-8 py-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-blue-50 hover:border-indigo-600 hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              See How It Works <RiPlayCircleLine className="text-blue-600 text-xl" />
            </button>
          </motion.div>
        </div>
        <div className="p-5">
          <img className="h-full w-full rounded-4xl" src={IllustrationImage} alt="" />
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="w-full bg-white py-24">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-14">
            Why Choose Our Platform?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className={`rounded-2xl p-8 transition hover:shadow-2xl shadow-md border ${feature.cardBg} ${feature.borderColor}`}
              >
                <div className={`w-14 h-14 flex items-center justify-center rounded-xl mb-6 ${feature.iconBg}`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
            >
              <div className="text-4xl font-bold">
                <AnimatedCounter target={stat.number} />
              </div>
              <div className="text-white/80 text-sm">{stat.label}</div>
            </motion.div>
          ))}

        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-14">
            What Learners Are Saying
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="bg-white p-6 rounded-2xl shadow-lg text-left"
              >
                <div className="flex items-center gap-4 mb-4">
                  <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full" />
                  <div>
                    <div className="font-semibold text-gray-800">{t.name}</div>
                    <div className="text-sm text-gray-500">{t.role}</div>
                  </div>
                </div>
                <p className="text-gray-600 text-sm italic">“{t.quote}”</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/*FAQs section */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4 text-left">
            {faqs.map((item, i) => (
              <FaqItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>


      {/*Final CTA banner */}
      <section className="py-24 bg-gradient-to-br from-blue-200 via-white to-blue-200 border border-blue-700 text-black text-center rounded-4xl">
        <div className="max-w-3xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl font-bold mb-4"
          >
            Ready to Elevate Your Skills with AI?
          </motion.h2>
          <p className="text-white/90 mb-8 text-lg">
            Join thousands of learners transforming their future through smart, guided learning.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/signup")}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/20 
              hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 
              hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-100 
              hover:backdrop-blur-sm border border-transparent hover:border-white/30 
              hover:text-white/90"
          >
            Start Learning Now 🚀
          </motion.button>
        </div>
      </section>

    </div>
  );
};

export default Home;
