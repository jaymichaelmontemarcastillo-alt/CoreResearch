import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ReplaceStep, ReplaceAroundStep, AddMarkStep, RemoveMarkStep, RemoveNodeMarkStep, AttrStep } from "@tiptap/pm/transform";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { deepEqualIterative, footerClickEvent, getCustomPages, getFooter, getFooterHeight, getHeader, getHeaderHeight, getHeight, headerClickEvent, updateCssVariables } from "./utils";

const page_count_meta_key = "PAGE_COUNT_META_KEY";
const key = new PluginKey('brDecoration');

function buildDecorations(doc) {
    const decorations = [];
    doc.descendants((node, pos) => {
        if (node.type.name === 'hardBreak') {
            const afterPos = pos + 1;
            const widget = Decoration.widget(afterPos, () => {
                const el = document.createElement('span');
                el.classList.add('rm-br-decoration');
                return el;
            });
            decorations.push(widget);
        }
    });
    return DecorationSet.create(doc, decorations);
}

const defaultPageConfig = {
    enabled: true,
    pageBreakBackground: "#ffffff",
    pageHeight: 800,
    pageWidth: 789,
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 50,
    marginRight: 50,
    pageGap: 50,
    contentMarginTop: 10,
    contentMarginBottom: 10,
    footerRight: "{page}",
    footerLeft: "",
    headerRight: "",
    headerLeft: "",
    customHeader: {},
    customFooter: {},
};

const defaultOptions = Object.assign({ pageGapBorderSize: 1, pageGapBorderColor: "#e5e5e5" }, defaultPageConfig);

const refreshPage = (targetNode, paginationEnabled = true) => {
    var _a;
    const paginationElement = targetNode.querySelector("[data-rm-pagination]");
    if (paginationEnabled) {
        targetNode.removeAttribute("rm-pagination-disabled");
        if (paginationElement) {
            const lastPageBreak = (_a = paginationElement.lastElementChild) === null || _a === void 0 ? void 0 : _a.querySelector(".breaker");
            if (lastPageBreak) {
                const minHeight = lastPageBreak.offsetTop + lastPageBreak.offsetHeight;
                targetNode.style.minHeight = `calc(${minHeight}px + 2px)`;
            }
        }
    }
    else {
        targetNode.setAttribute("rm-pagination-disabled", "");
        targetNode.style.minHeight = `auto`;
    }
};

const getPageConfig = (_storage, _currentOptions) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    const pageConfig = {
        enabled: (_a = _storage.enabled) !== null && _a !== void 0 ? _a : defaultOptions.enabled,
        pageBreakBackground: (_b = _storage.pageBreakBackground) !== null && _b !== void 0 ? _b : defaultOptions.pageBreakBackground,
        pageHeight: (_c = _storage.pageHeight) !== null && _c !== void 0 ? _c : defaultOptions.pageHeight,
        pageWidth: (_d = _storage.pageWidth) !== null && _d !== void 0 ? _d : defaultPageConfig.pageWidth,
        marginTop: (_e = _storage.marginTop) !== null && _e !== void 0 ? _e : defaultPageConfig.marginTop,
        marginBottom: (_f = _storage.marginBottom) !== null && _f !== void 0 ? _f : defaultPageConfig.marginBottom,
        marginLeft: (_g = _storage.marginLeft) !== null && _g !== void 0 ? _g : defaultPageConfig.marginLeft,
        marginRight: (_h = _storage.marginRight) !== null && _h !== void 0 ? _h : defaultPageConfig.marginRight,
        pageGap: (_j = _storage.pageGap) !== null && _j !== void 0 ? _j : defaultPageConfig.pageGap,
        contentMarginTop: (_k = _storage.contentMarginTop) !== null && _k !== void 0 ? _k : defaultPageConfig.contentMarginTop,
        contentMarginBottom: (_l = _storage.contentMarginBottom) !== null && _l !== void 0 ? _l : defaultPageConfig.contentMarginBottom,
        footerRight: (_m = _storage.footerRight) !== null && _m !== void 0 ? _m : defaultPageConfig.footerRight,
        footerLeft: (_o = _storage.footerLeft) !== null && _o !== void 0 ? _o : defaultPageConfig.footerLeft,
        headerRight: (_p = _storage.headerRight) !== null && _p !== void 0 ? _p : defaultPageConfig.headerRight,
        headerLeft: (_q = _storage.headerLeft) !== null && _q !== void 0 ? _q : defaultPageConfig.headerLeft,
        customHeader: (_r = _storage.customHeader) !== null && _r !== void 0 ? _r : defaultPageConfig.customHeader,
        customFooter: (_s = _storage.customFooter) !== null && _s !== void 0 ? _s : defaultPageConfig.customFooter,
    };
    return {
        config: pageConfig,
        options: Object.assign(Object.assign({}, _currentOptions), pageConfig)
    };
};

