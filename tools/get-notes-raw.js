#!/usr/bin/env node
// Vuelca las notas de Cragmaw Hideout con su documento crudo completo (raw).
const net = require('net');

const message =
  JSON.stringify({
    id: 'get-raw-1',
    method: 'call_tool',
    params: {
      name: 'get-scene-notes',
      args: { sceneIdentifier: 'Cragmaw Hideout (Player Version)', includeRaw: true },
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
      if (resp.id === 'get-raw-1') {
        const txt = resp.result?.content?.[0]?.text ?? JSON.stringify(resp);
        const parsed = JSON.parse(txt);
        // Mostrar solo "2. Goblin Blind" y "9. Prueba" para comparar
        const interesting = parsed.notes.filter(
          n => n.text === '2. Goblin Blind' || n.text === '9. Prueba'
        );
        console.log(JSON.stringify(interesting, null, 2));
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
