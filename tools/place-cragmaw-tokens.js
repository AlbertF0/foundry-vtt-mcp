#!/usr/bin/env node
// Modo SALA: coloca los tokens de cada sala de Cragmaw en rejilla centrada en su pin.
const net = require('net');
function call(id, name, args) {
  return new Promise(r => {
    const c = net.createConnection({ host: '127.0.0.1', port: 31414 }, () =>
      c.write(JSON.stringify({ id, method: 'call_tool', params: { name, args } }) + '\n')
    );
    let b = '';
    c.setEncoding('utf8');
    c.on('data', d => {
      b += d;
      const ls = b.split('\n');
      b = ls.pop();
      for (const l of ls) {
        if (!l.trim()) continue;
        try {
          const j = JSON.parse(l);
          if (j.id === id) {
            c.end();
            r(JSON.parse(j.result.content[0].text));
          }
        } catch (e) {}
      }
    });
    c.on('error', e => {
      console.error(e.message);
      r(null);
    });
    setTimeout(() => {
      c.end();
      r(null);
    }, 15000);
  });
}
const G = 150; // gridSize
const SCENE = 'Cragmaw Hideout (Player Version)';

// sala -> { cx, cy, creatures:[{actor,count,disp}] }
const rooms = [
  {
    room: '2. Goblin Blind',
    cx: 2250,
    cy: 2550,
    creatures: [{ a: 'Guerrero Goblin', n: 2, d: 'hostile' }],
  },
  { room: '3. Kennel', cx: 2475, cy: 1725, creatures: [{ a: 'Lobo', n: 3, d: 'hostile' }] },
  {
    room: '5. Overpass',
    cx: 2400,
    cy: 750,
    creatures: [{ a: 'Guerrero Goblin', n: 1, d: 'hostile' }],
  },
  {
    room: '6. Goblin Den',
    cx: 750,
    cy: 1125,
    creatures: [
      { a: 'Guerrero Goblin', n: 6, d: 'hostile' },
      { a: 'Sildar Hallinvierno', n: 1, d: 'friendly' },
    ],
  },
  {
    room: '7. Twin Pools Cave',
    cx: 3825,
    cy: 1200,
    creatures: [{ a: 'Guerrero Goblin', n: 3, d: 'hostile' }],
  },
  {
    room: "8. Klarg's Cave",
    cx: 3675,
    cy: 2025,
    creatures: [
      { a: 'Guerrero Bugbear', n: 1, d: 'hostile' },
      { a: 'Lobo', n: 1, d: 'hostile' },
      { a: 'Guerrero Goblin', n: 2, d: 'hostile' },
    ],
  },
];

function layout(cx, cy, flat) {
  const N = flat.length;
  const cols = Math.ceil(Math.sqrt(N));
  const filas = Math.ceil(N / cols);
  const left = cx - (cols * G) / 2; // block top-left
  const top = cy - (filas * G) / 2;
  return flat.map((t, i) => {
    const col = i % cols,
      fila = Math.floor(i / cols);
    return {
      actorIdentifier: t.a,
      disposition: t.d,
      x: Math.round(left + col * G),
      y: Math.round(top + fila * G),
    };
  });
}

(async () => {
  let total = 0;
  for (const rm of rooms) {
    const flat = [];
    for (const c of rm.creatures) for (let k = 0; k < c.n; k++) flat.push({ a: c.a, d: c.d });
    const tokens = layout(rm.cx, rm.cy, flat);
    const res = await call('t' + rm.room, 'place-tokens', { sceneIdentifier: SCENE, tokens });
    total += res ? res.placed : 0;
    console.log(
      (res && res.placed === flat.length ? 'OK ' : 'ERR') +
        ' | ' +
        rm.room.padEnd(18) +
        ' -> ' +
        res.placed +
        ' tokens' +
        (res.failures ? ' FAIL:' + JSON.stringify(res.failures) : '')
    );
  }
  console.log('\nTOTAL colocados:', total);
})();
