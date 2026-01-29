import { Extension, type Range } from '@tiptap/core';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Plugin, PluginKey, Selection } from '@tiptap/pm/state';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        search: {
            setSearchTerm: (term: string) => ReturnType;
            setCaseSensitive: (caseSensitive: boolean) => ReturnType;
            setUseRegex: (useRegex: boolean) => ReturnType;
            setWholeWord: (wholeWord: boolean) => ReturnType;
            setReplaceText: (text: string) => ReturnType;
            nextSearchMatch: () => ReturnType;
            previousSearchMatch: () => ReturnType;
            replaceCurrentMatch: () => ReturnType;
            replaceAllMatches: () => ReturnType;
            clearSearch: () => ReturnType;
            addToSearchHistory: (term: string) => ReturnType;
        };
    }
}

interface SearchOptions {
    searchTerm: string;
    caseSensitive: boolean;
    useRegex: boolean;
    wholeWord: boolean;
    currentIndex: number;
    results: Range[];
}

interface SearchStorage {
    results: Range[];
    currentIndex: number;
    searchTerm: string;
    caseSensitive: boolean;
    useRegex: boolean;
    wholeWord: boolean;
    replaceText: string;
    regexError: boolean;
    searchHistory: string[];
    lastReplacedCount: number;
}

// Helper to escape regex special characters
const escapeRegex = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Debounce helper for auto-jump
let autoJumpTimeout: ReturnType<typeof setTimeout> | null = null;

