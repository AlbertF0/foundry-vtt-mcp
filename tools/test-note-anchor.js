#!/usr/bin/env node
// Crea una nota con headerAnchor y verifica que la flag queda escrita.
const net = require('net');

function call(id, name, args) {
  return new Promise(resolve => {
    const client = net.createConnection({ host: '127.0.0.1', port: 31414 }, () => {
      client.write(JSON.stringify({ id, method: 'call_tool', params: { name, args } }) + '\n');
    });
    let buffer = '';
    client.setEncoding('utf8');
    client.on('data', data => {
      buffer += data;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const resp = JSON.parse(line);
          if (resp.id === id) {
            const txt = resp.result?.content?.[0]?.text ?? JSON.stringify(resp);
            client.end();
            resolve(JSON.parse(txt));
          }
        } catch (e) {}
      }
    });
    client.on('error', err => {
      console.error('Error:', err.message);
      resolve(null);
    });
    setTimeout(() => {
      client.end();
      resolve(null);
    }, 12000);
  });
}

async function main() {
  // Crear nota con anchor
  const created = await call('c1', 'place-scene-notes', {
    sceneIdentifier: 'Cragmaw Hideout (Player Version)',
    notes: [
      {
        journalIdentifier: 'Lost Mine of Phandelver',
        pageName: 'Part 1 — Goblin Arrows',
        headerAnchor: '2.-goblin-blind',
        text: 'TEST anchor',
        gridX: 6,
        gridY: 6,
        icon: 'assets/srd5e/puck/2.webp',
        iconSize: 75,
      },
    ],
  });
  console.log('Creada:', JSON.stringify(created, null, 2));

  // Releer con raw para confirmar la flag
  const notes = await call('r1', 'get-scene-notes', {
    sceneIdentifier: 'Cragmaw Hideout (Player Version)',
    includeRaw: true,
  });
  const test = notes.notes.find(n => n.text === 'TEST anchor');
  console.log('\nFlag de la nota TEST anchor:');
  console.log(JSON.stringify(test?.raw?.flags, null, 2));
}

main().catch(console.error);