const getPageConfigFromOptions = (_currentOptions) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    return {
        enabled: (_a = _currentOptions.enabled) !== null && _a !== void 0 ? _a : defaultOptions.enabled,
        pageBreakBackground: (_b = _currentOptions.pageBreakBackground) !== null && _b !== void 0 ? _b : defaultOptions.pageBreakBackground,
        pageHeight: (_c = _currentOptions.pageHeight) !== null && _c !== void 0 ? _c : defaultOptions.pageHeight,
        pageWidth: (_d = _currentOptions.pageWidth) !== null && _d !== void 0 ? _d : defaultPageConfig.pageWidth,
        marginTop: (_e = _currentOptions.marginTop) !== null && _e !== void 0 ? _e : defaultPageConfig.marginTop,
        marginBottom: (_f = _currentOptions.marginBottom) !== null && _f !== void 0 ? _f : defaultPageConfig.marginBottom,
        marginLeft: (_g = _currentOptions.marginLeft) !== null && _g !== void 0 ? _g : defaultPageConfig.marginLeft,
        marginRight: (_h = _currentOptions.marginRight) !== null && _h !== void 0 ? _h : defaultPageConfig.marginRight,
        pageGap: (_j = _currentOptions.pageGap) !== null && _j !== void 0 ? _j : defaultPageConfig.pageGap,
        contentMarginTop: (_k = _currentOptions.contentMarginTop) !== null && _k !== void 0 ? _k : defaultPageConfig.contentMarginTop,
        contentMarginBottom: (_l = _currentOptions.contentMarginBottom) !== null && _l !== void 0 ? _l : defaultPageConfig.contentMarginBottom,
        footerRight: (_m = _currentOptions.footerRight) !== null && _m !== void 0 ? _m : defaultPageConfig.footerRight,
        footerLeft: (_o = _currentOptions.footerLeft) !== null && _o !== void 0 ? _o : defaultPageConfig.footerLeft,
        headerRight: (_p = _currentOptions.headerRight) !== null && _p !== void 0 ? _p : defaultPageConfig.headerRight,
        headerLeft: (_q = _currentOptions.headerLeft) !== null && _q !== void 0 ? _q : defaultPageConfig.headerLeft,
        customHeader: (_r = _currentOptions.customHeader) !== null && _r !== void 0 ? _r : defaultPageConfig.customHeader,
        customFooter: (_s = _currentOptions.customFooter) !== null && _s !== void 0 ? _s : defaultPageConfig.customFooter,
    };
};

const paginationKey = new PluginKey("pagination");

