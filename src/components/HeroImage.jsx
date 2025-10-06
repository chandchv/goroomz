import React from 'react';

const HeroImage = () => {
  return (
    <div className='flex justify-center items-center'>
      <img 
        src='https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' 
        alt='GoRoomz - Find Your Perfect Room' 
        className='w-full h-auto rounded-lg shadow-lg'
      />
    </div>
  );
};

export default HeroImage;