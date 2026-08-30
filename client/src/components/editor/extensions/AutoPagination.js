import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const paginationPluginKey = new PluginKey('pagination');

/**
 * AutoPagination Extension
 * 
 * Renders document content as visually separated physical pages using ProseMirror
 * decoration widgets. The document model remains flat (no page containers in Yjs),
 * preserving collaboration safety. Pagination is purely a rendering concern.
 * 
 * Key features:
 * - Physical page dimensions via CSS units (mm/in)
 * - Mid-paragraph text splitting across pages
 * - Explicit page break support (hr.page-break)
 * - Image/font load-triggered recalculation
 * - Debounced to avoid layout thrashing
 */
export const AutoPagination = Extension.create({
  name: 'autoPagination',

  addOptions() {
    return {
      contentHeight: 864,    // Content height in px (page height - top margin - bottom margin)
      pageHeight: 1056,      // Total page height in px
      marginTop: 96,         // Top margin in px
      marginBottom: 96,      // Bottom margin in px
      marginLeft: 96,        // Left margin in px
      marginRight: 96,       // Right margin in px
      pageWidth: 816,        // Total page width in px
      gapHeight: 40,         // Visual workspace gap between pages
    };
  },

  addProseMirrorPlugins() {
    const extensionThis = this;

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
          let recalcTimer = null;
          let lastRecalcTime = 0;
          const MIN_RECALC_INTERVAL = 100; // ms between recalculations

          const scheduleRecalc = () => {
            if (view.isDestroyed) return;
            if (recalcTimer) cancelAnimationFrame(recalcTimer);
            
            const now = Date.now();
            const timeSinceLastRecalc = now - lastRecalcTime;
            
            if (timeSinceLastRecalc < MIN_RECALC_INTERVAL) {
              // Debounce: wait before recalculating
              setTimeout(() => {
                if (!view.isDestroyed) {
                  recalcTimer = requestAnimationFrame(() => performRecalc());
                }
              }, MIN_RECALC_INTERVAL - timeSinceLastRecalc);
            } else {
              recalcTimer = requestAnimationFrame(() => performRecalc());
            }
          };

          const performRecalc = () => {
            if (view.isDestroyed) return;
            lastRecalcTime = Date.now();

            const {
              contentHeight,
              pageHeight,
              marginTop,
              marginBottom,
              marginLeft,
              marginRight,
              pageWidth,
              gapHeight,
            } = extensionThis.options;

            let accumulatedHeight = 0;
            let pageCount = 1;
            const decorations = [];

            // Iterate through top-level document nodes
            view.state.doc.forEach((node, offset) => {
              const domNode = view.nodeDOM(offset);
              if (!(domNode instanceof HTMLElement)) return;

              const isExplicitBreak =
                node.type.name === 'horizontalRule' &&
                (domNode.classList.contains('page-break') ||
                  node.attrs?.class === 'page-break');

              // Measure true height excluding any previously injected gap widgets
              const style = window.getComputedStyle(domNode);
              const nodeMarginTop = parseFloat(style.marginTop) || 0;
              const nodeMarginBottom = parseFloat(style.marginBottom) || 0;
              const rawHeight = domNode.offsetHeight + nodeMarginTop + nodeMarginBottom;

              // Subtract heights of any previously injected gap widgets inside this node
              const injectedGaps = domNode.querySelectorAll('.page-break-gap');
              let gapCorrection = 0;
              injectedGaps.forEach(() => { gapCorrection += gapHeight; });
              const trueHeight = rawHeight - gapCorrection;

              // --- Explicit Page Break ---
              if (isExplicitBreak) {
                const remainingSpace = Math.max(0, contentHeight - accumulatedHeight);
                decorations.push(
                  Decoration.widget(offset, () => {
                    return createPageBreakWidget(remainingSpace, gapHeight, marginTop, marginBottom, marginLeft, marginRight, pageWidth, true);
                  }, {
                    key: `pb-explicit-${pageCount}-${offset}`,
                    side: -1,
                    destroy: (dom) => { dom.remove(); }
                  })
                );
                // Hide the original HR
                domNode.style.display = 'none';
                accumulatedHeight = 0;
                pageCount++;
                return;
              }

              // --- Natural Page Break ---
              if (accumulatedHeight + trueHeight > contentHeight && accumulatedHeight > 0) {
                const remainingSpace = Math.max(0, contentHeight - accumulatedHeight);
                let injected = false;

                // Try mid-paragraph splitting for text blocks
                if (node.isTextblock && trueHeight > 0 && remainingSpace > 20) {
                  const splitResult = attemptMidParagraphSplit(
                    view, domNode, node, offset, remainingSpace, gapHeight,
                    marginTop, marginBottom, marginLeft, marginRight, pageWidth, pageCount,
                    injectedGaps
                  );
                  
                  if (splitResult) {
                    decorations.push(splitResult.decoration);
                    injected = true;
                    // After splitting, the remaining content goes to the next page
                    accumulatedHeight = trueHeight - remainingSpace;
                    if (accumulatedHeight < 0) accumulatedHeight = 0;
                    pageCount++;
                  }
                }

                // Fallback: push entire block to next page
                if (!injected) {
                  // Only push to next page if the block isn't taller than a full page itself,
                  // or if it's taller, let it span (don't infinitely push it)
                  if (trueHeight <= contentHeight || accumulatedHeight > 0) {
                    decorations.push(
                      Decoration.widget(offset, () => {
                        return createPageBreakWidget(remainingSpace, gapHeight, marginTop, marginBottom, marginLeft, marginRight, pageWidth, false);
                      }, {
                        key: `pb-block-${pageCount}-${offset}`,
                        side: -1,
                        destroy: (dom) => { dom.remove(); }
                      })
                    );
                    accumulatedHeight = trueHeight;
                    pageCount++;
                  } else {
                    // It's a massive block (e.g. huge table) at the top of a page.
                    // We must let it flow into the accumulated height without injecting a break *before* it.
                    accumulatedHeight += trueHeight;
                  }
                }
              } else {
                accumulatedHeight += trueHeight;
              }

              // Check if a single node spans multiple pages (very long paragraph)
              // After the first split, the remaining height might still exceed a full page
              while (accumulatedHeight > contentHeight) {
                // This node continues past another page boundary
                accumulatedHeight -= contentHeight;
                pageCount++;
                // We don't add visible decorations here because the mid-paragraph 
                // split already handles the visual break for the first overflow.
                // Additional overflows create logical page increments.
              }
            });

            // Build final decoration set
            const decos = DecorationSet.create(view.state.doc, decorations);

            // Only dispatch if decorations actually changed (prevent infinite loops)
            const currentState = paginationPluginKey.getState(view.state);
            const currentDecosArr = currentState?.decorations ? currentState.decorations.find() : [];
            const newDecosArr = decos.find();

            let changed = newDecosArr.length !== currentDecosArr.length;
            if (!changed) {
              for (let i = 0; i < newDecosArr.length; i++) {
                if (newDecosArr[i].from !== currentDecosArr[i].from ||
                    newDecosArr[i].to !== currentDecosArr[i].to) {
                  changed = true;
                  break;
                }
              }
            }

            if (changed || pageCount !== (currentState?.pageCount || 1)) {
              view.dispatch(
                view.state.tr.setMeta(paginationPluginKey, {
                  decorations: decos,
                  pageCount,
                })
              );
            }
          };

          // Listen for image load events to trigger recalculation
          const handleLoad = () => scheduleRecalc();
          view.dom.addEventListener('load', handleLoad, true);
          
          // Wait for custom fonts to load (fonts change line heights drastically)
          if (document.fonts) {
            document.fonts.ready.then(() => {
              scheduleRecalc();
            });
          }

          // Initial load delay to let DOM elements and Yjs sync settle
          setTimeout(() => {
            scheduleRecalc();
          }, 300);

          return {
            update: (view, prevState) => {
              // Recalculate on document changes
              if (!prevState.doc.eq(view.state.doc)) {
                scheduleRecalc();
                return;
              }

              // Also recalculate on forced meta
              const meta = view.state.tr.getMeta?.(paginationPluginKey);
              if (meta && meta.forceRecalc) {
                scheduleRecalc();
              }
            },
            destroy: () => {
              view.dom.removeEventListener('load', handleLoad, true);
              if (recalcTimer) cancelAnimationFrame(recalcTimer);
            },
          };
        },
      }),
    ];
  },
});