export const SearchExtension = Extension.create<SearchOptions, SearchStorage>({
    name: 'search',

    addOptions() {
        return {
            searchTerm: '',
            caseSensitive: false,
            useRegex: false,
            wholeWord: false,
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
            useRegex: false,
            wholeWord: false,
            replaceText: '',
            regexError: false,
            searchHistory: [] as string[],
            lastReplacedCount: 0,
        };
    },

    addCommands() {
        return {
            setSearchTerm: (term: string) => ({ editor, dispatch }) => {
                this.storage.searchTerm = term;
                this.storage.currentIndex = 0;
                this.storage.regexError = false;

                if (dispatch) {
                    editor.view.dispatch(editor.state.tr.setMeta('searchUpdated', true));

                    // Auto-jump to first match with debounce
                    if (autoJumpTimeout) clearTimeout(autoJumpTimeout);
                    autoJumpTimeout = setTimeout(() => {
                        if (this.storage.results.length > 0) {
                            const match = this.storage.results[0];
                            try {
                                editor.view.dispatch(
                                    editor.state.tr.setSelection(
                                        Selection.near(editor.state.doc.resolve(match.from))
                                    )
                                );
                                setTimeout(() => {
                                    const element = editor.view.dom.querySelector('.search-result-current');
                                    if (element) {
                                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                }, 10);
                            } catch {
                                // Ignore selection errors
                            }
                        }
                    }, 150);
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

            setUseRegex: (useRegex: boolean) => ({ editor, dispatch }) => {
                this.storage.useRegex = useRegex;
                this.storage.currentIndex = 0;
                this.storage.regexError = false;

                if (dispatch) {
                    editor.view.dispatch(editor.state.tr.setMeta('searchUpdated', true));
                }
                return true;
            },

            setWholeWord: (wholeWord: boolean) => ({ editor, dispatch }) => {
                this.storage.wholeWord = wholeWord;
                this.storage.currentIndex = 0;

                if (dispatch) {
                    editor.view.dispatch(editor.state.tr.setMeta('searchUpdated', true));
                }
                return true;
            },

            setReplaceText: (text: string) => ({ editor, dispatch }) => {
                this.storage.replaceText = text;

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
                    try {
                        editor.view.dispatch(
                            editor.state.tr
                                .setMeta('searchUpdated', true)
                                .setSelection(Selection.near(editor.state.doc.resolve(match.from)))
                        );
                        setTimeout(() => {
                            const element = editor.view.dom.querySelector('.search-result-current');
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }, 10);
                    } catch {
                        // Ignore selection errors
                    }
                }
                return true;
            },

            previousSearchMatch: () => ({ editor, dispatch }) => {
                const results = this.storage.results;
                if (results.length === 0) return false;

                this.storage.currentIndex = (this.storage.currentIndex - 1 + results.length) % results.length;

                if (dispatch) {
                    const match = results[this.storage.currentIndex];
                    try {
                        editor.view.dispatch(
                            editor.state.tr
                                .setMeta('searchUpdated', true)
                                .setSelection(Selection.near(editor.state.doc.resolve(match.from)))
                        );
                        setTimeout(() => {
                            const element = editor.view.dom.querySelector('.search-result-current');
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }, 10);
                    } catch {
                        // Ignore selection errors
                    }
                }
                return true;
            },

            replaceCurrentMatch: () => ({ editor, dispatch }) => {
                const results = this.storage.results;
                if (results.length === 0) return false;

                const match = results[this.storage.currentIndex];
                const replaceText = this.storage.replaceText;

                if (dispatch) {
                    // Delete the matched text and insert replacement
                    editor
                        .chain()
                        .focus()
                        .deleteRange({ from: match.from, to: match.to })
                        .insertContentAt(match.from, replaceText)
                        .run();

                    // Track replacement
                    this.storage.lastReplacedCount = 1;

                    // Trigger re-search
                    setTimeout(() => {
                        editor.view.dispatch(editor.state.tr.setMeta('searchUpdated', true));
                    }, 0);
                }
                return true;
            },

            replaceAllMatches: () => ({ editor, dispatch }) => {
                const results = this.storage.results;
                if (results.length === 0) return false;

                const replaceText = this.storage.replaceText;
                const count = results.length;

                if (dispatch) {
                    // Replace in reverse order to preserve positions
                    const sortedResults = [...results].sort((a, b) => b.from - a.from);

                    editor.chain().focus().command(({ tr }) => {
                        for (const match of sortedResults) {
                            tr.replaceWith(match.from, match.to, editor.schema.text(replaceText));
                        }
                        return true;
                    }).run();

                    // Track replacement count
                    this.storage.lastReplacedCount = count;

                    // Clear results after replace all
                    this.storage.results = [];
                    this.storage.currentIndex = 0;

                    // Trigger re-search
                    setTimeout(() => {
                        editor.view.dispatch(editor.state.tr.setMeta('searchUpdated', true));
                    }, 0);
                }
                return true;
            },

            clearSearch: () => ({ editor, dispatch }) => {
                this.storage.searchTerm = '';
                this.storage.results = [];
                this.storage.currentIndex = 0;
                this.storage.regexError = false;
                this.storage.replaceText = '';

                if (dispatch) {
                    editor.view.dispatch(editor.state.tr.setMeta('searchUpdated', true));
                }
                return true;
            },

            addToSearchHistory: (term: string) => () => {
                if (!term || term.length === 0) return false;

                // Remove duplicates and add to front
                const history = this.storage.searchHistory.filter(t => t !== term);
                history.unshift(term);

                // Keep max 10 items
                this.storage.searchHistory = history.slice(0, 10);

                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
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

                        const { searchTerm, caseSensitive, useRegex, wholeWord } = extension.storage;
                        if (!searchTerm) {
                            extension.storage.results = [];
                            extension.storage.regexError = false;
                            return DecorationSet.empty;
                        }

                        const decorations: Decoration[] = [];
                        const results: Range[] = [];

                        // Build the search pattern
                        let regex: RegExp;
                        try {
                            let pattern: string;

                            if (useRegex) {
                                pattern = searchTerm;
                            } else {
                                pattern = escapeRegex(searchTerm);
                            }

                            if (wholeWord) {
                                pattern = `\\b${pattern}\\b`;
                            }

                            const flags = caseSensitive ? 'g' : 'gi';
                            regex = new RegExp(pattern, flags);
                            extension.storage.regexError = false;
                        } catch {
                            // Invalid regex
                            extension.storage.regexError = true;
                            extension.storage.results = [];
                            return DecorationSet.empty;
                        }

                        // Search through document nodes
                        tr.doc.descendants((node, pos) => {
                            if (node.isText && node.text) {
                                let match;
                                // Reset lastIndex for global regex
                                regex.lastIndex = 0;

                                while ((match = regex.exec(node.text)) !== null) {
                                    const from = pos + match.index;
                                    const to = from + match[0].length;
                                    results.push({ from, to });

                                    // Prevent infinite loop on zero-length matches
                                    if (match[0].length === 0) {
                                        regex.lastIndex++;
                                    }
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
