'use client';

export default function Input({ 
  type = 'text',
  placeholder = '',
  value,
  onChange,
  label = '',
  error = '',
  icon = null,
  className = '',
  ...props
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-white/90 text-sm font-medium mb-2 tracking-wide">
          {label}
        </label>
      )}
      
      <div className="relative w-full">
        {icon && (
          <span className="absolute left-[18px] top-1/2 -translate-y-1/2 text-white/50 text-xl flex items-center pointer-events-none">
            {icon}
          </span>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`
            w-full px-5 py-4 
            bg-[#1D024D] backdrop-blur-md
            border-2 ${error ? 'border-red-500' : 'border-[#9C81BE]'}
            rounded-[14px] text-white text-base
            placeholder:text-white/40
            transition-all duration-300
            focus:outline-none 
            ${error 
              ? 'focus:border-red-500/80 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.1),0_4px_20px_rgba(239,68,68,0.2)] focus:bg-white/12' 
              : 'focus:border-purple-500/80 focus:shadow-[0_0_0_4px_rgba(147,51,234,0.1),0_4px_20px_rgba(147,51,234,0.2)] focus:bg-white/12'
            }
            ${icon ? 'pl-[50px]' : ''}
          `}
          {...props}
        />
      </div>

      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-red-500 text-[13px] font-medium animate-shake">
          <span className="text-base">⚠</span>
          {error}
        </div>
      )}
    </div>
  );
}
