'use client';

import { useState } from 'react';
import Image from 'next/image';
import Onboarding from '../../components/Home/Onboarding';



const OnboardingPage = () => {
  return (
    <div className="h-[100dvh] overflow-hidden">
      <Onboarding />
    </div>
  );
};

export default OnboardingPage;