/**
 * Attempt to split a text block paragraph at the page boundary.
 * Uses posAtCoords to find the text position where the page break should occur.
 */
function attemptMidParagraphSplit(
  view, domNode, node, offset, remainingSpace, gapHeight,
  marginTop, marginBottom, marginLeft, marginRight, pageWidth, pageCount,
  existingGaps
) {
  try {
    // Calculate the visual Y coordinate where the page break should fall
    const nodeRect = domNode.getBoundingClientRect();
    
    // Account for any existing gap widgets above the break point
    let visualOffset = remainingSpace;
    if (existingGaps) {
      Array.from(existingGaps).forEach(gap => {
        const gapRect = gap.getBoundingClientRect();
        if (gapRect.top < nodeRect.top + visualOffset) {
          visualOffset += gapHeight;
        }
      });
    }

    const breakY = nodeRect.top + visualOffset;
    const leftEdge = nodeRect.left + 10;

    const resolvedPos = view.posAtCoords({ left: leftEdge, top: breakY });

    if (!resolvedPos || resolvedPos.pos <= offset || resolvedPos.pos >= offset + node.nodeSize) {
      return null; // posAtCoords failed or returned position outside this node
    }

    let finalPos = resolvedPos.pos;

    // Word-tearing protection: snap to nearest word boundary
    const textContent = view.state.doc.textBetween(offset, offset + node.nodeSize, '\n');
    const relativePos = finalPos - offset - 1;

    if (relativePos > 0 && relativePos < textContent.length) {
      if (textContent[relativePos] !== ' ' && textContent[relativePos - 1] !== ' ') {
        // Find nearest space backwards
        const spaceIdx = textContent.lastIndexOf(' ', relativePos);
        if (spaceIdx > -1 && spaceIdx > relativePos * 0.3) {
          // Only snap if the space isn't too far back (avoid pushing too much)
          finalPos = offset + 1 + spaceIdx + 1;
        }
      }
    }

    // Create the inline page-break widget
    const decoration = Decoration.widget(finalPos, () => {
      const widget = document.createElement('div');
      widget.className = 'page-break-widget inline-break';
      widget.contentEditable = 'false';
      widget.style.width = '100%';
      widget.style.display = 'block';
      widget.style.position = 'relative';
      widget.style.pointerEvents = 'none';
      widget.style.userSelect = 'none';

      // Bottom margin of current page
      const bottomSpacer = document.createElement('div');
      bottomSpacer.style.height = `${marginBottom}px`;
      bottomSpacer.style.backgroundColor = 'transparent';
      widget.appendChild(bottomSpacer);

      // Gray workspace gap
      const gap = document.createElement('div');
      gap.className = 'page-break-gap';
      gap.style.height = `${gapHeight}px`;
      widget.appendChild(gap);

      // Top margin of next page
      const topSpacer = document.createElement('div');
      topSpacer.style.height = `${marginTop}px`;
      topSpacer.style.backgroundColor = 'transparent';
      widget.appendChild(topSpacer);

      return widget;
    }, {
      key: `pb-inline-${pageCount}-${finalPos}`,
      side: -1,
      destroy: (dom) => { dom.remove(); }
    });

    return { decoration, splitPos: finalPos };
  } catch (err) {
    // posAtCoords or DOM measurement failed — return null for fallback
    return null;
  }
}

