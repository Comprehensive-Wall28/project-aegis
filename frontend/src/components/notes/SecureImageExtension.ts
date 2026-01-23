import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { SecureImageComponent } from './SecureImageComponent';

export const SecureImage = Node.create({
    name: 'secureImage',

    group: 'block',

    draggable: true,
    selectable: true,

    addAttributes() {
        return {
            fileId: {
                default: null,
            },
            mediaId: {
                default: null,
            },
            alt: {
                default: null,
            },
            title: {
                default: null,
            },
            width: {
                default: 'auto',
            },
            height: {
                default: 'auto',
            },
            alignment: {
                default: 'center',
            }
        };
    },

    parseHTML() {
        return [
            {
                tag: 'secure-image[fileId]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['secure-image', mergeAttributes(HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(SecureImageComponent);
    },
});
