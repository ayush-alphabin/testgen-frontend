import {Accessor, Component, createContext, createSignal, useContext} from 'solid-js';
import {File} from '../utils/fileUtils';
import {useEditor} from "./File-Explorer Context/FileExplorerContext";

// Define the interface for the context
interface RecentlyEditorContextType {
    recentlyEditors: Accessor<File[]>;
    addRecentlyEditor: (file: File) => void;
    removeRecentlyEditor: (id: string) => void;
    setRecentlyEditors: (files: File[]) => void;
}

// Create the context
const RecentlyEditorContext = createContext<RecentlyEditorContextType>();

// Define the provider component
export const RecentlyEditorProvider: Component<{ children: any }> = (props) => {
    const [recentlyEditors, setRecentlyEditors] = createSignal<File[]>([]);
    const { setCurrentFile,currentFile } = useEditor();

    const addRecentlyEditor = (file: File) => {
        setRecentlyEditors((prev) => {
            const existing = prev.find((editor) => editor.id === file.id);
            if (existing) return prev;

            return [file, ...prev];
        });
        setCurrentFile(file);
    };


    const removeRecentlyEditor = (id: string) => {
        setRecentlyEditors((prev) => {
            return prev.filter((editor) => editor.id !== id);
        });
    };

    return (
        <RecentlyEditorContext.Provider value={{ recentlyEditors, setRecentlyEditors, addRecentlyEditor, removeRecentlyEditor }}>
            {props.children}
        </RecentlyEditorContext.Provider>
    );
};

export const useRecentlyEditor = () => useContext(RecentlyEditorContext);
