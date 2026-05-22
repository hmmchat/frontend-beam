'use client';

import { useState } from 'react';
import Image from 'next/image';
import Onboarding from '../../components/Home/Onboarding';



const OnboardingPage = () => {
  return (
    <div className="min-h-[100svh] overflow-x-hidden">
      <Onboarding />
    </div>
  );
};

export default OnboardingPage;