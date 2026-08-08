const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Load Razorpay Checkout.js once and resolve with window.Razorpay.
 * @returns {Promise<typeof window.Razorpay>}
 */
export function loadRazorpay() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay can only load in the browser'));
  }

  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }

  const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => {
        if (window.Razorpay) resolve(window.Razorpay);
        else reject(new Error('Razorpay failed to initialize'));
      });
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error('Razorpay failed to initialize'));
    };
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(script);
  });
}
