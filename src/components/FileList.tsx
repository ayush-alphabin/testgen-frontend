import { Component, createSignal, For, Show } from 'solid-js';
import { useEditor } from '../context/File-Explorer Context/FileExplorerContext';
import { Icon } from '@iconify-icon/solid';
const FileList: Component = () => {
    const { files, setFiles, currentFile, setCurrentFile, handleAddFile } = useEditor();

    const [hover, setHover] = createSignal(false);
    const handleDeleteFile = (id: number) => {
        setFiles(files().filter((file) => file.id !== id));
        if (currentFile()?.id === id) {
            setCurrentFile(files()[0] || null);
        }
    };

    const handleAddFiles = () => {
        handleAddFile(`main_${Date.now()}.js`, 'javascript');
    };

    return (
        <div class="bg-gray-800 p-4 border-r border-gray-700 lg:w-64 w-full overflow-y-auto">
            <div class="text-lg mb-4 flex items-center justify-between"><span>Files</span>
                <button class="btn btn-circle btn-outline contents">
                    <Icon icon="gg:add" height={23} width={23} onClick={handleAddFiles} />
                </button>
            </div>
            <ul class="list-none p-0">
                <For each={files()}>
                    {(file, i) => (
                        <li
                            class="flex items-center justify-between p-2 cursor-pointer bg-gray-700 rounded-md hover:bg-gray-600 mb-2"
                            onClick={() => setCurrentFile(file)}
                        >
                            {file.name}
                            <Show when={files().length > 1}>
                                <Icon tabIndex={0} onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFile(file.id);
                                }} role="button" icon={'mingcute:delete-line'} height={20} width={20} class='hover:text-red-500' />
                            </Show>
                        </li>
                    )}
                </For>

            </ul>
        </div>
    );
};

export default FileList;