/**
 * Create a page-break widget element that visually separates pages.
 * Consists of: remaining-space spacer → bottom margin → gray gap → top margin
 */
function createPageBreakWidget(
  remainingSpace, gapHeight, marginTop, marginBottom, marginLeft, marginRight, pageWidth, isExplicit
) {
  const widget = document.createElement('div');
  widget.className = `page-break-widget block-break ${isExplicit ? 'explicit-break' : 'natural-break'}`;
  widget.contentEditable = 'false';
  widget.style.width = '100%';
  widget.style.display = 'block';
  widget.style.position = 'relative';
  widget.style.pointerEvents = 'none';
  widget.style.userSelect = 'none';

  // Remaining space on the current page (pushes content to bottom of page)
  if (remainingSpace > 0) {
    const spacer = document.createElement('div');
    spacer.style.height = `${remainingSpace}px`;
    spacer.style.backgroundColor = 'transparent';
    widget.appendChild(spacer);
  }

  // Bottom margin of current page
  const bottomMargin = document.createElement('div');
  bottomMargin.style.height = `${marginBottom}px`;
  bottomMargin.style.backgroundColor = 'transparent';
  widget.appendChild(bottomMargin);

  // Gray workspace gap (visually separates pages)
  const gap = document.createElement('div');
  gap.className = 'page-break-gap';
  gap.style.height = `${gapHeight}px`;
  widget.appendChild(gap);

  // Top margin of next page
  const topMargin = document.createElement('div');
  topMargin.style.height = `${marginTop}px`;
  topMargin.style.backgroundColor = 'transparent';
  widget.appendChild(topMargin);

  return widget;
}
