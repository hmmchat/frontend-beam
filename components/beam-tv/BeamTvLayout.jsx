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
      <div className="w-full h-full flex flex-col md:flex-row gap-2">
        {renderTile(tiles[0], 0)}
        {renderTile(tiles[1], 1)}
      </div>
    );
  }

  if (tiles.length === 3) {
    return (
      // Mobile: all stacked. Desktop: first tile left, two stacked right.
      <div className="w-full h-full flex flex-col md:flex-row gap-2">
        {renderTile(tiles[0], 0)}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          {renderTile(tiles[1], 1)}
          {renderTile(tiles[2], 2)}
        </div>
      </div>
    );
  }

  // 4+ tiles: 2-col grid on both mobile and desktop
  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2">
      {tiles.slice(0, 4).map((t, i) => renderTile(t, i))}
    </div>
  );
}
