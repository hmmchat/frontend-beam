'use client';

import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ErrorAlert from '../ui/ErrorAlert';
import { API } from '@/lib/api';


function SignUpModalContent({ isOpen, onClose }) {
  const [step, setStep] = useState('options');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    // Facebook SDK removed
  }, []);

  // Google Login Handler  
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (!agreedToTerms) {
        setError('Please accept Terms & Conditions');
        return;
      }

      setLoading(true);
      try {
        // Verify we have an access token and exchange it for user info + id_token
        // We'll use the tokeninfo endpoint to validate and get user details
        const tokenInfoResponse = await fetch(
          `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${tokenResponse.access_token}`
        );
        
        const tokenInfo = await tokenInfoResponse.json();
        
        if (!tokenInfo.email) {
          throw new Error('Failed to get user email from Google');
        }

        // Create a simple JWT-like structure for the backend
        // The backend will verify this with Google's API
        const response = await fetch(API.AUTH.GOOGLE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken: tokenResponse.access_token,
            acceptedTerms: true,
            acceptedTermsVer: 'v1.0'
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Backend error:', errorData);
          throw new Error(errorData.message || 'Google login failed');
        }
        
        const data = await response.json();
        
        // Store tokens
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        
        // Check if user has a profile
        try {
          const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
          const userId = payload.sub || payload.uid;
          
          const profileResponse = await fetch(API.USERS.GET_USER(userId), {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (profileResponse.ok) {
            // Profile exists - go to dashboard
            console.log('Profile exists, redirecting to dashboard');
            router.push('/facecard');
          } else {
            // No profile - go to onboarding
            console.log('No profile, redirecting to onboarding');
            router.push('/onboarding');
          }
        } catch (error) {
          console.error('Error checking profile:', error);
          // Default to onboarding if check fails
          router.push('/onboarding');
        }
        
        onClose();
      } catch (error) {
        console.error('Google login error:', error);
        setError('Google login failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError('Google login failed');
    },
    scope: 'openid email profile'
  });

  // Facebook Login Handler Removed
  const handleFacebookLogin = () => {
    setError('Facebook login is currently unavailable.');
  };

  // Phone OTP - Send OTP
  const handleGetOTP = async () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      setError('Please enter a valid mobile number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Clean the number - remove all non-digits
      const cleanNumber = mobileNumber.replace(/\D/g, '');
      
      // Format: If starts with 91, use as is, otherwise add 91
      const formattedNumber = cleanNumber.startsWith('91') 
        ? `+${cleanNumber}` 
        : `+91${cleanNumber}`;
      
      console.log('Sending OTP to:', formattedNumber);

      const response = await fetch(API.AUTH.PHONE_SEND_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedNumber
        })
      });

      const data = await response.json();
      console.log('OTP Response:', data);

      if (!response.ok) {
        // Show the actual error message from backend
        const errorMsg = data.message || data.error || 'Failed to send OTP';
        throw new Error(errorMsg);
      }

      if (data.ok) {
        setStep('otp');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      // Show the actual error message
      setError(error.message || 'Failed to send OTP. Please check your number.');
    } finally {
      setLoading(false);
    }
  };

  // Phone OTP - Verify OTP
  const handleEnterOTP = async () => {
    const otpValue = otp.join('');
    
    if (otpValue.length !== 6) {
      setError('Please enter complete OTP');
      return;
    }

    if (!agreedToTerms) {
      setError('Please accept Terms & Conditions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Clean the number - remove all non-digits
      const cleanNumber = mobileNumber.replace(/\D/g, '');
      
      // Format: If starts with 91, use as is, otherwise add 91
      const formattedNumber = cleanNumber.startsWith('91') 
        ? `+${cleanNumber}` 
        : `+91${cleanNumber}`;
      
      console.log('Verifying OTP for:', formattedNumber);

      const response = await fetch(API.AUTH.PHONE_VERIFY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedNumber,
          code: otpValue,
          acceptedTerms: true,
          acceptedTermsVer: 'v1.0'
        })
      });

      const data = await response.json();
      console.log('Verify Response:', data);

      if (!response.ok) {
        // Show the actual error message from backend
        const errorMsg = data.message || data.error || 'Invalid OTP';
        throw new Error(errorMsg);
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      
      router.push('/onboarding');
      onClose();
    } catch (error) {
      console.error('Verify OTP error:', error);
      // Show the actual error message
      setError(error.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
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

  const resetModal = () => {
    setStep('options');
    setMobileNumber('');
    setOtp(['', '', '', '', '', '']);
    setError('');
    setAgreedToTerms(false);
    setLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="h-full sm:rounded-2xl rounded-none ">
        <div
          className="flex flex-col
          flex-col h-full
         
          text-center
    
          md:block "
        >

          {/* Header */}
       <div className="pt-10 px-4 flex flex-col items-center text-center  md:mb-10">
  <img src="./LOGO.png" className="w-40 mx-auto" />
  <p className="text-white text-lg font-medium mt-1">
    Meet someone here
  </p>
</div>

<div className=' flex-1 flex flex-col justify-center px-4 '>


          {/* OPTIONS */}
          {step === 'options' && (
            <div className="flex flex-col gap-3 mb-8 md:px-4  ">
              {/* Google Login */}
              <Button 
                variant="outline2"
                fullWidth
                icon={
                  <img src="/assets/devicon_google.png" alt="" className='w-6 h-6' />
                }
                className='whitespace-nowrap sm:whitespace-normal text-white text-sm sm:text-md py-6 font-[family-name:var(--font-otomanopee)]'
                onClick={handleGoogleLogin}
                disabled={loading || !agreedToTerms}
              >
                {loading ? 'Connecting...' : 'Connect with Google'}
              </Button>

              {/* Mobile Login */}
              <Button
                variant="outline2"
                fullWidth
                icon={
                  <img src="/assets/meteor-icons_mobile.png" alt="" className='w-6 h-6' />
                }
                onClick={() => setStep('mobile')}
                className='whitespace-nowrap sm:whitespace-normal text-sm sm:text-sm py-6 font-[family-name:var(--font-otomanopee)]'
                disabled={loading || !agreedToTerms}
              >
                Connect with Mobile
              </Button>
              {error && <ErrorAlert message={error} />}
            </div>
          )}

          {/* MOBILE NUMBER */}


          {step === 'mobile' && (
  <div className="text-left py-8 flex w-72 md:w-96 sm:w-80  flex-col outfit-font mx-auto">
    
    <div className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[380px] lg:max-w-[400px] mx-auto">
      <Input
        type="tel"
        placeholder="+919876543210"
        value={mobileNumber}
        onChange={(e) => {
          const value = e.target.value.replace(/\D/g, '');
          setMobileNumber(value);
        }}
        label="Enter Mobile Number"
      />
    </div>

    <ErrorAlert message={error} />

 <div className="mt-6 flex ">
      <button
  
        className="text-xs lg:text-[15px] font-[family-name:var(--font-otomanopee)] text-white/80  bg-transparent text-white hover:bg-purple-500/20 hover:border-purple-500 hover:-translate-y-0.5 border-white/50 rounded-[1.3rem] border-[1px] border-b-4 inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl text-base font-semibold border-2 transition-all duration-300 ease-out relative overflow-hidden"

        onClick={handleGetOTP}
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Get OTP'}
      </button>
    </div>

  </div>
)}
   {/* OTP */}
          {step === 'otp' && (
            <div className="mb-8 text-left px-4 py-8 outfit-font flex justify-center">
              <div className="w-full max-w-md">
              
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
                <button
                  variant="outline2"
                  width="quarter"
                  className='w-[120px] lg:w-[210px] text-xs lg:text-[15px] font-[family-name:var(--font-otomanopee)] text-white/80 '
                  position="left"
                  onClick={handleEnterOTP}
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Enter OTP'}
                </button>
              </div>
            </div>

            </div>
          )}

          {/* TERMS */}

</div>


          <div className="mt-auto w-full flex justify-center items-center outfit-font pb-6 px-4">



            <div className=" pt-8 lg:px-0">
              <label className="flex items-center gap-6 0  meeting now max-w-[450px]">
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

// Wrap with GoogleOAuthProvider
export default function SignUpModal({ isOpen, onClose }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    console.warn('NEXT_PUBLIC_GOOGLE_CLIENT_ID not found in environment variables');
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId || ''}>
      <SignUpModalContent isOpen={isOpen} onClose={onClose} />
    </GoogleOAuthProvider>
  );
}
