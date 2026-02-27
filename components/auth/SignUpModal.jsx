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
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fbLoaded, setFbLoaded] = useState(false);

  const router = useRouter();

  // Load Facebook SDK
  useEffect(() => {
    // Load Facebook SDK
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });
      setFbLoaded(true);
    };

    // Load the SDK asynchronously
    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
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

  // Facebook Login Handler
  const handleFacebookLogin = () => {
    if (!agreedToTerms) {
      setError('Please accept Terms & Conditions');
      return;
    }

    if (!fbLoaded || !window.FB) {
      setError('Facebook SDK not loaded. Please refresh the page.');
      return;
    }

    window.FB.login(async function(response) {
      if (response.authResponse) {
        setLoading(true);
        try {
          const apiResponse = await fetch(API.AUTH.FACEBOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accessToken: response.authResponse.accessToken,
              acceptedTerms: true,
              acceptedTermsVer: 'v1.0'
            })
          });

          if (!apiResponse.ok) {
            throw new Error('Facebook login failed');
          }

          const data = await apiResponse.json();
          
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
              router.push('/facecard');
            } else {
              // No profile - go to onboarding
              router.push('/onboarding');
            }
          } catch (error) {
            console.error('Error checking profile:', error);
            router.push('/onboarding');
          }
          
          onClose();
        } catch (error) {
          console.error('Facebook login error:', error);
          setError('Facebook login failed. Please try again.');
        } finally {
          setLoading(false);
        }
      } else {
        setError('Facebook login cancelled');
      }
    }, {scope: 'public_profile,email'});
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
    setShowMoreOptions(false);
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
              {/* Google Login */}
              <Button 
                variant="outline2"
                fullWidth
                icon={
                  <img src="/assets/devicon_google.png" alt="" className='w-6 h-6' />
                }
                className='whitespace-nowrap sm:whitespace-normal text-lg sm:text-md py-6'
                onClick={handleGoogleLogin}
                disabled={loading || !agreedToTerms}
              >
                {loading ? 'Connecting...' : 'Connect with Google'}
              </Button>

              {/* Facebook Login */}
              <Button 
                variant="outline2"
                fullWidth 
                icon={
                  <img src="/assets/logos_facebook.png" alt="" className='w-6 h-6 ' />
                }
                className='whitespace-nowrap sm:whitespace-normal text-lg sm:text-md py-6'
                onClick={handleFacebookLogin}
                disabled={loading || !agreedToTerms || !fbLoaded}
              >
                {loading ? 'Connecting...' : 'Connect with Facebook'}
              </Button>

              {/* Mobile Login */}
              <Button
                variant="outline2"
                fullWidth
                icon={
                  <img src="/assets/meteor-icons_mobile.png" alt="" className='w-6 h-6' />
                }
                onClick={() => setStep('mobile')}
                className='whitespace-nowrap sm:whitespace-normal text-lg sm:text-md py-6'
                disabled={loading}
              >
                Connect with Mobile
              </Button>

              {/* Apple Login (More Options) */}
              {showMoreOptions && (
                <div className="animate-slide-up text-white/50">
                  <Button 
                    variant="outline2" 
                    fullWidth
                    icon={
                      <img src="/apple.png" alt="" className='w-6 h-6' />
                    }
                    className='whitespace-nowrap sm:whitespace-normal text-lg sm:text-md py-6'
                    disabled={true}
                  >
                    Connect with Apple ID (Coming Soon)
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

              {error && <ErrorAlert message={error} />}
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

              <ErrorAlert message={error} />

              <div className="mt-8 mb-8 flex justify-center lg:justify-start ">
                <Button
                  variant="outline2"
                  width="quarter"
                  className='w-[120px] lg:w-[200px] text-xs lg:text-[15px]'
                  position="left"
                  onClick={handleGetOTP}
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Get OTP'}
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
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Enter OTP'}
                </Button>
              </div>
            </div>
          )}

          {/* TERMS */}


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
