import { Extension } from '@tiptap/core';
import { Mark } from '@tiptap/core';
import HorizontalRuleBase from '@tiptap/extension-horizontal-rule';
import { TableCell } from '@tiptap/extension-table-cell';

export const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['\"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
});

export const LineSpacing = Extension.create({
  name: 'lineSpacing',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: element => element.style.lineHeight || null,
            renderHTML: attributes => {
              if (!attributes.lineHeight) {
                return {};
              }
              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
          // spaceBefore (margin-top) — matches client ParagraphSpacing extension
          spaceBefore: {
            default: null,
            parseHTML: element => element.style.marginTop || null,
            renderHTML: attributes => {
              if (!attributes.spaceBefore) {
                return {};
              }
              return {
                style: `margin-top: ${attributes.spaceBefore}`,
              };
            },
          },
          // spaceAfter (margin-bottom) — matches client ParagraphSpacing extension
          spaceAfter: {
            default: null,
            parseHTML: element => element.style.marginBottom || null,
            renderHTML: attributes => {
              if (!attributes.spaceAfter) {
                return {};
              }
              return {
                style: `margin-bottom: ${attributes.spaceAfter}`,
              };
            },
          },
        },
      },
    ];
  },
});

export const Indentation = Extension.create({
  name: 'indentation',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textIndent: {
            default: null,
            parseHTML: element => element.style.textIndent || null,
            renderHTML: attributes => {
              if (!attributes.textIndent) {
                return {};
              }
              return {
                style: `text-indent: ${attributes.textIndent}`,
              };
            },
          },
          marginLeft: {
            default: null,
            parseHTML: element => element.style.marginLeft || null,
            renderHTML: attributes => {
              if (!attributes.marginLeft) {
                return {};
              }
              return {
                style: `margin-left: ${attributes.marginLeft}`,
              };
            },
          },
          marginRight: {
            default: null,
            parseHTML: element => element.style.marginRight || null,
            renderHTML: attributes => {
              if (!attributes.marginRight) {
                return {};
              }
              return {
                style: `margin-right: ${attributes.marginRight}`,
              };
            },
          },
        },
      },
    ];
  },
});

export const HorizontalRule = HorizontalRuleBase.extend({
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        },
      },
    };
  },
});

/**
 * Custom TableCell with background shading & border color support
 * Matches client-side CustomTableCell in DocumentEditor.jsx
 */
export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.style.backgroundColor || element.getAttribute('data-bg-color') || null,
        renderHTML: attributes => {
          if (!attributes.backgroundColor) return {};
          return {
            style: `background-color: ${attributes.backgroundColor}`,
            'data-bg-color': attributes.backgroundColor,
          };
        },
      },
      borderColor: {
        default: null,
        parseHTML: element => element.style.borderColor || element.getAttribute('data-border-color') || null,
        renderHTML: attributes => {
          if (!attributes.borderColor) return {};
          return {
            style: `border-color: ${attributes.borderColor}`,
            'data-border-color': attributes.borderColor,
          };
        },
      },
    };
  },
});
