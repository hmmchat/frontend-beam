'use client';

export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false,
  type = 'button',
  icon = null,
  fullWidth = false,
  width = 'full',
  position = 'center'
}) {
  const baseClasses = "inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl text-base font-semibold border-2 transition-all duration-300 ease-out relative overflow-hidden";
  
  const variantClasses = {
    primary: "bg-gradient-primary text-white border-purple-500/50 shadow-[0_4px_20px_rgba(147,51,234,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_8px_30px_rgba(147,51,234,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 hover:border-purple-500/80 active:translate-y-0",
    secondary: "bg-[#1D024D] text-white border-[#9C81BE] backdrop-blur-md hover:bg-white/15 hover:border-white/30 hover:-translate-y-0.5",
    outline: "bg-transparent text-white hover:bg-purple-500/20 hover:border-purple-500 hover:-translate-y-0.5 border-white rounded-4xl border-b-6",
    ghost: "bg-transparent text-white/80 border-transparent hover:bg-white/10 hover:text-white "
  }

  // Width classes
  let widthClass = "";
  if (fullWidth || width === 'full') {
    widthClass = "w-full";
  } else if (width === 'half') {
    widthClass = "w-1/2";
  }
else if (width === 'quarter') {
    widthClass = "w-1/4";
  }
  else if (width === 'hex') {
    widthClass = "w-[150px]";
  }
  // Position classes (for alignment when not full width)
  let positionClass = "";
  if (!fullWidth && width !== 'full') {
    if (position === 'left') {
      positionClass = "mr-auto";
    } else if (position === 'right') {
      positionClass = "ml-auto";
    } else if (position === 'center') {
      positionClass = "mx-auto";
    }
  }

  const disabledClass = disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${positionClass} ${disabledClass} ${className}`}
    >
      {icon && <span className="flex items-center text-xl">{icon}</span>}
      {children}
    </button>
  );
}
