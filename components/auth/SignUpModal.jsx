'use client';

import { useState } from 'react';
import { useRouter } from "next/navigation";

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function SignUpModal({ isOpen, onClose }) {
  const [step, setStep] = useState('options');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const router = useRouter();
  const correctOTP = "1234";

  const handleGetOTP = () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      setError('Invalid! Mind entering the correct number please.');
      return;
    }
    setError('');
    setStep('otp');
  };

  const handleOTPChange = (index, value) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleEnterOTP = () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter complete OTP');
      return;
    }

    if (otpValue === correctOTP) {
      router.push("/onboarding");
    } else {
      setError("Invalid OTP. Please try again");
    }
  };

  const resetModal = () => {
    setStep('options');
    setMobileNumber('');
    setOtp(['', '', '', '', '', '']);
    setError('');
    setAgreedToTerms(false);
    setShowMoreOptions(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="min-h-full sm:rounded-2xl rounded-none ">
        <div
          className="
    flex flex-col justify-center items-center
   h-full
    text-center
    md:overflow-y-auto

    md:block md:min-h-0
  "
        >


          {/* Header */}
          <div className="mb-10 px-4 lg:px-0 flex flex-col items-center justify-center text-center">
            <img src="/assets/logo.svg" alt="" className='w-40 mx-auto md:mb-4' />
            <p className="text-white text-lg lg:text-lg leading-relaxed font-medium">
              Meet that someone<br />
              immediately after Signing in
            </p>
          </div>

          {/* OPTIONS */}

          {step === 'options' && (
            <div className="flex flex-col gap-3 mb-8 md:px-4 lg:px-60 ">
              <Button variant="outline2"
                fullWidth
                icon={
                  <svg width="24" height="24" viewBox="0 0 24 24" className='opacity-100'>
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#4285F4" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                }
                className='whitespace-nowrap sm:whitespace-normal text-lg sm:text-md  opacity-80'
              >
                Connect with Google
              </Button>

              <Button variant="outline2"
                fullWidth icon={
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                }
                className='whitespace-nowrap sm:whitespace-normal text-lg sm:text-md opacity-75 text-lg 
 '

              > Connect with Facebook
              </Button>

              <Button
                variant="outline2"
                fullWidth
                icon={<span className=''>📱</span>}
                onClick={() => setStep('mobile')}
                className='whitespace-nowrap sm:whitespace-normal text-lg sm:text-md opacity-75'
              >
                Connect with Mobile
              </Button>
              {showMoreOptions && (
                <div className="animate-slide-up text-white/50">
                  <Button variant="outline2" fullWidth>
                    Connect with Apple ID
                  </Button>
                </div>
              )}

              <button
                type="button"
                className="text-white/50 text-sm lg:text-[15px] p-3 hover:text-white transition-colors"
                onClick={() => setShowMoreOptions(prev => !prev)}
              >
                {showMoreOptions ? 'Less options' : 'More options'}
              </button>
            </div>
          )}

          {/* MOBILE NUMBER */}
          {step === 'mobile' && (
            <div className="mb-8 text-left px-4 lg:px-40">
              <Input
                type="tel"
                placeholder="+91 8797967858"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                label="Enter Mobile Number"
                error={error}
              />

              <div className="mt-6 flex justify-center lg:justify-start">
                <Button
                  variant="outline2"
                  width="quarter"
                  position="left"
                  onClick={handleGetOTP}
                >
                  Get OTP
                </Button>
              </div>
            </div>
          )}

          {/* OTP */}
          {step === 'otp' && (
            <div className="mb-8 text-left px-4 lg:px-20">
              <p className="text-white/90 text-sm font-medium mb-4">
                Enter OTP
              </p>

              <div className="flex gap-2 lg:gap-3 justify-center lg:justify-start mb-4">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOTPChange(index, e.target.value)}
                    className="w-10 h-12 lg:w-14 lg:h-14
                             border-2 border-purple-500/30 bg-[#1D024D]
                             rounded-xl lg:rounded-[14px]
                             text-white text-lg lg:text-2xl font-semibold text-center
                             focus:outline-none"
                  />
                ))}
              </div>

              {error && (
                <div className="flex items-center justify-center lg:justify-start gap-1.5 mt-3 text-red-500 text-xs lg:text-[13px] font-medium">
                  <span>⚠</span>
                  {error}
                </div>
              )}

              <div className="mt-6 flex justify-center lg:justify-start">
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

          {/* TERMS */}
          <div className="border-t border-white/50 -mx-10 self-stretch mt-20" />

          <div className='flex justify-center'>
            <div className="md:mt-8 pt-6 lg:px-0">
              <label className="flex items-center gap-3 cursor-pointer max-w-md">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="min-w-[20px] h-5 bg-white/10 border-2 rounded-md relative peer-checked:bg-gradient-primary peer-checked:border-purple-500 after:content-['✓'] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:text-white after:text-sm after:font-bold after:opacity-0 peer-checked:after:opacity-100 flex-shrink-0"></span>

                <span className="text-white/70 md:text-md text-[12.2px] leading-relaxed ">
                  I certify I have read and agree to the{' '}
                  <a href="#" className="text-purple-500 underline font-semibold hover:underline">
                    Terms of Service
                  </a>{' '}
                  confirm that you have read {' '}
                  <a href="#" className="text-purple-500 underline font-semibold hover:underline">
                    Privacy Policy.
                  </a>{' '}
                  I certify i am at least 18-years old and have reached the age of majority where i live.
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
