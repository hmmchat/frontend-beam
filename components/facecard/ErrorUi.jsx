import React from 'react'

const ErrorUi = () => {
    return (
        <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none scale-75 md:scale-100 ">
            {/* Layer 3: Largest Glow */}
            <div className="absolute w-14 h-14 rounded-full bg-red-500/60 blur-[2px]" />

            {/* 🔴 OUTER LAYER (bahar se start) */}
            <div className="absolute w-32 h-32 rounded-full bg-red-500/40 blur-[5px]" />


            <div className="absolute w-64 h-64 rounded-full bg-red-500/20 " />

            {/* The Warning Icon */}
            <div className="relative w-5 h-5 bg-red-600 rounded-lg flex items-center justify-center   shadow-[0_0_15px_rgba(220,38,38,0.6)]">
                <div className="w-4 h-4 border-[2px] border-white rounded-sm flex items-center justify-center">
                    <span className="text-white font-black text-xs">!</span>
                </div>
            </div>
        </div>
    )
}

export default ErrorUi


