import React from 'react';
import { motion } from 'framer-motion';

const WelcomeMessage = () => {
  return (
    <motion.p
      className='text-xl md:text-2xl text-white max-w-2xl mx-auto'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      Welcome to <span className='font-semibold text-purple-300'>GoRoomz</span> - your gateway to finding the perfect accommodation.
      Discover amazing places to stay across India!
    </motion.p>
  );
};

export default WelcomeMessage;