export const PaginationPlus = Extension.create({
    name: "PaginationPlus",
    addOptions() {
        return defaultOptions;
    },
    addStorage() {
        return Object.assign(Object.assign({}, defaultOptions), { headerHeight: new Map(), footerHeight: new Map(), appliedConfig: defaultPageConfig });
    },
    onCreate() {
        const { options: _currentOptions } = getPageConfig(this.storage, this.options);
        const pageConfig = getPageConfigFromOptions(this.options);
        const targetNode = this.editor.view.dom;
        targetNode.classList.add("rm-with-pagination");
        targetNode.style.border = `1px solid var(--rm-page-gap-border-color)`;
        targetNode.style.paddingLeft = `var(--rm-margin-left)`;
        targetNode.style.paddingRight = `var(--rm-margin-right)`;
        targetNode.style.width = `var(--rm-page-width)`;
        updateCssVariables(targetNode, Object.assign(Object.assign({}, _currentOptions), pageConfig));
        const style = document.createElement("style");
        style.dataset.rmPaginationStyle = "";
        style.textContent = `
      .rm-pagination-gap{
        border-top: 1px solid;
        border-bottom: 1px solid;
        border-color: var(--rm-page-gap-border-color);
      }
      .rm-with-pagination,
      .rm-with-pagination .rm-first-page-header {
        counter-reset: page-number page-number-plus 1;
      }
      .rm-with-pagination .image-plus-wrapper,
      .rm-with-pagination .table-plus td,
      .rm-with-pagination .table-plus th {
        max-height: var(--rm-max-content-child-height);
        overflow-y: auto;
      }
      .rm-with-pagination .image-plus-wrapper {
        overflow-y: visible;
      }
      .rm-with-pagination .rm-page-break {
        counter-increment: page-number page-number-plus;
      }
      
      .rm-with-pagination .rm-page-break:last-child .rm-pagination-gap {
        display: none;
      }
      .rm-with-pagination .rm-page-break:last-child .rm-page-header {
        display: none;
      }
      
      .rm-with-pagination table tr td,
      .rm-with-pagination table tr th {
        word-break: break-all;
      }
      .rm-with-pagination table > tr {
        display: grid;
        min-width: 100%;
      }
      .rm-with-pagination table {
        border-collapse: collapse;
        width: 100%;
        display: contents;
      }
      .rm-with-pagination table tbody{
        display: table;
        max-height: 300px;
        overflow-y: auto;
      }
      .rm-with-pagination table tbody > tr{
        display: table-row !important;
      }
      .rm-with-pagination *:has(>br.ProseMirror-trailingBreak:only-child) {
        display: table;
        width: 100%;
      }
      .rm-with-pagination .rm-br-decoration {
        display: table;
        width: 100%;
      }
      .rm-with-pagination .table-row-group {
        max-height: var(--rm-max-content-child-height);
        overflow-y: auto;
        width: 100%;
      }
      .rm-with-pagination .rm-page-footer-left,
      .rm-with-pagination .rm-page-footer-right,
      .rm-with-pagination .rm-page-header-left,
      .rm-with-pagination .rm-page-header-right {
        display: inline-block;
      }
      
      .rm-with-pagination .rm-page-header-left,
      .rm-with-pagination .rm-page-footer-left{
        float: left;
        margin-left: var(--rm-margin-left);
      }
      .rm-with-pagination .rm-page-header-right,
      .rm-with-pagination .rm-page-footer-right{
        float: right;
        margin-right: var(--rm-margin-right);
      }
      .rm-with-pagination .rm-first-page-header .rm-page-header-right{
        margin-right: 0px !important;
      }
      .rm-with-pagination .rm-first-page-header .rm-page-header-left{
        margin-left: 0px !important;
      }
      .rm-with-pagination .rm-page-number::before {
        content: counter(page-number);
      }
      .rm-with-pagination .rm-page-number-plus::before {
        content: counter(page-number-plus);
      }
      .rm-with-pagination .rm-page-header,
      .rm-with-pagination .rm-page-footer{
        width: 100%;
      }
      .rm-with-pagination .rm-page-header{
        padding-bottom: var(--rm-content-margin-top) !important;
        padding-top: var(--rm-margin-top) !important;
        display: inline-flex;
        justify-content: space-between;
        max-height: calc(calc(var(--rm-page-height) * 0.45) - var(--rm-margin-top) - var(--rm-content-margin-top));
        overflow-y: hidden;
      }
      .rm-with-pagination .rm-page-footer{
        padding-top: var(--rm-content-margin-bottom) !important;
        padding-bottom: var(--rm-margin-bottom) !important;
        display: inline-flex;
        justify-content: space-between;
        max-height: calc(calc(var(--rm-page-height) * 0.45) - var(--rm-content-margin-bottom) - var(--rm-margin-bottom));
        overflow-y: hidden;
      }
      .rm-with-pagination[rm-pagination-disabled] {
        padding-top: var(--rm-margin-top) !important;
        padding-bottom: var(--rm-margin-bottom) !important;
      }
    `;
        document.head.appendChild(style);
        refreshPage(targetNode, _currentOptions.enabled);
    },
    addProseMirrorPlugins() {
        const editor = this.editor;
        const storage = this.storage;
        return [
            new Plugin({
                key: paginationKey,
                state: {
                    init: (_, state) => {
                        const _currentOptions = getPageConfigFromOptions(this.options);
                        const pageConfig = getPageConfigFromOptions(this.options);
                        const widgetList = createDecoration(Object.assign(Object.assign({}, this.options), _currentOptions), new Map(), new Map());
                        storage.pageBreakBackground = _currentOptions.pageBreakBackground;
                        storage.pageHeight = _currentOptions.pageHeight;
                        storage.pageWidth = _currentOptions.pageWidth;
                        storage.marginTop = _currentOptions.marginTop;
                        storage.marginBottom = _currentOptions.marginBottom;
                        storage.marginLeft = _currentOptions.marginLeft;
                        storage.marginRight = _currentOptions.marginRight;
                        storage.pageGap = _currentOptions.pageGap;
                        storage.contentMarginTop = _currentOptions.contentMarginTop;
                        storage.contentMarginBottom = _currentOptions.contentMarginBottom;
                        storage.footerRight = _currentOptions.footerRight;
                        storage.footerLeft = _currentOptions.footerLeft;
                        storage.headerRight = _currentOptions.headerRight;
                        storage.headerLeft = _currentOptions.headerLeft;
                        storage.customHeader = _currentOptions.customHeader;
                        storage.customFooter = _currentOptions.customFooter;
                        storage.headerHeight = new Map();
                        storage.footerHeight = new Map();
                        storage.appliedConfig = pageConfig;
                        return {
                            decorations: DecorationSet.create(state.doc, widgetList),
                        };
                    },
                    apply: (tr, oldDeco, oldState, newState) => {
                        const { options: _currentOptions, config: pageConfig } = getPageConfig(storage, this.options);
                        if (storage.enabled === storage.appliedConfig.enabled && storage.enabled === false && storage.appliedConfig.enabled === false) {
                            return oldDeco;
                        }
                        const pageCount = getNewPageCount(editor.view, Object.assign(Object.assign({}, _currentOptions), pageConfig));
                        const currentPageCount = getExistingPageCount(editor.view);
                        
                        const getNewDecoration = () => {
                            const { options: _currentOptions, config: pageConfig } = getPageConfig(storage, this.options);
                            updateCssVariables(editor.view.dom, _currentOptions);
                            let headerHeight = "headerHeight" in this.storage ? this.storage.headerHeight : new Map();
                            let footerHeight = "footerHeight" in this.storage ? this.storage.footerHeight : new Map();
                            const widgetList = createDecoration(Object.assign(Object.assign({}, _currentOptions), pageConfig), headerHeight, footerHeight);
                            storage.appliedConfig = pageConfig;
                            storage.headerHeight = headerHeight;
                            storage.footerHeight = footerHeight;
                            return {
                                decorations: DecorationSet.create(newState.doc, [...widgetList]),
                                footerHeight
                            };
                        };
                        
                        if (
                        (pageCount > 1 ? pageCount : 1) !== currentPageCount ||
                            storage.enabled !== storage.appliedConfig.enabled ||
                            storage.pageBreakBackground !== storage.appliedConfig.pageBreakBackground ||
                            storage.pageHeight !== storage.appliedConfig.pageHeight ||
                            storage.pageWidth !== storage.appliedConfig.pageWidth ||
                            storage.marginTop !== storage.appliedConfig.marginTop ||
                            storage.marginBottom !== storage.appliedConfig.marginBottom ||
                            storage.marginLeft !== storage.appliedConfig.marginLeft ||
                            storage.marginRight !== storage.appliedConfig.marginRight ||
                            storage.pageGap !== storage.appliedConfig.pageGap ||
                            storage.contentMarginTop !== storage.appliedConfig.contentMarginTop ||
                            storage.contentMarginBottom !== storage.appliedConfig.contentMarginBottom ||
                            storage.headerLeft !== storage.appliedConfig.headerLeft ||
                            storage.headerRight !== storage.appliedConfig.headerRight ||
                            storage.footerLeft !== storage.appliedConfig.footerLeft ||
                            storage.footerRight !== storage.appliedConfig.footerRight ||
                            !deepEqualIterative(storage.appliedConfig.customHeader, storage.customHeader) ||
                            !deepEqualIterative(storage.appliedConfig.customFooter, storage.customFooter)) {
                            return getNewDecoration();
                        }
                        return oldDeco;
                    },
                },
                props: {
                    decorations(state) {
                        var _a;
                        return (_a = this.getState(state)) === null || _a === void 0 ? void 0 : _a.decorations;
                    },
                },
                view: (editorView) => {
                    return {
                        update: (view) => {
                            // DEBOUNCE / BATCH MEASUREMENT LOGIC
                            if (view.dom.dataset.rmPaginationMeasuring) return;
                            view.dom.dataset.rmPaginationMeasuring = "true";
                            
                            requestAnimationFrame(() => {
                                view.dom.dataset.rmPaginationMeasuring = "";
                                if (view.isDestroyed) return;

                                if (view.dom.dataset.paginationReady !== "true") return;

                                const { options: _currentOptions, config: pageConfig } = getPageConfig(storage, this.options);
                                if (!pageConfig.enabled && !view.dom.hasAttribute("rm-pagination-disabled")) {
                                    refreshPage(view.dom, false);
                                    return;
                                }
                                
                                const pageCount = getNewPageCount(view, Object.assign(Object.assign({}, _currentOptions), pageConfig));
                                const currentPageCount = getExistingPageCount(view);
                                
                                if (currentPageCount !== pageCount) {
                                    const tr = view.state.tr.setMeta(page_count_meta_key, { footerHeight: undefined });
                                    view.dispatch(tr);
                                    return;
                                }
                                
                                const headerHeight = getHeaderHeight(view.dom, getCustomPages(_currentOptions.customHeader, {}), "content");
                                const footerHeight = getFooterHeight(view.dom, getCustomPages({}, _currentOptions.customFooter), "content");
                                const footerHeightForCurrentPages = new Map();
                                for (let i = 0; i <= pageCount; i++) {
                                    if (footerHeight.has(i)) {
                                        footerHeightForCurrentPages.set(i, footerHeight.get(i) || 0);
                                    }
                                }
                                const headerHeightForCurrentPages = new Map();
                                for (let i = 0; i <= pageCount; i++) {
                                    if (headerHeight.has(i)) {
                                        headerHeightForCurrentPages.set(i, headerHeight.get(i) || 0);
                                    }
                                }
                                const pagesSetToCheck = new Set([1, ...footerHeightForCurrentPages.keys(), ...headerHeightForCurrentPages.keys()]);
                                let missingPageNumber = undefined;
                                for (let i = 1; i <= pageCount; i++) {
                                    if (!pagesSetToCheck.has(i)) {
                                        missingPageNumber = i;
                                        break;
                                    }
                                }
                                if (missingPageNumber) {
                                    pagesSetToCheck.add(missingPageNumber);
                                }
                                pagesSetToCheck.delete(0);
                                let pageContentHeightVariable = {};
                                let maxContentHeight = undefined;
                                for (const page of pagesSetToCheck) {
                                    const hHeight = headerHeightForCurrentPages.has(page) ? headerHeightForCurrentPages.get(page) || 0 : headerHeightForCurrentPages.get(0) || 0;
                                    const fHeight = footerHeightForCurrentPages.has(page) ? footerHeightForCurrentPages.get(page) || 0 : footerHeightForCurrentPages.get(0) || 0;
                                    const { _pageHeaderHeight, _pageHeight } = getHeight(_currentOptions, hHeight, fHeight);
                                    const contentHeight = page === 1 ? _pageHeight + _pageHeaderHeight : _pageHeight;
                                    if (page === 1) {
                                        pageContentHeightVariable[`rm-page-content-first`] = `${contentHeight}px`;
                                    }
                                    if (page === missingPageNumber) {
                                        pageContentHeightVariable[`rm-page-content-general`] = `${contentHeight}px`;
                                    }
                                    else {
                                        pageContentHeightVariable[`rm-page-content-${page}`] = `${contentHeight}px`;
                                    }
                                    if (maxContentHeight === undefined || contentHeight < maxContentHeight) {
                                        maxContentHeight = contentHeight;
                                    }
                                }
                                if (maxContentHeight) {
                                    view.dom.style.setProperty(`--rm-max-content-child-height`, `${maxContentHeight - 10}px`);
                                }
                                Object.entries(pageContentHeightVariable).forEach(([key, value]) => {
                                    view.dom.style.setProperty(`--${key}`, value);
                                });
                                refreshPage(view.dom, _currentOptions.enabled);
                            });
                        },
                    };
                }
            }),
            new Plugin({
                key,
                state: {
                    init(_, state) {
                        return buildDecorations(state.doc);
                    },
                    apply(tr, old) {
                        if (tr.docChanged ||
                            tr.steps.some(step => step instanceof ReplaceStep) ||
                            tr.steps.some(step => step instanceof ReplaceAroundStep) ||
                            tr.steps.some(step => step instanceof AddMarkStep) ||
                            tr.steps.some(step => step instanceof RemoveMarkStep) ||
                            tr.steps.some(step => step instanceof RemoveNodeMarkStep) ||
                            tr.steps.some(step => step instanceof AttrStep)) {
                            return buildDecorations(tr.doc);
                        }
                        return old;
                    }
                },
                props: {
                    decorations(state) {
                        var _a;
                        return (_a = key.getState(state)) !== null && _a !== void 0 ? _a : DecorationSet.empty;
                    }
                }
            }),
        ];
    },
    addCommands() {
        return {
            updatePageBreakBackground: (color) => () => {
                this.storage.pageBreakBackground = color;
                return true;
            },
            updatePageSize: (size) => ({ tr, dispatch }) => {
                this.storage.pageHeight = size.pageHeight;
                this.storage.pageWidth = size.pageWidth;
                this.storage.marginTop = size.marginTop;
                this.storage.marginBottom = size.marginBottom;
                this.storage.marginLeft = size.marginLeft;
                this.storage.marginRight = size.marginRight;
                if (dispatch) {
                    tr.setMeta('PAGINATION_FORCE_RECALC', true);
                }
                return true;
            },
            updatePageWidth: (width) => () => {
                this.storage.pageWidth = width;
                return true;
            },
            updatePageHeight: (height) => () => {
                this.storage.pageHeight = height;
                return true;
            },
            updatePageGap: (gap) => () => {
                this.storage.pageGap = gap;
                return true;
            },
            updateMargins: (margins) => ({ tr, dispatch }) => {
                this.storage.marginTop = margins.top;
                this.storage.marginBottom = margins.bottom;
                this.storage.marginLeft = margins.left;
                this.storage.marginRight = margins.right;
                if (dispatch) {
                    tr.setMeta('PAGINATION_FORCE_RECALC', true);
                }
                return true;
            },
            updateContentMargins: (margins) => () => {
                this.storage.contentMarginTop = margins.top;
                this.storage.contentMarginBottom = margins.bottom;
                return true;
            },
            updateHeaderContent: (left, right, pageNumber) => () => {
                if (pageNumber) {
                    this.storage.customHeader = Object.assign(Object.assign({}, this.storage.customHeader), { [pageNumber]: { headerLeft: left, headerRight: right } });
                }
                else {
                    this.storage.headerLeft = left;
                    this.storage.headerRight = right;
                }
                return true;
            },
            updateFooterContent: (left, right, pageNumber) => () => {
                if (pageNumber) {
                    this.storage.customFooter = Object.assign(Object.assign({}, this.storage.customFooter), { [pageNumber]: { footerLeft: left, footerRight: right } });
                }
                else {
                    this.storage.footerLeft = left;
                    this.storage.footerRight = right;
                }
                return true;
            },
            togglePagination: () => () => {
                this.storage.enabled = !this.storage.enabled;
                return true;
            },
            enablePagination: () => () => {
                this.storage.enabled = true;
                return true;
            },
            disablePagination: () => () => {
                this.storage.enabled = false;
                return true;
            },
        };
    },
});

