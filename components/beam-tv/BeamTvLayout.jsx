'use client';

export default function BeamTvLayout({ remoteStreams, renderTile }) {
  const tiles = remoteStreams || [];

  if (tiles.length === 1) {
    // Single tile — full screen, no padding needed
    return (
      <div className="w-full h-full flex">
        {renderTile(tiles[0], 0)}
      </div>
    );
  }

  if (tiles.length === 2) {
    return (

      // Mobile: stack vertically (portrait). Desktop: side by side.
      <div className="w-full h-full flex flex-col md:flex-row md:gap-2">
        {renderTile(tiles[0], 0)}
        {renderTile(tiles[1], 1)}
      </div>
    );
  }

  if (tiles.length === 3) {
    return (
      // Mobile: 1 top (above, 58.2%), 2 bottom (below, side-by-side). Desktop: first tile left, two stacked right.
      <div className="w-full h-full flex flex-col md:flex-row md:gap-2">
        <div className="h-[58.2%] md:h-full w-full md:flex-1 flex">
          {renderTile(tiles[0], 0)}
        </div>
        <div className="flex flex-row md:flex-col flex-1 min-h-0 min-w-0 md:gap-2 h-[41.8%] md:h-full">
          <div className="flex-1 min-h-0 min-w-0 relative flex">
            {renderTile(tiles[1], 1)}
          </div>
          <div className="flex-1 min-h-0 min-w-0 relative flex">
            {renderTile(tiles[2], 2)}
          </div>
        </div>
      </div>
    );
  }

  // 4+ tiles: 2-col grid on both mobile and desktop
  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 md:gap-2">
      {tiles.slice(0, 4).map((t, i) => renderTile(t, i))}
    </div>
  );
}
