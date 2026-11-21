// Nightshade: The Gilded Gallery — the three floors. Each floor is an ASCII map, 32 by 20:
//
//   #  wall (blocks movement and sight)      .  lit floor (guards spot you faster)
//   ,  shadow floor (guards spot you slower) C  display case (cover: blocks movement and sight)
//   p  plant hedge (cover: blocks movement and sight)
//   R  relic pedestal    E  exit door    S  player start    L  lamp (lit floor, light pool)
//
// Guard patrols are tile waypoints walked in a loop, pausing at each stop to look around.

export const TILE_LEGEND = {
  WALL: '#',
  FLOOR: '.',
  SHADOW: ',',
  CASE: 'C',
  PLANT: 'p',
  RELIC: 'R',
  EXIT: 'E',
  START: 'S',
  LAMP: 'L',
};

const LEVEL_1_MAP = [
  '################################',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,E#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,.L..,,,,,,,.L..,,,,,,,,,#',
  '#,,,,,,.CC.,,,,,,,.CC.,,,,,,,,,#',
  '#,,,,,,....,,,,,,,....,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#..,,,,,,,,,,CC,,,,,,,,,,,,,,,,#',
  '#..,,,,,,,,,,,,,,,,,,,,,R,,,,,,#',
  '#..,,,,,,,,,,CC,,,,,,,,,,,,,,,,#',
  '#..,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,.L..,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,R....,,,.CC.,,,,,,,,#',
  '#,,,,,,,,....,,,,,,.CC.,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#..,,,,,,,,,,,,,,,,,,,,,,R,,,,,#',
  '#..,,,,,,,,,,CC,,,,,,,,,,,,,,,,#',
  '#..,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#S,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '################################',
];

const LEVEL_2_MAP = [
  '################################',
  '#S,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,R,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,.L..,,,,pp,,,,,,,,,#',
  '#,,,,,,.CC.,,,,,,,,,,,,,,,,R,,,#',
  '#,,,,,,....,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,pp,,,,,#',
  '#,,,,,,,,,,,CC,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,.L#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,..#',
  '###############,,###############',
  '#,,,,pp,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,CC,,,,,,,,,,,#',
  '#,,.L..,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,....,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,CC,,,,#',
  '#,,,,,,,,pp,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,..R.,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,E#',
  '################################',
];

const LEVEL_3_MAP = [
  '################################',
  '#S,,,,,,,,,,,,,,,,,,,,,,,,,,,R,#',
  '#,,,,,,,,,#,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,#,,,.L..,,,,,,,,,,,,,#',
  '#,,,,,,,,,#,,,,,,,,,CC,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,pp,,,#',
  '#,.L..,,,,#,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,CC,,,#,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,#,,,,,R.,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,pp,#',
  '#,,,,,,,CC,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,.L..,,,#',
  '########,,,,########,###########',
  '#,,,,,pp,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,CC,,,,,,,#',
  '#,,,,,,,,,,,.L..,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,....,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,R,,,#',
  '#E,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '################################',
];

export const LEVELS = [
  {
    name: 'The Gilded Gallery',
    brief: 'Three relics glow in the gallery. Take them all, then slip out the north door.',
    map: LEVEL_1_MAP,
    relicNames: ['Sun Opal', 'Moon Pearl', 'Star Sapphire'],
    guards: [
      { waypoints: [[8, 6], [24, 6], [24, 17], [8, 17]], pause: 1.2 },
      { waypoints: [[5, 10], [26, 10], [26, 3], [5, 3]], pause: 1.6 },
    ],
  },
  {
    name: 'The Vault of Echoes',
    brief: 'A wall splits the vault. One narrow gap joins the halls — time your crossing.',
    map: LEVEL_2_MAP,
    relicNames: ['Jade Scarab', 'Ivory Mask', 'Obsidian Idol'],
    guards: [
      { waypoints: [[3, 8], [28, 8], [28, 2], [3, 2]], pause: 1.0 },
      { waypoints: [[14, 3], [14, 9], [22, 9], [22, 5], [14, 5]], pause: 1.4 },
      { waypoints: [[3, 17], [28, 17], [28, 13], [3, 13]], pause: 1.2 },
    ],
  },
  {
    name: 'The Crown Vault',
    brief: 'Four guards, two chokepoints, one crown. Stay in the dark and be patient.',
    map: LEVEL_3_MAP,
    relicNames: ['Gilded Crown', 'Ember Ruby', 'Frost Diamond'],
    guards: [
      { waypoints: [[3, 4], [7, 4], [7, 8], [3, 8]], pause: 1.0 },
      { waypoints: [[14, 6], [26, 6], [26, 10], [14, 10]], pause: 1.2 },
      { waypoints: [[12, 3], [12, 9], [18, 9], [18, 3]], pause: 1.5 },
      { waypoints: [[4, 15], [28, 15], [28, 17], [4, 17]], pause: 1.0 },
    ],
  },
];

/** Parse one ASCII map into tiles, the player start, relic spots, lamps and the exit. */
export function parseLevel(level, cols, rows) {
  const tiles = [];
  const relics = [];
  const lamps = [];
  let start = null;
  let exit = null;
  for (let row = 0; row < rows; row += 1) {
    const line = level.map[row];
    if (line === undefined || line.length !== cols) {
      throw new Error(`level ${level.name}: row ${row} is ${line === undefined ? 'missing' : line.length + ' wide'}, expected ${cols}`);
    }
    const rowTiles = [];
    for (let col = 0; col < cols; col += 1) {
      const ch = line[col];
      let tile = ch;
      if (ch === TILE_LEGEND.START) {
        start = { col, row };
        tile = TILE_LEGEND.SHADOW;
      } else if (ch === TILE_LEGEND.RELIC) {
        relics.push({ col, row, name: level.relicNames[relics.length] ?? `Relic ${relics.length + 1}` });
        tile = TILE_LEGEND.FLOOR;
      } else if (ch === TILE_LEGEND.EXIT) {
        exit = { col, row };
        tile = TILE_LEGEND.FLOOR;
      } else if (ch === TILE_LEGEND.LAMP) {
        lamps.push({ col, row });
        tile = TILE_LEGEND.FLOOR;
      }
      rowTiles.push(tile);
    }
    tiles.push(rowTiles);
  }
  if (start === null) throw new Error(`level ${level.name}: no player start (S)`);
  if (exit === null) throw new Error(`level ${level.name}: no exit (E)`);
  if (relics.length !== level.relicNames.length) {
    throw new Error(`level ${level.name}: found ${relics.length} relics, expected ${level.relicNames.length}`);
  }
  return { tiles, relics, lamps, start, exit };
}

/** A tile blocks movement and sight (walls, cases, plant hedges). */
export function isSolidTile(tile) {
  return tile === TILE_LEGEND.WALL || tile === TILE_LEGEND.CASE || tile === TILE_LEGEND.PLANT;
}
