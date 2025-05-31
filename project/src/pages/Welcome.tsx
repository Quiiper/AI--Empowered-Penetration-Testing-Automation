import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, UserPlus } from 'lucide-react';

function Welcome() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-keystone-black to-gray-900 text-white flex flex-col items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center max-w-2xl mx-auto"
      >
        <img 
          src="/keystone-logo.png" 
          alt="Keystone Logo" 
          className="w-64 mx-auto mb-8"
        />
        <h1 className="text-5xl font-bold mb-6">Welcome to Keystone Security</h1>
        <p className="text-xl text-gray-300 mb-12 leading-relaxed">
          Your comprehensive security testing and assessment platform.
          Experience advanced penetration testing with intelligent assistance.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/login', { state: { isSignUp: false } })}
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-keystone-red hover:bg-red-700 text-white font-medium transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Sign In
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/login', { state: { isSignUp: true } })}
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors border border-gray-700"
          >
            <UserPlus className="w-5 h-5" />
            Sign Up
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Welcome;