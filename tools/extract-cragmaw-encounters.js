#!/usr/bin/env node
// Extrae, por sala de Cragmaw (Part 1), las referencias a criaturas (UUID Actor + texto).
const fs = require('fs');
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
function strip(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

(async () => {
  const res = await call('p', 'list-journals', {
    journalId: 'zRMrDy1ROKgzjvue',
    pageId: '0000000000000001',
  });
  const html = Array.isArray(res) ? JSON.parse(res[0].text).page.content : res.page.content;
  const rooms = [
    '1. Cave Mouth',
    '2. Goblin Blind',
    '3. Kennel',
    '4. Steep Passage',
    '5. Overpass',
    '6. Goblin Den',
    '7. Twin Pools Cave',
    "8. Klarg's Cave",
  ];
  // localizar el índice de cada header de sala
  const idxs = rooms.map(rm => ({ rm, i: html.indexOf('data-roll-name-ancestor="' + rm + '"') }));
  for (let k = 0; k < idxs.length; k++) {
    const start = idxs[k].i;
    const end = k + 1 < idxs.length ? idxs[k + 1].i : html.length;
    const seg = html.slice(start, end);
    // UUID Actor links
    const links = [...seg.matchAll(/@UUID\[Actor\.([A-Za-z0-9]+)\]\{([^}]+)\}/g)].map(
      m => m[2] + ' (' + m[1] + ')'
    );
    // &Creature or compendium refs
    const creat = [...seg.matchAll(/&Creature\[([^\]]+)\]/g)].map(m => m[1]);
    const txt = strip(seg);
    console.log('\n===== ' + idxs[k].rm + ' =====');
    console.log('UUID Actor links:', links.length ? links.join(', ') : '(ninguno)');
    if (creat.length) console.log('&Creature refs:', creat.join(', '));
    console.log('TEXTO:', txt.slice(0, 700));
  }
})();
