'use client';

import { useState } from 'react';
import { useRouter } from "next/navigation";

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import useBackToClose from '@/lib/use-back-to-close';

export default function SignInModal({ isOpen, onClose }) {
  useBackToClose(isOpen, onClose);
  const [step, setStep] = useState('options'); // 'options', 'mobile', 'otp'
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const router = useRouter();
const correctOTP = "1234"; // Replace with backend verification


  const handleGetOTP = () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      setError('Invalid! Mind entering the correct number please.');
      return;
    }
    setError('');
    setStep('otp');
      const enteredOTP = otp.join(""); // Convert digits array → string

  if (enteredOTP === correctOTP) {
    setError(""); 
    router.push("/onboarding"); // <-- Page navigation
  } else {
    setError("Invalid OTP. Please try again");
  }

  };



  const handleOTPChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleEnterOTP = () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter complete OTP');
      return;
    }
    // Handle OTP verification
    console.log('OTP:', otpValue);
  };

  const resetModal = () => {
    setStep('options');
    setMobileNumber('');
    setOtp(['', '', '', '', '', '']);
    setError('');
    setAgreedToTerms(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="text-center">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-[56px] font-extrabold text-gradient-gold mb-4 tracking-[2px]">
            HMM..
          </h1>
          <p className="text-white text-lg leading-relaxed font-medium">
            Meet that someone<br />
            immediately after Signing in
          </p>
        </div>

        {/* Content based on step */}
        <div className="min-h-[400px] w-full max-w-[400px] mx-auto flex flex-col justify-center px-4">
          {step === 'options' && (
            <div className="flex flex-col gap-4 mb-8 w-full">
            <Button
              variant="secondary"
              fullWidth
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#4285F4" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              }
              onClick={() => {}} // Placeholder or real handler if needed
              disabled={!agreedToTerms}
            >
              Connect with Google
            </Button>

            <Button
              variant="secondary"
              fullWidth
              icon={<span>📱</span>}
              onClick={() => setStep('mobile')}
              disabled={!agreedToTerms}
            >
              Connect with Mobile
            </Button>
          </div>
        )}

          {step === 'mobile' && (
            <div className="mb-8 text-left w-full">
    <Input
      type="tel"
      placeholder="+91- 879-7967-858"
      value={mobileNumber}
      onChange={(e) => setMobileNumber(e.target.value)}
      label="Enter Mobile Number"
      error={error}
    />

    <div className="mt-6 flex justify-start">
      <Button
        variant="secondary"
        width="quarter"
        position="left"
        onClick={handleGetOTP}
      >
        Get OTP
      </Button>
    </div>
  </div>
)}

          {step === 'otp' && (
            <div className="mb-8 text-left w-full">
  <p className="text-white/90 text-sm font-medium mb-4 ">
    Enter OTP
  </p>

  <div className="flex gap-3 justify-start mb-4">
    {otp.map((digit, index) => (
      <input
        key={index}
        id={`otp-${index}`}
        type="text"
        maxLength="1"
        value={digit}
        onChange={(e) => handleOTPChange(index, e.target.value)}
        className="w-14 h-14 border-2 border-purple-500/30 bg-[#1D024D]
                   rounded-[14px] text-white text-2xl font-semibold text-center
                   focus:outline-none"
      />
    ))}
  </div>

  {error && (
    <div className="flex items-center justify-start gap-1.5 mt-3 text-red-500 text-[13px] font-medium animate-shake">
      <span className="text-base">⚠</span>
      {error}
    </div>
  )}

  <div className="mt-6 flex justify-start">
    <Button
      variant="secondary"
      width="quarter"
      position="left"
      onClick={handleEnterOTP}
    >
      Enter OTP
    </Button>
  </div>
</div>

        )}
        </div>

        {/* Terms and Conditions */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <label className="flex items-start gap-3 0  meeting now text-left">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="peer sr-only"
            />
            <span className="min-w-[20px] h-5 bg-white/10 border-2 border-purple-500/50 rounded-md relative transition-all duration-300 peer-checked:bg-gradient-primary peer-checked:border-purple-500 after:content-['✓'] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:text-white after:text-sm after:font-bold after:opacity-0 peer-checked:after:opacity-100"></span>
            <span className="text-white/70 text-xs leading-relaxed">
              I certify I have read and agree to the{' '}
              <a href="#" className="text-purple-500 font-semibold hover:text-purple-400 hover:underline transition-colors">
                Terms of Service
              </a>{' '}
              confirm that you have read{' '}
              <a href="#" className="text-purple-500 font-semibold hover:text-purple-400 hover:underline transition-colors">
                Privacy Policy
              </a>
              . I certify I am at least 18 years old and have reached the age of majority where I live.
            </span>
          </label>
        </div>
      </div>
    </Modal>
  );
}
