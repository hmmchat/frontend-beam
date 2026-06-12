import React from 'react'

const Report = ({ layer = 0 }) => {
    if (layer < 2) return null;

    return (
        <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none scale-75 md:scale-100 ">
            {/* Layer 3: Largest Glow */}
            {layer >= 3 && (
                <div className="absolute w-64 h-64 rounded-full bg-red-500/20 " />
            )}

            {/* Layer 2: Medium Glow */}
            {layer >= 2 && (
                <div className="absolute w-32 h-32 rounded-full bg-red-500/40 blur-[5px]" />
            )}

            {/* Layer 1: Smallest Glow */}
            {layer >= 1 && (
                <div className="absolute w-14 h-14 rounded-full bg-red-500/60 blur-[2px]" />
            )}

            {/* The Warning Icon */}
            <div className="relative w-5 h-5 bg-red-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.6)]">
                <div className="w-4 h-4 border-[2px] border-white rounded-sm flex items-center justify-center">
                    <span className="text-white font-black text-xs">!</span>
                </div>
            </div>
        </div>
    )
}

export default Report
