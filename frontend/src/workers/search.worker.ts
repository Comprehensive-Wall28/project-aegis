/// <reference lib="webworker" />
import Fuse from 'fuse.js';

interface NoteSearchData {
    _id: string;
    tags: string[];
    decryptedTitle: string;
    folderId: string | null;
    createdAt: string;
    updatedAt: string;
}

type FilterPayload = {
    query: string;
    folderId: string | null;
    tags: string[];
};

type WorkerMessage =
    | { type: 'UPDATE_DATA'; payload: { notes: any[]; decryptedTitles: Map<string, string> } }
    | { type: 'SEARCH'; payload: FilterPayload };

let searchIndex: NoteSearchData[] = [];
let fuse: Fuse<NoteSearchData> | null = null;

const FUSE_OPTIONS = {
    keys: [
        { name: 'decryptedTitle', weight: 0.7 },
        { name: 'tags', weight: 0.3 }
    ],
    threshold: 0.4, // 0.0 = perfect match, 1.0 = match anything
    includeScore: true,
    ignoreLocation: true,
    useExtendedSearch: true
};

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const { type, payload } = e.data;

    if (type === 'UPDATE_DATA') {
        const { notes, decryptedTitles } = payload;
        // Build the index
        searchIndex = notes.map(note => ({
            _id: note._id,
            tags: note.tags || [],
            decryptedTitle: (decryptedTitles.get(note._id) || 'Untitled Note'),
            folderId: note.noteFolderId || null,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt
        }));

        // Initialize Fuse
        fuse = new Fuse(searchIndex, FUSE_OPTIONS);

    } else if (type === 'SEARCH') {
        let { query, folderId, tags } = payload;
        let resultIds: string[] = [];

        // Parse query for inline tags (e.g. "#important")
        const inlineTags: string[] = [];
        const tagRegex = /#(\w+)/g;
        let match;

        // Extract tags and remove from query
        // We use a temp query to avoid infinite loop issues if we modified query in place while regexing
        let cleanQuery = query;
        while ((match = tagRegex.exec(query)) !== null) {
            inlineTags.push(match[1].toLowerCase());
            // Remove the tag from the query string for text search
            cleanQuery = cleanQuery.replace(match[0], '').trim();
        }

        // Combine sidebar tags and inline tags
        // Using Set to avoid duplicates
        const allTags = [...new Set([...tags, ...inlineTags])];

        // 1. Text Search (Global) OR Folder Filter
        if (cleanQuery && cleanQuery.trim().length > 0) {
            // Global Search logic
            if (fuse) {
                const fuseResults = fuse.search(cleanQuery);
                resultIds = fuseResults.map((r: any) => r.item._id);
            }
        } else if (inlineTags.length > 0) {
            // If only tags in query (no text), search by tags global (or scoped?)
            // If we have inline tags, we probably want Global search by tag.
            resultIds = searchIndex.map(item => item._id);
        } else {
            // Navigation logic (Filter by Folder) - Only if NO query and NO inline tags
            resultIds = searchIndex
                .filter(item => {
                    // Folder match
                    // Treat null as "All Notes" (no filter)
                    const folderMatch = folderId === null || item.folderId === folderId;
                    // Tag match (intersection: note must have all selected tags)
                    const tagMatch = tags.length === 0 || tags.every(t => item.tags.includes(t));

                    return folderMatch && tagMatch;
                })
                .map(item => item._id);
        }

        // 2. Apply Tag Filtering to the candidates
        // If we found candidates (via Fuse, or via Folder, or all), now we MUST ensure they match ALL tags
        if (allTags.length > 0) {
            const resultsSet = new Set(resultIds);
            const tagFiltered = searchIndex.filter(item =>
                resultsSet.has(item._id) &&
                allTags.every(t => item.tags.map(it => it.toLowerCase()).includes(t.toLowerCase()))
            );
            resultIds = tagFiltered.map(item => item._id);
        }

        self.postMessage({ type: 'SEARCH_RESULTS', results: resultIds });
    }
};
