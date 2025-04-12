import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  RiRocketLine, 
  RiBrainLine, 
  RiBarChartBoxLine,
  RiArrowRightLine,
  RiPlayCircleLine,
  RiStarLine,
  RiLightbulbLine,
  RiUserLine
} from "react-icons/ri";

const Home = () => {
  const navigate = useNavigate();

  // Enhanced features data with more visual appeal
  const features = [
    {
      icon: <RiBrainLine className="text-4xl" />,
      title: "AI-Powered Learning",
      description: "Personalized learning paths tailored to your needs",
      gradient: "from-blue-600 to-indigo-600"
    },
    {
      icon: <RiLightbulbLine className="text-4xl" />,
      title: "Smart Progress",
      description: "Track your growth with intelligent analytics",
      gradient: "from-indigo-600 to-purple-600"
    },
    {
      icon: <RiBarChartBoxLine className="text-4xl" />,
      title: "Interactive Practice",
      description: "Hands-on exercises and real-time feedback",
      gradient: "from-purple-600 to-pink-600"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Software Developer",
      avatar: "https://randomuser.me/api/portraits/women/1.jpg",
      text: "pathgenie has revolutionized how I approach learning. The AI-powered recommendations are spot-on!"
    },
    {
      name: "Mike Chen",
      role: "Student",
      avatar: "https://randomuser.me/api/portraits/men/2.jpg",
      text: "The interactive learning paths and quizzes helped me master complex topics easily."
    },
    {
      name: "Emily Davis",
      role: "Data Scientist",
      avatar: "https://randomuser.me/api/portraits/women/3.jpg",
      text: "The personalized approach and adaptive content make learning engaging and effective."
    }
  ];

  const stats = [
    { number: "10k+", label: "Active Learners" },
    { number: "50+", label: "Learning Paths" },
    { number: "95%", label: "Success Rate" },
    { number: "24/7", label: "AI Support" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white overflow-hidden">
      {/* Hero Section with Animated Background */}
      <div className="relative">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
        </div>

        <div className="max-w-7xl mx-auto px-4 pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Enhanced Hero Text */}
            <div className="space-y-6">
              <motion.span 
                className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-600"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="mr-2">✨</span>
                Powered by Advanced AI
              </motion.span>

              <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-none">
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
                  Master Skills
                </span>
                <span className="block mt-2 text-gray-900">
                  With AI Guidance
                </span>
              </h1>

              <p className="max-w-2xl mx-auto text-xl text-gray-600">
                Experience the future of learning with personalized AI-driven content, 
                interactive practice, and real-time feedback.
              </p>
            </div>

            {/* Enhanced CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/signup")}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-2xl font-medium shadow-xl hover:shadow-2xl transition-all group"
              >
                <span className="flex items-center justify-center gap-2">
                  Start Learning Free
                  <RiArrowRightLine className="group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white text-gray-700 rounded-2xl font-medium shadow-lg border border-gray-100 hover:border-gray-200 transition-all flex items-center justify-center gap-2 group"
              >
                See How It Works
                <RiPlayCircleLine className="text-blue-600 text-xl group-hover:scale-110 transition-transform" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Grid with Gradients */}
      <div className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl -z-10"
                     style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }} />
                <div className="bg-white/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-100 hover:border-transparent transition-all duration-300 h-full">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.gradient} text-white flex items-center justify-center mb-6`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center text-white"
              >
                <div className="text-4xl font-bold mb-2">{stat.number}</div>
                <div className="text-blue-100">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-2xl shadow-lg"
              >
                <div className="flex items-center gap-4 mb-4">
                  <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full" />
                  <div>
                    <div className="font-medium text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
                <p className="text-gray-600">{testimonial.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
            >
              Frequently Asked Questions
            </motion.h2>
            <p className="text-lg text-gray-600">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                question: "How does AI enhance my learning?",
                answer: "Our AI technology analyzes your learning patterns and preferences to create personalized learning paths, adapting content difficulty and suggesting relevant topics based on your progress."
              },
              {
                question: "Is pathgenie suitable for beginners?",
                answer: "Absolutely! pathgenie is designed for learners of all levels. Our AI adapts the content to match your current knowledge and helps you progress at your own pace."
              },
              {
                question: "What types of content are available?",
                answer: "We offer a variety of learning formats including interactive lessons, quizzes, flashcards, and hands-on projects across multiple topics in technology and programming."
              },
              {
                question: "How do you track progress?",
                answer: "pathgenie provides detailed analytics, progress tracking, and performance metrics to help you monitor your learning journey and identify areas for improvement."
              },
              {
                question: "Can I learn at my own pace?",
                answer: "Yes! Our platform is designed for self-paced learning. You can access content anytime, anywhere, and progress through materials at a speed that works best for you."
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-600">
                  {faq.answer}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto space-y-8"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Ready to Transform Your Learning Journey?
            </h2>
            <p className="text-blue-100 text-lg">
              Join thousands of learners who are already experiencing the future of education.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/signup")}
              className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-medium shadow-xl hover:shadow-white/20 transition-all inline-flex items-center gap-2"
            >
              Start Learning Now
              <RiArrowRightLine />
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Add these animations to your global CSS
const styles = `
@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}
`;

export default Home;
