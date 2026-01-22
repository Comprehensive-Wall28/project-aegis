/// <reference lib="webworker" />

interface NoteSearchData {
    _id: string;
    tags: string[];
    decryptedTitle: string;
}

type WorkerMessage =
    | { type: 'UPDATE_DATA'; payload: { notes: any[]; decryptedTitles: Record<string, string> } }
    | { type: 'SEARCH'; payload: { query: string } };

let searchIndex: NoteSearchData[] = [];

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const { type, payload } = e.data;

    if (type === 'UPDATE_DATA') {
        const { notes, decryptedTitles } = payload;
        // Build a lightweight index
        searchIndex = notes.map(note => ({
            _id: note._id,
            tags: note.tags || [],
            decryptedTitle: (decryptedTitles[note._id] || '').toLowerCase()
        }));
    } else if (type === 'SEARCH') {
        const { query } = payload;
        const lowerQuery = query.toLowerCase();

        if (!query.trim()) {
            self.postMessage({ type: 'SEARCH_RESULTS', results: null }); // null means "all"
            return;
        }

        const results = searchIndex.filter(item => {
            const matchesTitle = item.decryptedTitle.includes(lowerQuery);
            const matchesTags = item.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
            return matchesTitle || matchesTags;
        });

        const resultIds = results.map(r => r._id);
        self.postMessage({ type: 'SEARCH_RESULTS', results: resultIds });
    }
};
