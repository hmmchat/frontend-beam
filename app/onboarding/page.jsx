'use client';

import { useState } from 'react';
import Image from 'next/image';
import Onboarding from '../../components/Home/Onboarding';



const OnboardingPage = () => {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  return (
    <>
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Onboarding />
      </main>

    </>
  );
};

export default OnboardingPage;