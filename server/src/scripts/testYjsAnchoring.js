import * as Y from 'yjs';

console.log('[Test] Starting Yjs CRDT Anchoring Verification...');

// 1. Create a Yjs Document and a root text type
const ydoc = new Y.Doc();
const ytext = ydoc.getText('document');

// 2. Insert initial text
ytext.insert(0, 'The quick brown fox jumps over the lazy dog.');
console.log(`[Test] Initial text: "${ytext.toString()}"`);

// 3. Create a RelativePosition anchor for the word "fox"
// "fox" starts at index 16. We create an absolute position and convert to relative.
const absoluteIndex = 16;
const relativePos = Y.createRelativePositionFromTypeIndex(ytext, absoluteIndex);

console.log(`[Test] Anchored relative position at index ${absoluteIndex} (word: 'fox')`);

// 4. Simulate User A inserting text BEFORE the anchor
ytext.insert(4, 'very '); // Inserts at index 4 (before 'quick')
console.log(`[Test] After inserting 'very ': "${ytext.toString()}"`);

// 5. Restore the absolute index from the relative position
let newAbsolutePos = Y.createAbsolutePositionFromRelativePosition(relativePos, ydoc);
console.log(`[Test] New absolute index of anchor is: ${newAbsolutePos.index}`);
console.log(`[Test] Expected index: 16 + 5 = 21. Actual: ${newAbsolutePos.index}`);
if (newAbsolutePos.index !== 21) {
  console.error('[Test] FAILED: Anchor did not shift correctly after insertion.');
  process.exit(1);
}

// 6. Simulate User B deleting text BEFORE the anchor
ytext.delete(0, 4); // Deletes 'The '
console.log(`[Test] After deleting 'The ': "${ytext.toString()}"`);

// 7. Restore the absolute index again
newAbsolutePos = Y.createAbsolutePositionFromRelativePosition(relativePos, ydoc);
console.log(`[Test] New absolute index of anchor is: ${newAbsolutePos.index}`);
console.log(`[Test] Expected index: 21 - 4 = 17. Actual: ${newAbsolutePos.index}`);
if (newAbsolutePos.index !== 17) {
  console.error('[Test] FAILED: Anchor did not shift correctly after deletion.');
  process.exit(1);
}

// 8. Test string slice at the new anchor to verify it still points to 'fox'
const wordAtAnchor = ytext.toString().substring(newAbsolutePos.index, newAbsolutePos.index + 3);
console.log(`[Test] Word at anchored index: '${wordAtAnchor}' (Expected: 'fox')`);
if (wordAtAnchor !== 'fox') {
  console.error('[Test] FAILED: Anchor does not point to the correct word.');
  process.exit(1);
}

console.log('[Test] PASSED: Y.RelativePosition perfectly tracks collaborative CRDT edits.');
process.exit(0);
