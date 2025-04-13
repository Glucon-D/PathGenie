import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { account } from '../config/appwrite';
import { ID } from 'appwrite';

const Signup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create account
      const account_response = await account.create(
        ID.unique(),
        formData.email,
        formData.password,
        formData.name
      );

      if (account_response.$id) {
        await account.createEmailPasswordSession(formData.email, formData.password);
        window.location.href = '/dashboard';  // Use full page redirect
      }
    } catch (error) {
      console.error("Signup error:", error);
      if (error.code === 409) {
        setError('Email already exists. Please login instead.');
      } else if (error.code === 400) {
        setError('Invalid email or password format.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md w-full border border-blue-100"
      >
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">
          Create Account
        </h2>
        
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-gray-700">Name</label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white/50"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-gray-700">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white/50"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          
          <div>
            <label className="text-gray-700">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white/50"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium 
              shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </motion.button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Already have an account?{' '}
          <motion.span
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate('/login')}
            className="text-blue-600 cursor-pointer font-medium"
          >
            Login
          </motion.span>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
