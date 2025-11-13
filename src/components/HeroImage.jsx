import React from 'react';

const HeroImage = () => {
  return (
    <div className='absolute inset-0 flex justify-center items-center'>
      {/* Background overlay for better text contrast */}
      <div className='absolute inset-0 bg-gradient-to-r from-purple-900/40 via-pink-900/30 to-blue-900/40'></div>
      
      {/* Smaller, centered image */}
      <div className='relative w-full max-w-4xl mx-auto px-4'>
        <img 
          src='https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' 
          alt='GoRoomz - Find Your Perfect Room' 
          className='w-full h-96 md:h-[500px] object-cover rounded-2xl shadow-2xl'
        />
        
        {/* Additional overlay on image for text readability */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-2xl'></div>
      </div>
    </div>
  );
};

export default HeroImage;