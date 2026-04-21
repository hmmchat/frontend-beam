export default function ErrorAlert({ message }) {
  if (!message) return null;

  return (
    <div className=" relative">
      {/* Glow layers */}


      {/* Error content */}
      <div className="relative flex items-center gap-2 px-2 py-4 rounded-xl animate-shake">
        <div className="
          w-5 h-5
          flex items-center justify-center
          text-white font-bold text-lg
 border-2 border-[#FF0000] text-[9px] rounded-md shadow-[0_0_4px_#FF0000]
        ">
          !
        </div>



        <span className="text-white text-[10px] font-medium">
          {message}
        </span>
      </div>
    </div>
  );
}
