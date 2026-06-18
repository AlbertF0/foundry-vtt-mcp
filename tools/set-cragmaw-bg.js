#!/usr/bin/env node
// Aplica el mapa custom del Castillo Cragmaw como fondo, manteniendo los 392 muros de Plutonium.
const net = require('net');

const message =
  JSON.stringify({
    id: 'set-cragmaw-bg-1',
    method: 'call_tool',
    params: {
      name: 'set-scene-background',
      args: {
        sceneIdentifier: 'Cragmaw Castle (Player Version)',
        imagePath: 'worlds/test/campania/mapas/03b-castillo-cragmaw/CragmawCastleWM_88x64.jpg',
      },
    },
  }) + '\n';

const client = net.createConnection({ host: '127.0.0.1', port: 31414 }, () => {
  console.log('Conectado. Enviando set-scene-background...');
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
      if (resp.id === 'set-cragmaw-bg-1') {
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
