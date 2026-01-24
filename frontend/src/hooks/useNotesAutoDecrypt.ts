import { useState, useCallback, useRef, useEffect } from 'react';
import { type NoteMetadata } from '../services/noteService';
import { useSessionStore } from '../stores/sessionStore';
import { useNoteEncryption } from './useNoteEncryption';

export const useNotesAutoDecrypt = (notes: NoteMetadata[]) => {
    const { pqcEngineStatus } = useSessionStore();
    const { decryptString, deriveAesKey } = useNoteEncryption();
    const [decryptedTitles, setDecryptedTitles] = useState<Map<string, string>>(new Map());
    const decryptedTitlesRef = useRef<Map<string, string>>(new Map());

    const decryptTitlesList = useCallback(async (notesToDecrypt: NoteMetadata[]) => {
        if (pqcEngineStatus !== 'operational') return;

        const currentMap = decryptedTitlesRef.current;
        const newTitles = new Map<string, string>();
        let changed = false;

        for (const note of notesToDecrypt) {
            if (note.encryptedTitle && !currentMap.has(note._id)) {
                try {
                    const aesKey = await deriveAesKey(note.encapsulatedKey, note.encryptedSymmetricKey);
                    const title = await decryptString(note.encryptedTitle, aesKey);
                    newTitles.set(note._id, title);
                    currentMap.set(note._id, title);
                    changed = true;
                } catch (err) {
                    console.error('Failed to decrypt title for note:', note._id, err);
                    const title = 'Untitled Note';
                    newTitles.set(note._id, title);
                    currentMap.set(note._id, title);
                    changed = true;
                }
            } else if (!note.encryptedTitle && !currentMap.has(note._id)) {
                const title = 'Untitled Note';
                newTitles.set(note._id, title);
                currentMap.set(note._id, title);
                changed = true;
            }
        }

        if (changed) {
            setDecryptedTitles(prev => {
                const updated = new Map(prev);
                newTitles.forEach((value, key) => updated.set(key, value));
                return updated;
            });
        }
    }, [deriveAesKey, decryptString, pqcEngineStatus]);

    useEffect(() => {
        if (pqcEngineStatus === 'operational' && notes.length > 0) {
            decryptTitlesList(notes);
        }
    }, [pqcEngineStatus, notes, decryptTitlesList]);

    return {
        decryptedTitles,
        setDecryptedTitles,
        decryptedTitlesRef,
        decryptTitles: decryptTitlesList
    };
};