const getExistingPageCount = (view) => {
    const editorDom = view.dom;
    const paginationElement = editorDom.querySelector("[data-rm-pagination]");
    if (paginationElement) {
        return paginationElement.children.length;
    }
    return 0;
};

const calculatePageCount = (view, pageOptions, headerHeight = 0, footerHeight = 0) => {
    var _a;
    const editorDom = view.dom;
    const _pageHeaderHeight = pageOptions.contentMarginTop + pageOptions.marginTop + headerHeight;
    const _pageFooterHeight = pageOptions.contentMarginBottom + pageOptions.marginBottom + footerHeight;
    const pageContentAreaHeight = pageOptions.pageHeight - _pageHeaderHeight - _pageFooterHeight;
    const paginationElement = editorDom.querySelector("[data-rm-pagination]");
    const currentPageCount = getExistingPageCount(view);
    
    // Tolerance to prevent fractional pixels or rounding causing trailing empty pages
    // Increased to 25px to accommodate a standard trailing empty paragraph height
    const TOLERANCE = 25;
    
    if (paginationElement) {
        const lastElementOfEditor = editorDom.lastElementChild;
        const lastPageBreak = (_a = paginationElement.lastElementChild) === null || _a === void 0 ? void 0 : _a.querySelector(".breaker");
        if (lastElementOfEditor && lastPageBreak) {
            const lastElementRect = lastElementOfEditor.getBoundingClientRect();
            const lastPageBreakRect = lastPageBreak.getBoundingClientRect();
            const lastPageGap = lastElementRect.bottom - lastPageBreakRect.bottom;
            
            if (lastPageGap > TOLERANCE) {
                const addPage = Math.ceil((lastPageGap - TOLERANCE) / pageContentAreaHeight);
                return Math.max(1, currentPageCount + addPage);
            }
            else {
                const allBreaksAfterLastElement = Array.from(paginationElement.querySelectorAll(".breaker"));
                const allBreaksAfterLastElementRect = allBreaksAfterLastElement.filter(element => element.getBoundingClientRect().top > lastElementRect.bottom + TOLERANCE);
                const removePage = allBreaksAfterLastElementRect.length;
                if (removePage >= 1) {
                    return Math.max(1, currentPageCount - removePage);
                }
                else {
                    return Math.max(1, currentPageCount);
                }
            }
        }
        return 1;
    }
    else {
        const editorHeight = editorDom.scrollHeight;
        let pageCount = Math.ceil(editorHeight / pageContentAreaHeight);
        return Math.max(1, pageCount);
    }
};

