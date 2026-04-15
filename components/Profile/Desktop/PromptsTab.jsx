"use client";

export default function PromptsTab() {
  const suggestions = [
    "Do you know what happened today in our boy’s GC",
    "Long Day, need to rant",
    "How many stars are there in galaxy?",
    "I want to see someone Dance on Drake",
    "My pizza fell today",
    "Mom scolded today. Need moral support.",
    "My mom cooked epic food today. Soo daymmn fooking good!",
  ];

  return (
    <div className="flex flex-col px-14">
      <div className="border border-white/30 rounded-[2.5rem] p-10 text-center text-sm text-white/90">
        Full-time trash-talker, part-time sniper. Full-time tras Full-time
        trash-talker Full-time trash-talker, part-time sniper.
      </div>

      <div className="text-left mt-8">
        <p className="text-sm mb-4 text-white/70">Suggestions</p>

        <div className="flex flex-wrap gap-3">
          {suggestions.map((text, i) => (
            <div
              key={i}
              className="px-4 py-4 border border-white/30 rounded-xl text-xs border-b-4 hover:bg-white hover:text-black transition cursor-pointer"
            >
              {text}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto -mr-10 flex justify-end">
        <div className="w-10 h-10 border border-white rounded-full flex items-center justify-center cursor-pointer">
          <img src="/refresh.png" alt="refresh" className="p-2" />
        </div>
      </div>
    </div>
  );
}
