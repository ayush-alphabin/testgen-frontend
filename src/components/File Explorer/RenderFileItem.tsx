import { Component, createSignal, Show, onCleanup, onMount, Setter, Accessor, For } from "solid-js";
import { Icon } from '@iconify-icon/solid';
import { useEditor } from "../../context/File-Explorer Context/FileExplorerContext";
import { getFileIcon, hideFiles } from '../../utils/utils';
import { File } from "../../utils/fileUtils";

interface RenderFileItemProps {
    file: File;
    parentId: string | null;
    selectedId: () => string | null;
    setSelectedId: (id: string | null) => void;
    expandedFolders: () => Set<string>;
    setExpandedFolders: (set: Set<string>) => void;
    handleCreate: (type: 'file' | 'folder', parentId: string) => void;
    handleRename: (fileId: string) => void;
    handleDelete: (fileId: string) => void;
    setCurrentFile: (file: File) => void;
    handleDoubleClick: (file: File) => void;
    activeDropdownId: () => string | null;
    setActiveDropdownId: (id: string | null) => void;
    openModal: (mode: 'create' | 'edit' | 'delete', type: 'file' | 'folder', parentId?: string) => void;
    setCurrentType: Setter<'file' | 'folder'>;
    currentType: Accessor<'file' | 'folder'>;
}

export const RenderFileItem: Component<RenderFileItemProps> = (props) => {
    const { currentFile } = useEditor();
    let dropdownRef: HTMLDivElement | undefined;
    const [isDropdownOpen, setIsDropdownOpen] = createSignal(false);
    const [contextMenuPosition, setContextMenuPosition] = createSignal({ x: 0, y: 0 });

    // Toggle folder (expand/collapse)
    const toggleFolder = () => {
        props.setExpandedFolders((prev) => {
            const newSet = new Set(prev);
            newSet.has(props.file.id) ? newSet.delete(props.file.id) : newSet.add(props.file.id);
            return newSet;
        });
    };

    // Set indentation for child items
    const getIndentation = () => ({
        'padding-left': `${(props.parentId ? 1 : 0) * 20}px`,
    });

    // Handle file or folder click
    const handleFileClick = () => {
        props.setCurrentType(props.file.type);
        props.setSelectedId(props.file.id);
        props.file.type === 'file' ? props.setCurrentFile(props.file) : null;
        props.file.type === 'file' ? props.handleDoubleClick(props.file) : toggleFolder();
    };

    // Handle right-click (context menu)
    const handleContextMenu = (event: MouseEvent) => {
        event.preventDefault(); // Prevent default browser context menu
        event.stopPropagation(); // Prevent event propagation to parent elements

        // Ensure the file itself is being selected
        props.setCurrentType(props.file.type);  // Set current file/folder type
        props.setSelectedId(props.file.id);     // Set selected file/folder ID
        props.setActiveDropdownId(props.file.id); // Set the active dropdown for this file/folder
        setContextMenuPosition({ x: event.pageX, y: event.pageY }); // Set the position for the context menu
        setIsDropdownOpen(true);               // Open the dropdown

    };

    // Handle click outside to close the context menu
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
            setIsDropdownOpen(false);
            props.setActiveDropdownId(null);
        }
    };

    onMount(() => {
        document.addEventListener("mousedown", handleClickOutside); // Close menu when clicked outside
    });

    onCleanup(() => {
        document.removeEventListener("mousedown", handleClickOutside);
    });

    return (
        <li
            class="file-item relative ml-2"
            onDblClick={() => props.file.type === 'file' && props.handleDoubleClick(props.file)}
            onContextMenu={handleContextMenu} // Custom right-click logic
        >
            {/* File/Folder display */}
            <div
                style={getIndentation()}
                class={`flex items-center justify-between py-1 px-2 cursor-pointer rounded-md hover:bg-gray-600 
            ${props.selectedId() === props.file.id ? 'bg-[#37373dab]' : ''}`}
                onClick={handleFileClick} // Handles file selection on click
            >
                <div class="flex items-center gap-2">
                    <Show when={props.file.type === 'folder'} fallback={<div class='w-0' />}>
                        <Icon icon="mingcute:right-line" height={20} width={20}
                            class={`cursor-pointer ${props.expandedFolders().has(props.file.id) ? 'rotate-90' : ''}`} />
                    </Show>
                    {getFileIcon(props.file.extension || props.file.type)}
                    <span class='text-sm'>{props.file.name}</span>
                </div>
            </div>

            {/* Show folder contents */}
            <Show when={props.file.type === 'folder' && props.expandedFolders().has(props.file.id) && props.file.children}>
                <ul class="list-none p-0">
                    <For each={props.file.children}>
                        {(child) => (
                            <RenderFileItem
                                file={child}
                                parentId={props.file.id}
                                selectedId={props.selectedId}
                                setSelectedId={props.setSelectedId}
                                expandedFolders={props.expandedFolders}
                                setExpandedFolders={props.setExpandedFolders}
                                handleCreate={props.handleCreate}
                                handleRename={props.handleRename}
                                handleDelete={props.handleDelete}
                                setCurrentFile={props.setCurrentFile}
                                handleDoubleClick={props.handleDoubleClick}
                                activeDropdownId={props.activeDropdownId}
                                setActiveDropdownId={props.setActiveDropdownId}
                                openModal={props.openModal}
                                setCurrentType={props.setCurrentType}
                                currentType={props.currentType}
                            />
                        )}
                    </For>
                </ul>
            </Show>

            <Show when={isDropdownOpen()}>
                <div ref={dropdownRef} class="absolute right-0 mt-1 bg-gray-700 rounded-md shadow-lg z-10 w-48">
                    <ul class="py-1">
                        <li class="px-4 py-2 hover:bg-gray-600 cursor-pointer"
                            onClick={() => {
                                props.openModal('edit', props.currentType(), props.file.id);
                                setIsDropdownOpen(false);
                            }}>Rename</li>
                        <li class="px-4 py-2 hover:bg-gray-600 cursor-pointer"
                            onClick={() => {
                                props.openModal('delete', props.currentType(), props.file.id);
                                setIsDropdownOpen(false);
                            }}>Delete</li>
                    </ul>
                </div>
            </Show>
        </li>
    );
};
