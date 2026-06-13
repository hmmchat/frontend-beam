'use client';

export default function ParticipantCluster({ participants }) {
  const items = participants.slice(0, 4);
  if (items.length <= 1) {
    const p = items[0];
    return (
      <div className="w-1 h-1 rounded-full overflow-hidden border-2 border-white/50 bg-gray-200">
        <img src={p?.displayPictureUrl} className="w-full h-full object-cover" alt="" />
      </div>
    );
  }

  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      {items.map((p, i) => {
        let style = { width: '36px', height: '36px' };
        if (items.length === 2) {
          if (i === 0) style = { ...style, top: '7px', left: '7px', zIndex: 10 };
          if (i === 1) style = { ...style, bottom: '7px', right: '7px', zIndex: 20 };
        } else if (items.length === 3) {
          if (i === 0) style = { ...style, top: '0', left: '50%', transform: 'translateX(-50%)', zIndex: 10 };
          if (i === 1) style = { ...style, bottom: '4px', left: '0', zIndex: 20 };
          if (i === 2) style = { ...style, bottom: '4px', right: '0', zIndex: 30 };
        } else {
          // 4 users
          if (i === 0) style = { ...style, top: '0', left: '0', zIndex: 10, width: '32px', height: '32px' };
          if (i === 1) style = { ...style, top: '0', right: '0', zIndex: 20, width: '32px', height: '32px' };
          if (i === 2) style = { ...style, bottom: '0', left: '0', zIndex: 30, width: '32px', height: '32px' };
          if (i === 3) style = { ...style, bottom: '0', right: '0', zIndex: 40, width: '32px', height: '32px' };
        }

        return (
          <div
            key={p.userId || i}
            className="absolute rounded-full overflow-hidden border-2 border-white shadow-xl bg-gray-300"
            style={style}
          >
            <img
              src={p.displayPictureUrl || ''}
              className="w-full h-full object-cover"
              alt=""
              onError={(e) => { e.currentTarget.src = ''; }}
            />
          </div>
        );
      })}
    </div>
  );
}