const getNewPageCount = (view, pageOptions) => {
    if (pageOptions.enabled && view.dom.dataset.paginationReady === "true") {
        return Math.max(1, calculatePageCount(view, pageOptions));
    }
    else {
        return 1;
    }
};

function createDecoration(pageOptions, headerHeightMap, footerHeightMap) {
    if (!pageOptions.enabled) {
        return [];
    }
    const commonHeaderOptions = { headerLeft: pageOptions.headerLeft, headerRight: pageOptions.headerRight };
    const commonFooterOptions = { footerLeft: pageOptions.footerLeft, footerRight: pageOptions.footerRight };
    const pageWidget = Decoration.widget(0, (view) => {
        const _pageGap = pageOptions.pageGap;
        const _pageBreakBackground = pageOptions.pageBreakBackground;
        const el = document.createElement("div");
        el.dataset.rmPagination = "true";
        const pageBreakDefinition = (firstPage, pageHeader, pageFooter, headerHeight, footerHeight, pageNumber) => {
            const { _pageHeaderHeight, _pageHeight } = getHeight(pageOptions, headerHeight, footerHeight);
            const pageContainer = document.createElement("div");
            pageContainer.classList.add("rm-page-break");
            const page = document.createElement("div");
            page.classList.add("page");
            page.style.position = "relative";
            page.style.float = "left";
            page.style.clear = "both";
            const marginTop = firstPage
                ? `calc(${_pageHeaderHeight}px + ${_pageHeight}px)`
                : _pageHeight + "px";
            if (pageNumber) {
                page.style.marginTop = `var(--rm-page-content-${pageNumber}, ${marginTop})`;
            }
            else {
                page.style.marginTop = firstPage
                    ? `var(--rm-page-content-first, ${marginTop})`
                    : `var(--rm-page-content-general, ${marginTop})`;
            }
            const pageBreak = document.createElement("div");
            pageBreak.classList.add("breaker");
            pageBreak.style.width = `calc(100% + var(--rm-margin-left) + var(--rm-margin-right))`;
            pageBreak.style.marginLeft = `calc(-1 * var(--rm-margin-left))`;
            pageBreak.style.marginRight = `calc(-1 * var(--rm-margin-right))`;
            pageBreak.style.position = "relative";
            pageBreak.style.float = "left";
            pageBreak.style.clear = "both";
            pageBreak.style.left = `0px`;
            pageBreak.style.right = `0px`;
            pageBreak.style.zIndex = "2";
            const pageSpace = document.createElement("div");
            pageSpace.classList.add("rm-pagination-gap");
            pageSpace.style.height = _pageGap + "px";
            pageSpace.style.borderLeft = "1px solid";
            pageSpace.style.borderRight = "1px solid";
            pageSpace.style.position = "relative";
            pageSpace.style.setProperty("width", "calc(100% + 2px)", "important");
            pageSpace.style.left = "-1px";
            pageSpace.style.backgroundColor = _pageBreakBackground;
            pageSpace.style.borderLeftColor = _pageBreakBackground;
            pageSpace.style.borderRightColor = _pageBreakBackground;
            pageBreak.append(pageFooter, pageSpace, pageHeader);
            pageContainer.append(page, pageBreak);
            return pageContainer;
        };
        const _headerHeight = headerHeightMap.get(0) || 0;
        const _footerHeight = footerHeightMap.get(0) || 0;
        const fragment = document.createDocumentFragment();
        const pageCount = getNewPageCount(view, pageOptions);
        for (let i = 0; i < pageCount; i++) {
            const pageNumber = i + 1;
            const headerPageNumber = i + 2;
            if (headerPageNumber in pageOptions.customHeader || pageNumber in pageOptions.customFooter || pageNumber in pageOptions.customHeader) {
                let _headerOptions = commonHeaderOptions;
                let _footerOptions = commonFooterOptions;
                let _pageHeaderHeight = _headerHeight;
                let _pageFooterHeight = _footerHeight;
                if (headerPageNumber in pageOptions.customHeader) {
                    _headerOptions = pageOptions.customHeader[headerPageNumber] || commonHeaderOptions;
                    _pageHeaderHeight = headerHeightMap.get(headerPageNumber) || 0;
                }
                if (pageNumber in pageOptions.customFooter) {
                    _footerOptions = pageOptions.customFooter[pageNumber] || commonFooterOptions;
                    _pageFooterHeight = footerHeightMap.get(pageNumber) || 0;
                }
                let _pageHeader = getHeader(_headerOptions.headerRight, _headerOptions.headerLeft, headerClickEvent(headerPageNumber, pageOptions.onHeaderClick), headerPageNumber);
                let _pageFooter = getFooter(_footerOptions.footerRight, _footerOptions.footerLeft, footerClickEvent(pageNumber, pageOptions.onFooterClick), pageNumber);
                let pageBreak = pageBreakDefinition(i === 0, _pageHeader, _pageFooter, _pageHeaderHeight, _pageFooterHeight, pageNumber);
                fragment.appendChild(pageBreak);
            }
            else {
                const __pageHeader = getHeader(commonHeaderOptions.headerRight, commonHeaderOptions.headerLeft, headerClickEvent(headerPageNumber, pageOptions.onHeaderClick));
                const __pageFooter = getFooter(commonFooterOptions.footerRight, commonFooterOptions.footerLeft, footerClickEvent(pageNumber, pageOptions.onFooterClick));
                fragment.appendChild(pageBreakDefinition(i === 0, __pageHeader, __pageFooter, _headerHeight, _footerHeight));
            }
        }
        el.append(fragment);
        el.id = "pages";
        el.classList.add("rm-pages-wrapper");
        return el;
    }, { side: -1 });
    const firstHeaderWidget = Decoration.widget(0, () => {
        const pageNumber = 1;
        let _headerOptions = commonHeaderOptions;
        if (pageNumber in pageOptions.customHeader) {
            _headerOptions = pageOptions.customHeader[pageNumber];
        }
        const el = getHeader(_headerOptions.headerRight, _headerOptions.headerLeft, headerClickEvent(pageNumber, pageOptions.onHeaderClick));
        el.classList.add("rm-first-page-header");
        return el;
    }, { side: -1 });
    return [pageWidget, firstHeaderWidget];
}
