#!/usr/bin/env node
// Smoke test de place-tokens: coloca Klarg (bugbear) + 3 goblins en Cragmaw Hideout.
const net = require('net');

const message =
  JSON.stringify({
    id: 'test-place-1',
    method: 'call_tool',
    params: {
      name: 'place-tokens',
      args: {
        sceneIdentifier: 'Cragmaw Hideout (Player Version)',
        tokens: [
          {
            actorIdentifier: 'Guerrero Bugbear',
            gridX: 10,
            gridY: 8,
            name: 'Klarg',
            disposition: 'hostile',
          },
          {
            actorIdentifier: 'Guerrero Goblin',
            gridX: 12,
            gridY: 8,
            disposition: 'hostile',
            count: 3,
          },
        ],
      },
    },
  }) + '\n';

const client = net.createConnection({ host: '127.0.0.1', port: 31414 }, () => {
  console.log('Conectado. Enviando place-tokens...');
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
      if (resp.id === 'test-place-1') {
        console.log('Respuesta:');
        console.log(JSON.stringify(resp, null, 2));
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
