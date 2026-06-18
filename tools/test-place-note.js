#!/usr/bin/env node
// Smoke test de place-scene-notes: una nota "9. Prueba" enlazada a la página Part 1.
const net = require('net');

const message =
  JSON.stringify({
    id: 'test-note-1',
    method: 'call_tool',
    params: {
      name: 'place-scene-notes',
      args: {
        sceneIdentifier: 'Cragmaw Hideout (Player Version)',
        notes: [
          {
            journalIdentifier: 'Lost Mine of Phandelver',
            pageName: 'Part 1 — Goblin Arrows',
            text: '9. Prueba',
            gridX: 5,
            gridY: 5,
            icon: 'assets/srd5e/puck/9.webp',
            iconSize: 75,
          },
        ],
      },
    },
  }) + '\n';

const client = net.createConnection({ host: '127.0.0.1', port: 31414 }, () => {
  client.write(message);
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
      if (resp.id === 'test-note-1') {
        const txt = resp.result?.content?.[0]?.text ?? JSON.stringify(resp);
        console.log(JSON.stringify(JSON.parse(txt), null, 2));
        client.end();
        process.exit(0);
      }
    } catch (e) {}
  }
});
client.on('error', err => {
  console.error('Error:', err.message);
  process.exit(1);
});
setTimeout(() => {
  console.error('Timeout');
  client.end();
  process.exit(1);
}, 15000);
