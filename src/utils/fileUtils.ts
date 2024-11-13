// src/utils/fileUtils.ts

import files from "../components/Dashboard/FolderDialog";

export interface File {
    id: string;
    name: string;
    type: 'file' | 'folder';
    code?: string;
    children?: File[];
    extension?: string;
    filename: string;
    path: string;  // New path property

}

export interface TestItem {
    id: string;
    name: string;
    type: "folder" | "file" | "describe" | "test";
    children?: TestItem[];
    checked: boolean;
    count?: number;
    expanded: boolean; // Added for expand/collapse functionality
}

// src/utils/fileUtils.ts
// Example: Correctly set the path when creating a new file
export const createNewFile = (name: string, type: 'file' | 'folder', code?: string, parentPath?: string): File => {
    let extensionType = '';
    let filenameExtracted = name;

    if (type === 'file') {
        const lastDotIndex = name.lastIndexOf('.');
        const secondLastDotIndex = name.lastIndexOf('.', lastDotIndex - 1);

        if (lastDotIndex !== -1 && secondLastDotIndex !== -1) {
            extensionType = name.substring(secondLastDotIndex);
            filenameExtracted = name.substring(0, secondLastDotIndex);
        } else if (lastDotIndex !== -1) {
            extensionType = name.substring(lastDotIndex);
            filenameExtracted = name.substring(0, lastDotIndex);
        }
    }

    const newPath = parentPath ? `${parentPath}` : name;

    return {
        id: `${name}-${Date.now()}`,
        name,
        type,
        code: type === 'file' ? code || '' : undefined,
        children: type === 'folder' ? [] : undefined,
        extension: extensionType,
        filename: filenameExtracted,
        path: newPath,
    };
};


export const findFileById = (files: File[], fileId: string): File | undefined => {
    const search = (files: File[]): File | undefined => {
        for (const file of files) {
            if (file.id === fileId) return file;
            if (file.children) {
                const found = search(file.children);
                if (found) return found;
            }
        }
        return undefined;
    };
    return search(files);
};
