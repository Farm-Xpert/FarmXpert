import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import nodemailer from 'nodemailer';
import { test } from 'node:test';

import { connectSmtpIpv4 } from '../src/modules/auth/mail.js';

test('Nodemailer SMTP sockets connect over IPv4', async (t) => {
  let remoteFamily;
  const server = net.createServer((socket) => {
    remoteFamily = socket.remoteFamily;
    socket.write('220 localhost ESMTP\r\n');
    socket.on('data', (data) => {
      for (const line of data.toString().split('\r\n')) {
        if (line.startsWith('EHLO ')) socket.write('250 localhost\r\n');
        if (line === 'QUIT') socket.write('221 bye\r\n');
      }
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());

  const transporter = nodemailer.createTransport({
    host: 'localhost',
    port: server.address().port,
    getSocket: connectSmtpIpv4,
    connectionTimeout: 1000,
  });
  t.after(() => transporter.close());

  assert.equal(await transporter.verify(), true);
  assert.equal(remoteFamily, 'IPv4');
});
