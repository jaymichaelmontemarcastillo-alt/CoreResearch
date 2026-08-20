import { HocuspocusProvider, HocuspocusProviderWebsocket } from '../../../client/node_modules/@hocuspocus/provider/dist/hocuspocus-provider.esm.js';
import * as Y from 'yjs';
import WebSocket from 'ws';

async function testHocuspocusCollaboration() {
  console.log('Testing Hocuspocus multi-client document sync with HocuspocusProviderWebsocket...');

  const doc1 = new Y.Doc();
  const doc2 = new Y.Doc();

  const room = 'manuscript-test-integration-123';
  const token = 'dev-token-student-01-student';

  const websocketProvider = new HocuspocusProviderWebsocket({
    url: 'ws://localhost:5000/collaboration',
    WebSocketPolyfill: WebSocket,
    quiet: true
  });

  const p1 = new HocuspocusProvider({
    websocketProvider,
    name: room,
    document: doc1,
    token: token,
    quiet: true
  });

  const p2 = new HocuspocusProvider({
    websocketProvider,
    name: room,
    document: doc2,
    token: token,
    quiet: true
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      p1.destroy();
      p2.destroy();
      websocketProvider.destroy();
      reject(new Error('Sync timeout between two clients after 8000ms'));
    }, 8000);

    let p1Connected = false;
    let p2Connected = false;
    let hasSentUpdate = false;

    const checkReadyAndTest = () => {
      if (p1Connected && p2Connected && !hasSentUpdate) {
        hasSentUpdate = true;
        console.log('✅ Both providers connected and synced! Sending edit from Client 1...');
        const ytext1 = doc1.getText('default');
        ytext1.insert(0, 'Hello from Client 1!');
      }
    };

    p1.on('status', ({ status }) => {
      console.log(`Provider 1 status: ${status}`);
    });
    p2.on('status', ({ status }) => {
      console.log(`Provider 2 status: ${status}`);
    });

    p1.on('authenticated', () => {
      console.log('Provider 1 authenticated');
      p1Connected = true;
      checkReadyAndTest();
    });

    p2.on('authenticated', () => {
      console.log('Provider 2 authenticated');
      p2Connected = true;
      checkReadyAndTest();
    });

    doc2.on('update', () => {
      const text = doc2.getText('default').toString();
      console.log(`Doc 2 received live update: "${text}"`);
      if (text.includes('Hello from Client 1!')) {
        console.log('✅ Real-time Yjs synchronization between Provider 1 and Provider 2 verified!');
        clearTimeout(timeout);
        p1.destroy();
        p2.destroy();
        websocketProvider.destroy();
        resolve(true);
      }
    });
  });
}

testHocuspocusCollaboration()
  .then(() => {
    console.log('🎉 Full collaboration test completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Collaboration test failed:', err);
    process.exit(1);
  });
