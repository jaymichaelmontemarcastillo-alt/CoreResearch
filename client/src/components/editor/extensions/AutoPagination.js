import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const paginationPluginKey = new PluginKey('pagination');

export const AutoPagination = Extension.create({
  name: 'autoPagination',

  addOptions() {
    return {
      contentHeight: 864, // Default content height in px (e.g. 1056 - 96 top - 96 bottom)
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: paginationPluginKey,
        state: {
          init() {
            return { decorations: DecorationSet.empty, pageCount: 1 };
          },
          apply(tr, oldState) {
            const meta = tr.getMeta(paginationPluginKey);
            if (meta && meta.decorations !== undefined) {
              return meta;
            }
            if (tr.docChanged) {
              return { ...oldState, decorations: oldState.decorations.map(tr.mapping, tr.doc) };
            }
            return oldState;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorations || DecorationSet.empty;
          },
        },
        view: (view) => {
          const scheduleUpdate = () => {
            // Force a plugin state update to trigger recalculation when images load
            if (!view.isDestroyed) {
              view.dispatch(view.state.tr.setMeta(paginationPluginKey, { forceRecalc: Date.now() }));
            }
          };
          
          // Use capture phase to catch image load events bubbling up
          view.dom.addEventListener('load', scheduleUpdate, true);

          return {
            update: (view, prevState) => {
              const { contentHeight } = this.options;
              
              // Recalculate if document changed OR if a forceRecalc was triggered
              const meta = view.state.tr.getMeta(paginationPluginKey);
              if (prevState.doc.eq(view.state.doc) && (!meta || !meta.forceRecalc)) {
                return;
              }

              // Defer measurement until after the DOM has updated
              requestAnimationFrame(() => {
                if (view.isDestroyed) return;

                let accumulatedHeight = 0;
                let pageCount = 1;
                const decorations = [];

                view.state.doc.forEach((node, offset) => {
                  const domNode = view.nodeDOM(offset);
                  if (domNode instanceof HTMLElement) {
                    // Check for explicit page break from LibreOffice
                    const isExplicitBreak = node.type.name === 'horizontalRule' && 
                                            domNode.classList.contains('page-break');

                    const style = window.getComputedStyle(domNode);
                    const marginTop = parseFloat(style.marginTop) || 0;
                    const marginBottom = parseFloat(style.marginBottom) || 0;
                    const nodeTotalHeight = domNode.offsetHeight + marginTop + marginBottom;

                    // If it's an explicit break, OR adding this node exceeds the page height
                    if (isExplicitBreak || (accumulatedHeight + nodeTotalHeight > contentHeight && accumulatedHeight > 0)) {
                      const widget = document.createElement('div');
                      widget.className = 'page-break page-break-decoration';
                      widget.contentEditable = 'false';
                      
                      decorations.push(
                        Decoration.widget(offset, widget, {
                          key: `page-break-${pageCount}-${offset}`,
                          side: -1
                        })
                      );
                      
                      // This node starts the next page
                      accumulatedHeight = isExplicitBreak ? 0 : nodeTotalHeight;
                      pageCount++;
                    } else {
                      accumulatedHeight += nodeTotalHeight;
                    }
                  }
                });

                const decos = DecorationSet.create(view.state.doc, decorations);
                
                // Prevent infinite loops by only dispatching if decorations changed
                const currentDecos = paginationPluginKey.getState(view.state);
                const decosArr = decos.find();
                const currentDecosArr = currentDecos.decorations ? currentDecos.decorations.find() : [];
                
                let changed = decosArr.length !== currentDecosArr.length;
                if (!changed) {
                  for (let i = 0; i < decosArr.length; i++) {
                    if (decosArr[i].from !== currentDecosArr[i].from) {
                      changed = true;
                      break;
                    }
                  }
                }

                if (changed || pageCount !== currentDecos.pageCount) {
                  view.dispatch(view.state.tr.setMeta(paginationPluginKey, { decorations: decos, pageCount }));
                }
              });
            },
            destroy: () => {
              view.dom.removeEventListener('load', scheduleUpdate, true);
            }
          };
        }
      }),
    ];
  },
});
