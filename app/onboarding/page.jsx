'use client';

import { useState } from 'react';
import Image from 'next/image';
import Onboarding from '../../components/Home/Onboarding';



const OnboardingPage = () => {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  return (

          <Onboarding />





   
  );
};

export default OnboardingPage;