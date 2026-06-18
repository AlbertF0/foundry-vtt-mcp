#!/usr/bin/env node
// Borra el pin genérico antiguo de Cragmaw y coloca el pin genérico grande (120) en las 7 escenas.
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

// scene -> { page, anchor (null=top de Introduction), width, height, gridSize, label }
const J = 'Lost Mine of Phandelver';
const scenes = [
  {
    scene: 'The Sword Coast (Player Version)',
    page: 'Introduction',
    anchor: null,
    w: 2648,
    h: 3625,
    g: 143,
    label: 'The Sword Coast',
  },
  {
    scene: 'Cragmaw Hideout (Player Version)',
    page: 'Part 1 — Goblin Arrows',
    anchor: 'cragmaw-hideout',
    w: 4500,
    h: 3136,
    g: 150,
    label: 'Cragmaw Hideout',
  },
  {
    scene: 'Phandalin (Player Version)',
    page: 'Part 2 — Phandalin',
    anchor: 'phandalin',
    w: 4000,
    h: 2788,
    g: 69,
    label: 'Phandalin',
  },
  {
    scene: 'Redbrand Hideout (Player Version)',
    page: 'Part 2 — Phandalin',
    anchor: 'redbrand-hideout',
    w: 4500,
    h: 3136,
    g: 150,
    label: 'Redbrand Hideout',
  },
  {
    scene: 'Ruins of Thundertree (Player Version)',
    page: "Part 3 — The Spider's Web",
    anchor: 'ruins-of-thundertree',
    w: 9000,
    h: 6272,
    g: 150,
    label: 'Ruins of Thundertree',
  },
  {
    scene: 'Cragmaw Castle (Player Version)',
    page: "Part 3 — The Spider's Web",
    anchor: 'cragmaw-castle',
    w: 4500,
    h: 3136,
    g: 144,
    label: 'Cragmaw Castle',
  },
  {
    scene: 'Wave Echo Cave (Player Version)',
    page: 'Part 4 — Wave Echo Cave',
    anchor: 'wave-echo-cave',
    w: 9000,
    h: 12272,
    g: 121,
    label: 'Wave Echo Cave',
  },
];

(async () => {
  // 1) Borra el pin genérico viejo de Cragmaw (size 50): localizar por text 'Cragmaw Hideout'
  const cra = await call('gc', 'get-scene-notes', {
    sceneIdentifier: 'Cragmaw Hideout (Player Version)',
  });
  const old = (cra.notes || []).filter(n => n.text === 'Cragmaw Hideout');
  if (old.length) {
    const del = await call('dc', 'delete-scene-notes', {
      sceneIdentifier: 'Cragmaw Hideout (Player Version)',
      noteIds: old.map(n => n.id),
    });
    console.log('Borrado pin viejo de Cragmaw:', del.deleted);
  }

  // 2) Coloca el pin genérico grande en cada escena
  for (const s of scenes) {
    const note = {
      journalIdentifier: J,
      pageName: s.page,
      text: s.label,
      icon: 'icons/svg/book.svg',
      iconSize: 120,
      x: s.g,
      y: s.h - s.g,
    };
    if (s.anchor) note.headerAnchor = s.anchor;
    const res = await call('p' + s.label, 'place-scene-notes', {
      sceneIdentifier: s.scene,
      notes: [note],
    });
    const ok = res && res.placed === 1;
    console.log(
      (ok ? 'OK ' : 'ERR') +
        ' | ' +
        s.label.padEnd(22) +
        ' -> ' +
        s.page +
        (s.anchor ? ' #' + s.anchor : ' (top)') +
        (res && res.failures ? ' FAIL:' + JSON.stringify(res.failures) : '')
    );
  }
})();
