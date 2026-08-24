import WebSocket from 'ws';
import * as Y from 'yjs';

async function testWebSocketConnection() {
  console.log('Testing WebSocket connection to ws://localhost:5000/collaboration...');
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:5000/collaboration');

    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error('Connection timed out after 5000ms'));
    }, 5000);

    ws.on('open', () => {
      console.log('✅ Successfully opened WebSocket connection to ws://localhost:5000/collaboration');
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      console.error('❌ WebSocket error:', err.message);
      reject(err);
    });
  });
}

testWebSocketConnection()
  .then(() => {
    console.log('✅ WebSocket test passed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ WebSocket test failed:', err);
    process.exit(1);
  });
