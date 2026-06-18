#!/usr/bin/env node
// Localiza el nivel de encabezado y anchor de las secciones de mapa que faltan.
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
const J = 'zRMrDy1ROKgzjvue';
const targets = {
  '0000000000000000': ['The Sword Coast', 'Adventure Background'],
  '0000000000000002': ['Redbrand Hideout', 'Tresendar Manor'],
  '0000000000000003': ['Ruins of Thundertree', 'Cragmaw Castle'],
};
function slug(s) {
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '');
}

(async () => {
  for (const pid of Object.keys(targets)) {
    const res = await call('x' + pid, 'list-journals', { journalId: J, pageId: pid });
    const html = Array.isArray(res) ? JSON.parse(res[0].text).page.content : res.page.content;
    console.log('\n=== page ...' + pid.slice(-2) + ' ===');
    for (const name of targets[pid]) {
      // Buscar el span entry-title-inner con ese texto y mirar el ve-rd__h--N que lo precede
      const spanIdx = html.indexOf('>' + name + '</span>');
      let level = '?';
      if (spanIdx >= 0) {
        const before = html.slice(Math.max(0, spanIdx - 200), spanIdx);
        const lm = before.match(/ve-rd__h--(\d)/g);
        if (lm) level = lm[lm.length - 1];
      }
      const sl = slug(name);
      const uuidPresent = html.includes('#' + sl + ']');
      console.log(
        '  ' +
          name.padEnd(24) +
          ' header=' +
          (spanIdx >= 0 ? 'SI' : 'no') +
          ' nivel=' +
          level +
          ' anchor=' +
          sl +
          ' uuidLink=' +
          uuidPresent
      );
    }
  }
})();
