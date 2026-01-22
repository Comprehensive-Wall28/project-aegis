import { Extension, type Range } from '@tiptap/core';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Plugin, PluginKey, Selection } from '@tiptap/pm/state';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        search: {
            setSearchTerm: (term: string) => ReturnType;
            setCaseSensitive: (caseSensitive: boolean) => ReturnType;
            nextSearchMatch: () => ReturnType;
            previousSearchMatch: () => ReturnType;
            clearSearch: () => ReturnType;
        };
    }
}

interface SearchOptions {
    searchTerm: string;
    caseSensitive: boolean;
    currentIndex: number;
    results: Range[];
}

export const SearchExtension = Extension.create<SearchOptions>({
    name: 'search',

    addOptions() {
        return {
            searchTerm: '',
            caseSensitive: false,
            currentIndex: 0,
            results: [],
        };
    },

    addStorage() {
        return {
            results: [] as Range[],
            currentIndex: 0,
            searchTerm: '',
            caseSensitive: false,
        };
    },

    addCommands() {
        return {
            setSearchTerm: (term: string) => ({ editor, dispatch }) => {
                this.storage.searchTerm = term;
                this.storage.currentIndex = 0;

                if (dispatch) {
                    editor.view.dispatch(editor.state.tr.setMeta('searchUpdated', true));
                }
                return true;
            },
            setCaseSensitive: (caseSensitive: boolean) => ({ editor, dispatch }) => {
                this.storage.caseSensitive = caseSensitive;
                this.storage.currentIndex = 0;

                if (dispatch) {
                    editor.view.dispatch(editor.state.tr.setMeta('searchUpdated', true));
                }
                return true;
            },
            nextSearchMatch: () => ({ editor, dispatch }) => {
                const results = this.storage.results;
                if (results.length === 0) return false;

                this.storage.currentIndex = (this.storage.currentIndex + 1) % results.length;

                if (dispatch) {
                    const match = results[this.storage.currentIndex];
                    // @ts-ignore
                    editor.view.dispatch(editor.state.tr.setMeta('searchUpdated', true).setSelection(Selection.near(editor.state.doc.resolve(match.from))));
                    // Scroll into view
                    setTimeout(() => {
                        const element = editor.view.dom.querySelector('.search-result-current');
                        if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 10);
                }
                return true;
            },
            previousSearchMatch: () => ({ editor, dispatch }) => {
                const results = this.storage.results;
                if (results.length === 0) return false;

                this.storage.currentIndex = (this.storage.currentIndex - 1 + results.length) % results.length;

                if (dispatch) {
                    const match = results[this.storage.currentIndex];
                    // @ts-ignore
                    editor.view.dispatch(editor.state.tr.setMeta('searchUpdated', true).setSelection(Selection.near(editor.state.doc.resolve(match.from))));
                    setTimeout(() => {
                        const element = editor.view.dom.querySelector('.search-result-current');
                        if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 10);
                }
                return true;
            },
            clearSearch: () => ({ editor, dispatch }) => {
                this.storage.searchTerm = '';
                this.storage.results = [];
                this.storage.currentIndex = 0;

                if (dispatch) {
                    editor.view.dispatch(editor.state.tr.setMeta('searchUpdated', true));
                }
                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        const extension = this;

        return [
            new Plugin({
                key: new PluginKey('search'),
                state: {
                    init() {
                        return DecorationSet.empty;
                    },
                    apply(tr, oldState) {
                        if (!tr.docChanged && !tr.getMeta('searchUpdated')) {
                            return oldState.map(tr.mapping, tr.doc);
                        }

                        const { searchTerm, caseSensitive } = extension.storage;
                        if (!searchTerm) {
                            extension.storage.results = [];
                            return DecorationSet.empty;
                        }

                        const decorations: Decoration[] = [];
                        const results: Range[] = [];
                        const query = caseSensitive ? searchTerm : searchTerm.toLowerCase();

                        // High-performance search using RegExp or simple indexOf
                        // For complex documents, we iterate through nodes to handle multi-line text correctly
                        tr.doc.descendants((node, pos) => {
                            if (node.isText && node.text) {
                                let start = 0;
                                const content = caseSensitive ? node.text : node.text.toLowerCase();

                                while ((start = content.indexOf(query, start)) !== -1) {
                                    const from = pos + start;
                                    const to = from + query.length;
                                    results.push({ from, to });
                                    start += query.length;
                                }
                            }
                        });

                        extension.storage.results = results;

                        if (results.length > 0) {
                            // Clamp currentIndex
                            if (extension.storage.currentIndex >= results.length) {
                                extension.storage.currentIndex = 0;
                            }

                            results.forEach((range, index) => {
                                const isCurrent = index === extension.storage.currentIndex;
                                decorations.push(
                                    Decoration.inline(range.from, range.to, {
                                        class: isCurrent ? 'search-result search-result-current' : 'search-result',
                                    })
                                );
                            });
                        }

                        return DecorationSet.create(tr.doc, decorations);
                    },
                },
                props: {
                    decorations(state) {
                        return this.getState(state);
                    },
                },
            }),
        ];
    },
});
