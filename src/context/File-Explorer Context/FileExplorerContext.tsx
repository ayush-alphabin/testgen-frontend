import { createContext, useContext, createSignal, JSX, Setter, Accessor, onMount, createEffect } from 'solid-js';
import { File, createNewFile, findFileById } from '../../utils/fileUtils';
import * as monaco from 'monaco-editor';
import {
    handleAddFile,
    handleNameChange,
} from "./FileActions";
import { useAlert } from "../AlertContext";
import { useRecentlyEditor } from "../RecentlyEditorContext";
import { debounce } from 'lodash';
import { Position } from "monaco-editor";
import { getProjectPath } from '../../utils/utils';
import { initializeWebSocket, listenForMessages, sendMessage, socketcodegen } from '../../codegenWs';
import { apiClient } from '../../api/api';
import { API_ENDPOINTS } from '../../api/apiConfig';

// Define the context interface
interface FileExplorerContextType {
    files: Accessor<File[]>;
    setFiles: Setter<File[]>;
    currentFile: Accessor<File | null>;
    setCurrentFile: Setter<File | null>;
    theme: Accessor<string>;
    setTheme: Setter<string>;
    handleFileChange: (code: string) => void;
    handleNameChange: (name: string) => void;
    handleAddFile: (name: string, type: 'file' | 'folder', parentId?: string) => void;
    addWhereCursor: (code: any) => void;
    replaceAllFiles: (newFiles: File[]) => void;
    saveFile: (fileId: string) => void;
    originalContent: Accessor<string>;
    setOriginalContent: Setter<string>;
    setEditorInstance: (editor: any) => void;
    localChanges: Accessor<Map<string, string>>;
    setLocalChanges: Setter<Map<string, string>>;
    updateFile: (fileId: string, newValue: Map<string, any>) => void;
    getCurrentContent: () => string | '';
    getCursorPosition: () => monaco.Position | null;
    editorInstance: monaco.IStandaloneCodeEditor | null;
    fetchAndUpdateFile: (filename: string) => void;
}

// Create the context with default values
const FileExplorerContext = createContext<FileExplorerContextType>({
    files: () => [],
    setFiles: () => [],
    currentFile: () => null,
    setCurrentFile: () => null,
    theme: () => 'vs-dark',
    setTheme: () => 'vs-dark',
    handleFileChange: () => {
    },
    handleNameChange: () => {
    },
    handleAddFile: (name: string, type: 'file' | 'folder', parentId?: string) => {
    },
    addWhereCursor: (code: any) => {
    },
    setEditorInstance: () => {
    },
    replaceAllFiles: () => {
    },
    saveFile: () => {
    },
    originalContent: () => "",
    setOriginalContent: () => "",
    localChanges: () => new Map(),
    setLocalChanges: () => new Map(),
    getCurrentContent: () => "",
    getCursorPosition: () => null,
    updateFile: (fileId: string, newValue: Map<string, any>) => {
    },
    editorInstance: null,
    fetchAndUpdateFile: (filename: string) => {
    }
});

