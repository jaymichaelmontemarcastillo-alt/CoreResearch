import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const paginationPluginKey = new PluginKey('pagination');

export const AutoPagination = Extension.create({
  name: 'autoPagination',

  addOptions() {
    return {
      contentHeight: 864, // Default content height in px (e.g. 1056 - 96 top - 96 bottom)
      gapHeight: 40, // Visual workspace gap between pages
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
              const { contentHeight, gapHeight } = this.options;
              
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
                    const isExplicitBreak = node.type.name === 'horizontalRule' && 
                                            domNode.classList.contains('page-break');

                    const style = window.getComputedStyle(domNode);
                    const marginTop = parseFloat(style.marginTop) || 0;
                    const marginBottom = parseFloat(style.marginBottom) || 0;
                    
                    // DOM Measurement Compensation (Subtract known widget heights)
                    const injectedGaps = domNode.querySelectorAll('.page-break-gap');
                    const rawHeight = domNode.offsetHeight + marginTop + marginBottom;
                    const trueHeight = rawHeight - (injectedGaps.length * 40); // 40px is the gap height

                    // If explicit break
                    if (isExplicitBreak) {
                      const remainingSpace = Math.max(0, contentHeight - accumulatedHeight);
                      const widget = document.createElement('div');
                      widget.className = 'page-break-widget block-break';
                      widget.contentEditable = 'false';
                      widget.style.width = '100%';
                      widget.style.display = 'block';

                      const spacer = document.createElement('div');
                      spacer.style.height = `${remainingSpace}px`;
                      spacer.style.backgroundColor = 'transparent';
                      widget.appendChild(spacer);

                      const gap = document.createElement('div');
                      gap.className = 'page-break-gap';
                      widget.appendChild(gap);
                      
                      domNode.style.display = 'none'; // hide the original hr
                      
                      decorations.push(
                        Decoration.widget(offset, widget, {
                          key: `page-break-${pageCount}-${offset}`,
                          side: -1
                        })
                      );
                      
                      accumulatedHeight = 0;
                      pageCount++;
                    } 
                    // Natural Page Break: True content overflows the page boundary
                    else if (accumulatedHeight + trueHeight > contentHeight && accumulatedHeight > 0) {
                      
                      const remainingSpace = Math.max(0, contentHeight - accumulatedHeight);
                      let injected = false;

                      if (node.isTextblock) {
                        // Adjust visual coordinate lookup to account for currently rendered gaps
                        let visualRemainingSpace = remainingSpace;
                        Array.from(injectedGaps).forEach(gap => {
                          if (gap.offsetTop < visualRemainingSpace) {
                            visualRemainingSpace += 40;
                          }
                        });

                        const nodeTop = domNode.getBoundingClientRect().top;
                        const breakViewportY = nodeTop + visualRemainingSpace;
                        const leftEdge = domNode.getBoundingClientRect().left + 10;
                        
                        const resolvedPos = view.posAtCoords({ left: leftEdge, top: breakViewportY });
                        
                        if (resolvedPos && resolvedPos.pos > offset && resolvedPos.pos < offset + node.nodeSize) {
                          let finalPos = resolvedPos.pos;
                          
                          // Smart word-tearing protection
                          const textNode = view.state.doc.textBetween(offset, offset + node.nodeSize, '\n');
                          const relativePos = finalPos - offset - 1;
                          
                          if (relativePos > 0 && relativePos < textNode.length) {
                             if (textNode[relativePos] !== ' ' && textNode[relativePos - 1] !== ' ') {
                                // Find nearest space backwards to snap the break cleanly
                                let spaceIdx = textNode.lastIndexOf(' ', relativePos);
                                if (spaceIdx > -1) {
                                   finalPos = offset + 1 + spaceIdx + 1; // Put break after the space
                                }
                             }
                          }

                          const widget = document.createElement('span');
                          widget.className = 'page-break-widget inline-break';
                          widget.contentEditable = 'false';
                          
                          const gap = document.createElement('span');
                          gap.className = 'page-break-gap';
                          widget.appendChild(gap);

                          decorations.push(
                            Decoration.widget(finalPos, widget, {
                              key: `page-break-inline-${pageCount}-${finalPos}`,
                              side: -1
                            })
                          );
                          injected = true;
                          
                          // The remaining content belongs to the next page
                          accumulatedHeight = trueHeight - remainingSpace;
                          pageCount++;
                        }
                      } 
                      
                      // Fallback: Block Pushing (Tables, Images, or posAtCoords failed)
                      if (!injected) {
                        const widget = document.createElement('div');
                        widget.className = 'page-break-widget block-break fallback-break';
                        widget.contentEditable = 'false';
                        widget.style.width = '100%';
                        widget.style.display = 'block';

                        const spacer = document.createElement('div');
                        spacer.style.height = `${remainingSpace}px`;
                        spacer.style.backgroundColor = 'transparent';
                        widget.appendChild(spacer);

                        const gap = document.createElement('div');
                        gap.className = 'page-break-gap';
                        widget.appendChild(gap);

                        decorations.push(
                          Decoration.widget(offset, widget, {
                            key: `page-break-${pageCount}-${offset}`,
                            side: -1
                          })
                        );
                        
                        accumulatedHeight = trueHeight;
                        pageCount++;
                      }
                    } else {
                      accumulatedHeight += trueHeight;
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
