// src/services/editorConnector.js
// Utilities for communicating with the ONLYOFFICE Document Editor
// via the Connector / Automation API across the iframe boundary.

/**
 * Returns the ONLYOFFICE connector instance.
 * The React <DocumentEditor> component registers the editor on window.DocEditor.instances.
 * Fallback: access the editor API element by id.
 */
export function getConnector() {
  try {
    // Method 1: Access via DocEditor instances (standard React wrapper approach)
    if (window.DocEditor && window.DocEditor.instances) {
      const keys = Object.keys(window.DocEditor.instances);
      if (keys.length > 0) {
        const editorInstance = window.DocEditor.instances[keys[0]];
        if (editorInstance && typeof editorInstance.createConnector === 'function') {
          return editorInstance.createConnector();
        }
      }
    }

    // Method 2: Try accessing by known element ID
    const editorFrame = document.getElementById('onlyoffice-editor');
    if (editorFrame && typeof editorFrame.createConnector === 'function') {
      return editorFrame.createConnector();
    }

    console.warn('[editorConnector] Could not find ONLYOFFICE editor instance.');
    return null;
  } catch (err) {
    console.error('[editorConnector] Error creating connector:', err);
    return null;
  }
}

/**
 * Get the currently selected text from the editor.
 * Returns a Promise<string> with the selected text, or empty string if nothing selected.
 */
export function getSelectedText() {
  return new Promise((resolve) => {
    const connector = getConnector();
    if (!connector) {
      resolve('');
      return;
    }
    try {
      connector.executeMethod('GetSelectedText', [], (text) => {
        resolve(text || '');
      });
    } catch (err) {
      console.warn('[editorConnector] GetSelectedText failed:', err);
      resolve('');
    }
  });
}

/**
 * Add a Content Control wrapping the current selection in the editor.
 * Used to create an anchor that can be navigated to later.
 * Returns a Promise<string|null> with the Content Control's InternalId.
 *
 * Type 1 = Block Content Control (wraps paragraph)
 * Type 2 = Inline Content Control (wraps selection within a paragraph)
 */
export function addContentControlAtSelection(tag) {
  return new Promise((resolve) => {
    const connector = getConnector();
    if (!connector) {
      resolve(null);
      return;
    }
    try {
      // First add the content control
      connector.executeMethod(
        'AddContentControl',
        [2, { Tag: tag, Lock: 0, Color: { R: 255, G: 195, B: 0 } }],
        (controlData) => {
          if (controlData && controlData.InternalId) {
            resolve(controlData.InternalId);
          } else {
            resolve(tag); // fallback to tag as identifier
          }
        }
      );
    } catch (err) {
      console.warn('[editorConnector] AddContentControl failed:', err);
      resolve(null);
    }
  });
}

/**
 * Navigate/scroll the editor to a Content Control by its InternalId or Tag.
 * Uses callCommand to execute Document Builder script inside the editor.
 */
export function navigateToContentControl(controlIdOrTag) {
  return new Promise((resolve) => {
    const connector = getConnector();
    if (!connector) {
      resolve(false);
      return;
    }
    try {
      connector.callCommand(
        function () {
          var oDocument = Api.GetDocument();
          var controls = oDocument.GetAllContentControls();
          for (var i = 0; i < controls.length; i++) {
            var ctrl = controls[i];
            var props = ctrl.GetProperties ? ctrl.GetProperties() : null;
            if (props) {
              var tag = props.Tag || '';
              var internalId = props.InternalId || '';
              if (tag === arguments[0] || internalId === arguments[0]) {
                var range = ctrl.GetRange(0, ctrl.GetRange().End);
                if (range && range.Select) {
                  range.Select();
                }
                return true;
              }
            }
          }
          return false;
        },
        true, // run asynchronously
        (result) => {
          resolve(!!result);
        },
        controlIdOrTag
      );
    } catch (err) {
      console.warn('[editorConnector] navigateToContentControl failed:', err);
      resolve(false);
    }
  });
}

/**
 * Fallback navigation: search for specific text in the document and select the first match.
 * Useful when a Content Control was removed or the document was heavily edited.
 */
export function navigateToText(searchText) {
  return new Promise((resolve) => {
    const connector = getConnector();
    if (!connector) {
      resolve(false);
      return;
    }
    try {
      connector.callCommand(
        function () {
          var oDocument = Api.GetDocument();
          var results = oDocument.Search(arguments[0]);
          if (results && results.length > 0) {
            results[0].Select();
            return true;
          }
          return false;
        },
        true,
        (result) => {
          resolve(!!result);
        },
        searchText
      );
    } catch (err) {
      console.warn('[editorConnector] navigateToText failed:', err);
      resolve(false);
    }
  });
}

/**
 * Navigate/scroll the editor to a specific comment by its ID.
 */
export function navigateToComment(commentId) {
  return new Promise((resolve) => {
    const connector = getConnector();
    if (!connector) {
      resolve(false);
      return;
    }
    try {
      connector.executeMethod('MoveToComment', [commentId], () => {
        resolve(true);
      });
    } catch (err) {
      console.warn('[editorConnector] navigateToComment failed:', err);
      resolve(false);
    }
  });
}

export default {
  getConnector,
  getSelectedText,
  addContentControlAtSelection,
  navigateToContentControl,
  navigateToText,
  navigateToComment,
};