export const FileExplorerProvider = (props: { children: JSX.Element }) => {
    const { recentlyEditors, setRecentlyEditors } = useRecentlyEditor();
    const [files, setFiles] = createSignal<File[]>([]);
    const [currentFile, setCurrentFile] = createSignal<File | null>(null);
    const [theme, setTheme] = createSignal<string>('vs-dark');
    const [localChanges, setLocalChanges] = createSignal<Map<string, string>>(new Map());
    const [originalContent, setOriginalContent] = createSignal<string>("");
    const [editorInstance, setEditorInstance] = createSignal<monaco.editor.IStandaloneCodeEditor | null>(null);
    const replaceAllFiles = (newFiles: File[]) => {
        setFiles(newFiles);
        const newCurrentFile = newFiles.find(file => file.id === currentFile()?.id) || newFiles[0] || null;
        setCurrentFile(newCurrentFile);
        setOriginalContent(newCurrentFile?.code || "");
    };
    
    const updateFileRecursively = (files: File[], fileId: string, newValue: any): File[] => {
        return files.map((file: File) => {
            if (file.id === fileId && file.type === 'file') {
                return { ...file, ...newValue };
            }
            if (file.type === 'folder' && file.children) {
                return { ...file, children: updateFileRecursively(file.children, fileId, newValue) };
            }
            return file;
        });
    };
    
    const updateFileInHierarchy = (files: File[], fileId: string, newValue: any): File[] => {
        // Update the recently edited list immutably
        setRecentlyEditors((prevEditors: any) =>
            updateFileRecursively(prevEditors, fileId, newValue)
        );
    
        // Update the main files list
        return updateFileRecursively(files, fileId, newValue);
    };
    

    const updateFile = (fileId: string, newValue: any) => {
        const updatedFiles = updateFileInHierarchy(files(), fileId, newValue);
        setFiles(updatedFiles); // Update the state with the new file hierarchy
    };


    const saveFile = (fileId: string) => {

        const file = findFileById(files(), fileId);

        if (file) {
            const contentToSave = localChanges().get(fileId) || file.code;

            // Ensure the WebSocket is open before sending
            if (socketcodegen && socketcodegen.readyState === WebSocket.OPEN) {
              sendMessage({
                event: "saveFile",
                path: file.path,
                name: file.name,
                code: contentToSave,
              });
            } else {
              console.error("WebSocket is not connected or ready");
            }
      
            // Update the file content after sending
            updateFile(fileId, {code: contentToSave});
            setLocalChanges((prevChanges) => {
              const newChanges = new Map(prevChanges);
              newChanges.delete(fileId); // Clear local change after save
              return newChanges;
            });
        } else {
            console.error('File not found:', fileId);
        }
    };

    const debouncedHandleFileChange = debounce((code: string, fileId: string) => {
        setFiles(prevFiles =>
            prevFiles.map(file =>
                file.id === fileId ? { ...file, code } : file
            )
        );
        setLocalChanges(prev => {
            const newChanges = new Map(prev);
            newChanges.set(fileId, code);
            return newChanges;
        });
    }, 300); // Adjust delay as needed

    function fetchAndUpdateFile(filename: string) {
        const basePath = getProjectPath();
        const fileId = files().find((file: any) => file.name === filename)?.id

        if (fileId) {
            apiClient.post(API_ENDPOINTS.FETCH_FILE, {
                projectPath: basePath, name: filename,
            }).then((data) => {
                const content = data.content;
                updateFile(fileId, { code: content });
            })
        }
    }

    createEffect(() => {
        const current = currentFile();
        if (!current) return;

        const fileId = current.id;
        const content = localChanges().get(fileId);
        if (content && content !== originalContent()) {
            debouncedAutoSave(fileId);
        }
    });


    const debouncedAutoSave = debounce((fileId: string) => {
        saveFile(fileId);
    }, 1000); // 2-second debounce delay

    const handleFileChange = (code: string) => {
        const current = currentFile();
        if (current) {
            debouncedHandleFileChange(code, current.id);
        }
    };

    const getCurrentContent = (): string => {
        if (!editorInstance()) return '';
        const model = editorInstance()!.getModel();
        return model ? model.getValue() : '';
    };

    const getCursorPosition = (): Position | null => {
        if (!editorInstance()) return null;
        return editorInstance()!.getPosition();
    };

    const addWhereCursor = (code: string) => {
        if (editorInstance()) {
            const position = editorInstance()?.getPosition();
            if (position) {
                editorInstance()?.executeEdits("", [
                    {
                        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                        text: '\t' + code,
                        forceMoveMarkers: true,
                    },
                ]);
            }
        }
    };
    
    const value: FileExplorerContextType = {
        files,
        setFiles,
        currentFile,
        setCurrentFile,
        theme,
        setTheme,
        handleFileChange,
        handleNameChange: (name: string) => handleNameChange(name, currentFile, setFiles, setCurrentFile),
        handleAddFile: (name: string, type: 'file' | 'folder', parentId?: string) => handleAddFile(name, type, parentId, files, setFiles, setCurrentFile),
        addWhereCursor,
        setEditorInstance,
        saveFile,
        replaceAllFiles,
        originalContent,
        localChanges,
        setOriginalContent,
        updateFile,
        getCurrentContent,
        getCursorPosition,
        editorInstance,
        setLocalChanges,
        fetchAndUpdateFile
    };

    return (
        <FileExplorerContext.Provider value={value}>
            {props.children}
        </FileExplorerContext.Provider>
    );
};


export const useEditor = () => useContext(FileExplorerContext);