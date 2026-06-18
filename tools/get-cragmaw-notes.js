#!/usr/bin/env node
// Inspecciona las notas de Cragmaw Hideout con estructura completa.
const net = require('net');

const message =
  JSON.stringify({
    id: 'get-notes-1',
    method: 'call_tool',
    params: {
      name: 'get-scene-notes',
      args: { sceneIdentifier: 'Cragmaw Hideout (Player Version)' },
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
      if (resp.id === 'get-notes-1') {
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
