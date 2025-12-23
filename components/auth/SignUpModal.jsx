'use client';

import { useState } from 'react';
import { useRouter } from "next/navigation";

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ErrorAlert from '../ui/ErrorAlert';

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
      setError('teeeee');
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
      <div className="h-full sm:rounded-2xl rounded-none ">
        <div
          className="flex flex-col justify-center items-center
          h-full
          text-center
      
          md:block md:min-h-0"
        >


          {/* Header */}
          <div className="mb-10 px-4 lg:px-0 flex flex-col items-center justify-center text-center">
            <img src="/assets/logo.svg" alt="" className='w-40 mx-auto ' />
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
                  <img src="/assets/devicon_google.png" alt="" className='w-6 h-6' />
                }
                className='whitespace-nowrap sm:whitespace-normal text-lg sm:text-md  py-6'
              >
                Connect with Google
              </Button>

              <Button variant="outline2"
                fullWidth icon={
                  <img src="/assets/logos_facebook.png" alt="" className='w-6 h-6 ' />
                }
                className='whitespace-nowrap sm:whitespace-normal text-lg sm:text-md py-6'
              > Connect with Facebook
              </Button>

              <Button
                variant="outline2"
                fullWidth
                icon={
                  <img src="/assets/meteor-icons_mobile.png" alt="" className='w-6 h-6' />
                }
                onClick={() => setStep('mobile')}
                className='whitespace-nowrap sm:whitespace-normal text-lg sm:text-md py-6'
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
                className="text-white text-sm pt-2 hover:text-white transition-colors outfit-font text-lg"
                onClick={() => setShowMoreOptions(prev => !prev)}
              >
                {showMoreOptions ? 'Less options' : 'More options'}
              </button>
            </div>
          )}

          {/* MOBILE NUMBER */}
          {step === 'mobile' && (
            <div className=" text-left px-4 lg:px-60 py-18 outfit-font">
              <Input
                type="tel"
                placeholder="+91 879-7967-858"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                label="Enter Mobile Number"
              />

              <ErrorAlert message={error ? "Hmmm! Mind entering the correct number please." : ""} />

              <div className="mt-8 mb-8 flex justify-center lg:justify-start ">
                <Button
                  variant="outline2"
                  width="quarter"
                  className='w-[120px] lg:w-[200px] text-xs lg:text-[15px]'
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
            <div className="mb-8 text-left px-4 lg:px-40 py-18 outfit-font">
              <p className="text-white/90 text-sm font-medium max-w-[200px] mb-4">
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
                             border-2 border-white/60
                             rounded-xl lg:rounded-[14px]
                             text-white text-lg lg:text-2xl font-semibold text-center
                             focus:outline-none bg-[#0A032D]/70 font-[family-name:var(--font-otomanopee)]"
                  />
                ))}
              </div>

              <ErrorAlert message={error} />

              <div className="mt-6 flex justify-center lg:justify-start">
                <Button
                  variant="outline2"
                  width="quarter"
                  className='w-[120px] lg:w-[210px] text-xs lg:text-[15px] font-[family-name:var(--font-otomanopee)] text-white/80 '
                  position="left"
                  onClick={handleEnterOTP}
                >
                  Enter OTP
                </Button>
              </div>
            </div>
          )}

          {/* TERMS */}
          <div className="border-t border-white/50 -mx-12 self-stretch " />

          <div className='flex justify-center items-center outfit-font'>
            <div className=" pt-8 lg:px-0">
              <label className="flex items-center gap-6 cursor-pointer max-w-[450px]">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="peer sr-only opacity-50"
                />
                <span className="min-w-[16px] h-4 bg-white/10 border-2 border-white/35 rounded-sm relative peer-checked:bg-green-600 peer-checked:border-white peer-checked:shadow-[0_0_20px_8px_rgba(34,197,94,0.4),0_0_40px_15px_rgba(34,197,94,0.2),0_0_60px_25px_rgba(34,197,94,0.1)] after:content-['✓'] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:text-white after:text-sm after:font-bold after:opacity-0 peer-checked:after:opacity-100 flex-shrink-0 transition-all duration-300"></span>

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
