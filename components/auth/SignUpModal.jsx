"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";

import Button from "../ui/Button";
import Input from "../ui/Input";
import ErrorAlert from "../ui/ErrorAlert";
import { API } from "@/lib/api";
import {
  clearPendingReferralCode,
  getPendingReferralCodeIfAnonymous,
} from "@/components/CaptureReferralFromUrl";
import {
  getPendingSquadInviteToken,
  setPostOnboardingRedirectPath,
} from "@/lib/squad-invite-link";

function SignUpModalContent({ isOpen, onClose }) {
  const [step, setStep] = useState("options");
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const getPendingSquadJoinPath = () => {
    const inviteToken = getPendingSquadInviteToken();
    if (!inviteToken) return "";
    return `/squad?token=${encodeURIComponent(inviteToken)}`;
  };

  // Scroll lock when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => (document.body.style.overflow = "unset");
  }, [isOpen]);

  // Facebook SDK removed
  useEffect(() => {}, []);

  // Google Login Handler
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (!agreedToTerms) {
        setError("Please accept Terms & Conditions");
        return;
      }

      setLoading(true);
      try {
        // Verify we have an access token and exchange it for user info + id_token
        // We'll use the tokeninfo endpoint to validate and get user details
        const tokenInfoResponse = await fetch(
          `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${tokenResponse.access_token}`,
        );

        const tokenInfo = await tokenInfoResponse.json();

        if (!tokenInfo.email) {
          throw new Error("Failed to get user email from Google");
        }

        // Create a simple JWT-like structure for the backend
        // The backend will verify this with Google's API
        const referralCode = getPendingReferralCodeIfAnonymous();
        const response = await fetch(API.AUTH.GOOGLE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken: tokenResponse.access_token,
            acceptedTerms: true,
            acceptedTermsVer: "v1.0",
            ...(referralCode ? { referralCode } : {}),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Backend error:", errorData);
          throw new Error(errorData.message || "Google login failed");
        }

        const data = await response.json();
        clearPendingReferralCode();

        // Store tokens
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        // Check if user has a profile
        try {
          const payload = JSON.parse(atob(data.accessToken.split(".")[1]));
          const userId = payload.sub || payload.uid;

          const profileResponse = await fetch(API.USERS.GET_USER(userId), {
            headers: {
              "Content-Type": "application/json",
            },
          });

          const pendingSquadJoinPath = getPendingSquadJoinPath();

          if (profileResponse.ok) {
            // Profile exists - go to dashboard
            console.log("Profile exists, redirecting to dashboard");
            router.push(pendingSquadJoinPath || "/facecard");
          } else {
            // No profile - go to onboarding
            console.log("No profile, redirecting to onboarding");
            if (pendingSquadJoinPath) {
              setPostOnboardingRedirectPath(pendingSquadJoinPath);
            }
            router.push("/onboarding");
          }
        } catch (error) {
          console.error("Error checking profile:", error);
          // Default to onboarding if check fails
          const pendingSquadJoinPath = getPendingSquadJoinPath();
          if (pendingSquadJoinPath) {
            setPostOnboardingRedirectPath(pendingSquadJoinPath);
          }
          router.push("/onboarding");
        }

        onClose();
      } catch (error) {
        console.error("Google login error:", error);
        setError("Google login failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError("Google login failed");
    },
    scope: "openid email profile",
  });

  // Facebook Login Handler Removed
  const handleFacebookLogin = () => {
    setError("Facebook login is currently unavailable.");
  };

  // Phone OTP - Send OTP
  const handleGetOTP = async () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      setError("Hmm! where's your mind at, you've entered a wrong number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Clean the number - remove all non-digits
      const cleanNumber = mobileNumber.replace(/\D/g, "");

      // Format: If starts with 91, use as is, otherwise add 91
      const formattedNumber = cleanNumber.startsWith("91")
        ? `+${cleanNumber}`
        : `+91${cleanNumber}`;

      console.log("Sending OTP to:", formattedNumber);

      const response = await fetch(API.AUTH.PHONE_SEND_OTP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formattedNumber,
        }),
      });

      const data = await response.json();
      console.log("OTP Response:", data);

      if (!response.ok) {
        // Show the actual error message from backend
        const errorMsg = data.message || data.error || "Failed to send OTP";
        throw new Error(errorMsg);
      }

      if (data.ok) {
        goToNextStep("otp");
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      // Show the actual error message
      setError(
        error.message || "Failed to send OTP. Please check your number.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Clear error when switching steps
  const goToNextStep = (nextStep) => {
    setError("");
    setStep(nextStep);
  };

  // Phone OTP - Verify OTP
  const handleEnterOTP = async () => {
    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      setError("Please enter complete OTP");
      return;
    }

    if (!agreedToTerms) {
      setError("Please accept Terms & Conditions");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Clean the number - remove all non-digits
      const cleanNumber = mobileNumber.replace(/\D/g, "");

      // Format: If starts with 91, use as is, otherwise add 91
      const formattedNumber = cleanNumber.startsWith("91")
        ? `+${cleanNumber}`
        : `+91${cleanNumber}`;

      console.log("Verifying OTP for:", formattedNumber);

      const referralCode = getPendingReferralCodeIfAnonymous();
      const response = await fetch(API.AUTH.PHONE_VERIFY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formattedNumber,
          code: otpValue,
          acceptedTerms: true,
          acceptedTermsVer: "v1.0",
          ...(referralCode ? { referralCode } : {}),
        }),
      });

      const data = await response.json();
      console.log("Verify Response:", data);

      if (!response.ok) {
        // Show the actual error message from backend
        const errorMsg = data.message || data.error || "Invalid OTP";
        throw new Error(errorMsg);
      }

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      clearPendingReferralCode();

      const pendingSquadJoinPath = getPendingSquadJoinPath();
      if (pendingSquadJoinPath) {
        setPostOnboardingRedirectPath(pendingSquadJoinPath);
      }
      router.push("/onboarding");
      onClose();
    } catch (error) {
      console.error("Verify OTP error:", error);
      // Show the actual error message
      setError(error.message || "Invalid OTP. Please try again.");
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
    if (error) setError("");
  };

  const resetModal = () => {
    setStep("options");
    setMobileNumber("");
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setAgreedToTerms(true);
    setLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    /* ── Fullscreen backdrop overlay ── */
    <div
      className="fixed inset-0 z-[50] md:p-5 md:animate-fade-in flex items-center justify-center"
      onClick={handleClose}
    >
      {/* ── Background image / colour layer ── */}
      <div
        className="absolute inset-0 bg-[#02004A] -z-50 pointer-events-none"
        style={{
          backgroundImage: "url(/assets/mb.jpg)",
          backgroundRepeat: "repeat",
          backgroundSize: "cover",
        }}
      />

      {/* ── Modal card ── */}
   <div
  className="
    relative overflow-hidden animate-slide-up z-12
    p-3 rounded-none absolute inset-0 h-screen
    w-full
    md:h-auto md:inset-auto
    md:p-8 md:rounded-[60px]
    md:border-[2px] md:border-white/20
    md:max-w-[70vw]
  "
  style={{ maxHeight: "94vh" }}
  onClick={(e) => e.stopPropagation()}
>
        <div className="h-full min-h-[700px] sm:rounded-2xl rounded-none flex flex-col">
          <div className="flex flex-col flex-col h-full text-center md:block">
            {/* Header */}
            <div className="pt-12 px-4 flex flex-col items-center text-center md:mb-10">
              <img src="./LOGO.png" className="md:w-56 w-44 mx-auto" />
              <p className="text-white md:text-[20px] text-[16px] font-medium -mt-1">
                Meet someone here <br /> <span className="hidden md:block">immediately after Signing in</span>
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-center px-4  ">
              {/* OPTIONS */}
              {step === "options" && (
                <div className="flex flex-col gap-3  md:px-4 font-otomanopee mt-10" >
                  {/* Google Login */}
                  <Button
                    variant="outline2"
                    width="quarterto"
                    icon={
                      <img
                        src="/assets/devicon_google.png"
                        alt=""
                        className="md:w-8 w-6 md:h-8 h-6"
                      />
                    }
                    className="whitespace-nowrap sm:whitespace-normal text-white text-sm sm:text-[16px] md:py-7 py-5 font-[family-name:var(--font-otomanopee)]"
                    onClick={handleGoogleLogin}
                    disabled={loading || !agreedToTerms}
                  >
                    {loading ? "Connecting..." : "Connect with Google"}
                  </Button>

                  {/* Mobile Login */}
                  <Button
                    variant="outline2"
                    width="quarterto"
                    icon={
                      <img
                        src="/assets/meteor-icons_mobile.png"
                        alt=""
                        className="md:w-8 w-6 md:h-8 h-6"
                      />
                    }
                    onClick={() => goToNextStep("mobile")}
                    className="whitespace-nowrap sm:whitespace-normal text-sm sm:text-[16px] md:py-7 py-5 font-[family-name:var(--font-otomanopee)]"
                    disabled={loading || !agreedToTerms}
                  >
                    Connect with Mobile
                  </Button>
                  {error && <ErrorAlert message={error} />}
                </div>
              )}

              {/* MOBILE NUMBER */}
              {step === "mobile" && (
                <div className="text-left py-8 flex w-72 md:w-[380px] lg:w-[480px] sm:w-80 w-[320px] flex-col outfit-font mx-auto font-outfit">
                  <div className="w-full max-w-[320px] sm:max-w-[320px] md:max-w-[380px] lg:max-w-[480px] mx-auto">
                    <Input
                      type="tel"
                      placeholder="+91-9876543210"
                      value={mobileNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        setMobileNumber(value);
                        if (error) setError("");
                      }}
                      label="Enter Mobile Number"
                      error={error} 
                    />
                  </div>

                  <div className="mt-6 flex">
                    <button
                      className="text-xs lg:text-[15px] font-[family-name:var(--font-otomanopee)] text-white/90 bg-transparent text-white hover:bg-purple-500/20 hover:border-purple-500 hover:-translate-y-0.5 border-white/50 rounded-[1.3rem] border-[1px] border-b-4 inline-flex items-center justify-center gap-3 px-12 py-5.5 rounded-2xl text-base font-semibold border-2 transition-all duration-300 ease-out relative overflow-hidden"
                      onClick={handleGetOTP}
                      disabled={loading}
                    >
                      {loading ? "Sending..." : "Get OTP"}
                    </button>
                  </div>
                </div>
              )}

              {/* OTP */}
              {step === "otp" && (
                <div className=" text-left py-8 outfit-font flex justify-center">
                  <div className="w-full max-w-md ">
                    <p className="text-white/90 font-outfit text-sm font-medium max-w-[200px] mb-1">
                      Enter OTP
                    </p>

                    <div className="flex gap-[10px] lg:gap-3 justify-center lg:justify-start mb-4">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          id={`otp-${index}`}
                          type="text"
                          maxLength="1"
                          value={digit}
                          onChange={(e) =>
                            handleOTPChange(index, e.target.value)
                          }
                          className={`w-12 h-14 lg:w-16 lg:h-16
                               border-[2px] ${error ? "border-red-500" : "border-white/40"}
                               rounded-xl lg:rounded-[14px]
                               text-white text-lg lg:text-2xl font-semibold text-center
                               focus:outline-none bg-[#0A032D]/20 font-[family-name:var(--font-otomanopee)] transition-all`}
                        />
                      ))}
                    </div>

                    <ErrorAlert message={error} />

 

                    <div className="mt-6 flex ">
                      <button
                        className="w-[120px] lg:w-[160px] text-xs lg:text-[15px] font-[family-name:var(--font-otomanopee)] text-white/90 bg-transparent text-white hover:bg-purple-500/20 hover:border-purple-500 hover:-translate-y-0.5 border-white/50 rounded-[1rem] border-[2px] border-b-4 inline-flex items-center justify-center gap-3 px-4 py-4 md:py-5 rounded-2xl text-base font-semibold border-2 transition-all duration-300 ease-out relative overflow-hidden"
                        onClick={handleEnterOTP}
                        disabled={loading}
                      >
                        {loading ? "Verifying..." : "Enter OTP"}
                      </button>
                    </div>

                                     <p className="font-outfit mt-6 text-xs"> Didn’t receive OTP?  <span className="text-yellow-500 font-otomanopee ml-1">  Resend OTP</span></p>  
                  </div>
                </div>
              )}

              {/* TERMS */}
            </div>
          </div>

          {/* Footer – Terms text */}
          <div className="mt-auto w-full flex justify-center items-center outfit-font bottom-2 px-4">
            <div className="pt-2 lg:px-0 font-outfit">
              <div className="flex flex-col items-center max-w-[320px] md:max-w-[500px] justify-center text-center">
                <span className="text-white/60 md:text-md text-[12.2px] leading-relaxed">
                  By clicking continue you certify I have read and agree to the{" "}
                  <a href="#" className="text-white/60">
                    Terms of Service
                  </a>{" "}
                  confirm that you have read{" "}
                  <a href="#" className="text-white/60">
                    Privacy Policy.
                  </a>{" "}
                  I certify i am at least 18-years old and have reached the age
                  of majority where I live.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap with GoogleOAuthProvider
export default function SignUpModal({ isOpen, onClose }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    console.warn(
      "NEXT_PUBLIC_GOOGLE_CLIENT_ID not found in environment variables",
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId || ""}>
      <SignUpModalContent isOpen={isOpen} onClose={onClose} />
    </GoogleOAuthProvider>
  );
}