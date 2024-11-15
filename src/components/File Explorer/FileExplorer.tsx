// @ts-nocheck
import { Component, For, createSignal, Show, onCleanup, onMount, createEffect, createMemo } from 'solid-js';
import { useEditor } from '../../context/File-Explorer Context/FileExplorerContext';
import { useRecentlyEditor } from '../../context/RecentlyEditorContext';
import { useTheme } from '@suid/material/styles';
import { useNavigate, useParams } from "@solidjs/router";
import { API_ENDPOINTS } from "../../api/apiConfig";
import { apiClient } from "../../api/api";
import { EditItemModal } from "./createItemModel";
import { RenderFileItem } from "./RenderFileItem";
import { ProjectSettings } from "../Setting/ProjectSettings";
import { Icon } from "@iconify-icon/solid";
import { createNewFile, findFileById } from "../../utils/fileUtils";
import { fileExplorerFilter, hideFiles, getProjectPath } from "../../utils/utils";
import { socket } from "../../SocketHandler";
import { Divider } from "@suid/material";

export const FileExplorer: Component = () => {
    const { files, replaceAllFiles, setCurrentFile, handleAddFile, handleNameChange, currentFile } = useEditor();
    const { addRecentlyEditor, recentlyEditors, setRecentlyEditors } = useRecentlyEditor();
    const [modalOpen, setModalOpen] = createSignal(false);
    const [activeDropdownId, setActiveDropdownId] = createSignal<string | null>(null);
    const [hoveredFileExplorer, setHoveredFileExplorer] = createSignal(false);
    const [currentType, setCurrentType] = createSignal<'file' | 'folder'>('file');
    const [currentParentId, setCurrentParentId] = createSignal<string | undefined>(undefined);
    const [selectedFileId, setSelectedFileId] = createSignal<string | null>(null);
    const [expandedFolders, setExpandedFolders] = createSignal<Set<string>>(new Set());
    const [settingModalOpen, setSettingModalOpen] = createSignal(false);
    const [isLoading, setIsLoading] = createSignal(true);
    const [modalMode, setModalMode] = createSignal<'create' | 'edit' | 'delete'>('create');
    const params = useParams();
    const theme = useTheme();
    const navigate = useNavigate()

    const openModal = (mode: 'create' | 'edit' | 'delete', type: 'file' | 'folder', parentId?: string) => {
        setModalMode(mode);
        setCurrentType(type);
        setCurrentParentId(parentId);
        setModalOpen(true);
    };

    const findFilesByName = async (name: string) => {
        setIsLoading(true);

        try {
            const folderName = decodeURIComponent(name);
            const data = await apiClient.post(API_ENDPOINTS.FETCH_FILES, { folderName });
            const rootPath = data.path;
            window.localStorage.setItem('directory_path', rootPath);
            
            await apiClient.post(API_ENDPOINTS.LOAD_LOCATORS, { collection: name, projectPath: rootPath }).catch((error) => {
                console.log(error);
            });

            const newFiles = data.structure.map((item: any) => processFileOrFolder(item, rootPath)).filter(Boolean);

            replaceAllFiles(newFiles);

            // Assuming files() is reactive, get the first file from the updated list
            // const firstFile = files()[0];
            // if (firstFile) {
            //     setSelectedFileId(firstFile.id);
            //     addRecentlyEditor(firstFile);
            setCurrentFile(null);
            // }

        } catch (error) {
            console.error("Error fetching files:", error);
        } finally {
            setIsLoading(false);
        }
    };


    const processFileOrFolder = (item: any, parentPath: string): File | Folder | null => {
        const currentPath = `${parentPath}/${item.name}`;

        if (item.type === 'folder') {
            const folder = createNewFile(item.name, 'folder', undefined, currentPath);
            folder.children = item.children?.map((child: any) => processFileOrFolder(child, currentPath)).filter(Boolean) || [];
            return folder;
        } else if (item.type === 'file') {
            return createNewFile(item.name, 'file', item.code, currentPath);
        }
        return null;
    };


    const handleDoubleClick = (file: File) => {
        addRecentlyEditor(file);
    };

    const handleDelete = async (fileId: string) => {
        const file = findFileById(files(), fileId);
        if (file?.name) {
            const projectPath = getProjectPath();
            await apiClient.post(API_ENDPOINTS.DELETE_FILE, { projectPath, filename: file.name });
          // Recursive function to filter out the deleted file
          const removeFileRecursively = (fileList: File[]): File[] => 
            fileList.filter(f => f.id !== fileId).map(f => 
                f.type === 'folder' && f.children 
                ? { ...f, children: removeFileRecursively(f.children) } 
                : f
            );

        // Update files and recentlyEditors by removing the deleted file
        const updatedFiles = removeFileRecursively(files());
        const updatedRecentlyEditors = recentlyEditors().filter(editor => editor.id !== fileId);

        replaceAllFiles(updatedFiles);  // Update files state
        setRecentlyEditors(updatedRecentlyEditors);  // Update recently edited files

        // If the current file was deleted, reset currentFile to null
        if (currentFile()?.id === fileId) {
            setCurrentFile(null);
        }
        }
    };

    const handleRename = async (fileId: string, newName: string | undefined) => {
        const file = findFileById(files(), fileId);

        if (newName && newName !== file?.name) {
            const projectPath = getProjectPath();
            await apiClient.post(API_ENDPOINTS.RENAME_FILE, {
                projectPath,
                oldName: file?.name,
                newName,
            });

            // Update the files state with the new name and path
            const updateFilePaths = (files: File[]): File[] => {
                return files.map((f: File) => {
                    if (f.id === fileId) {
                        return { ...f, name: newName, path: `${projectPath}/${newName}` };
                    } else if (f.children) {
                        return { ...f, children: updateFilePaths(f.children) };
                    }
                    return f;
                });
            };

            const updatedFiles = updateFilePaths(files());
            replaceAllFiles(updatedFiles);
        }
    };

    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        // if (!target.closest('.file-item') && !target.closest('.modal')) {
        //     setSelectedFileId(null);
        // }
    };


    createEffect(() => {
        if (params.folderName) {
            findFilesByName(params.folderName);
        }
    });

    onMount(() => {

        document.addEventListener('click', handleClickOutside);
    });

    onCleanup(() => {
        document.removeEventListener('click', handleClickOutside);
    });

    // @ts-ignore
    return (
        <Show when={!isLoading()} fallback={<div class="flex items-center justify-center h-full w-full"><span
            class="loading loading-spinner loading-lg" /></div>}>
            <div class="h-full flex" style={{ 'background-color': 'bg-fileExplorer' }}>
                <div class="w-full" onMouseEnter={() => setHoveredFileExplorer(true)}
                    onMouseLeave={() => setHoveredFileExplorer(false)}>
                    <div class="flex items-center justify-center py-3 m-2 pt-1">
                        <Icon onClick={() => navigate('/')} icon="icon-park-outline:left" height={25} width={25} class="mr-2 cursor-pointer " />
                        <svg style={{ width: '-webkit-fill-available' }} height="35" viewBox="0 0 5272 1544" fill="none"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M1847.97 1078.57C1810.37 1078.57 1779.53 1072.7 1755.44 1060.94C1731.35 1048.61 1713.43 1032.45 1701.68 1012.47C1689.93 992.496 1684.05 970.463 1684.05 946.374C1684.05 905.833 1699.91 872.931 1731.64 847.666C1763.37 822.402 1810.96 809.77 1874.41 809.77H1985.46V799.194C1985.46 769.229 1976.94 747.196 1959.9 733.095C1942.86 718.994 1921.71 711.944 1896.45 711.944C1873.53 711.944 1853.56 717.525 1836.52 728.689C1819.48 739.265 1808.9 755.128 1804.79 776.28H1694.63C1697.56 744.552 1708.14 716.938 1726.35 693.436C1745.15 669.934 1769.24 652.014 1798.62 639.676C1828 626.75 1860.9 620.287 1897.33 620.287C1959.61 620.287 2008.67 635.857 2044.51 666.997C2080.35 698.137 2098.27 742.202 2098.27 799.194V1068H2002.2L1991.63 997.49C1978.7 1020.99 1960.49 1040.38 1936.99 1055.66C1914.07 1070.93 1884.4 1078.57 1847.97 1078.57ZM1873.53 990.439C1905.85 990.439 1930.82 979.864 1948.44 958.712C1966.66 937.56 1978.12 911.415 1982.82 880.275H1886.75C1856.79 880.275 1835.34 885.857 1822.42 897.02C1809.49 907.596 1803.03 920.815 1803.03 936.679C1803.03 953.718 1809.49 966.938 1822.42 976.338C1835.34 985.739 1852.38 990.439 1873.53 990.439ZM2195.84 1068V433.448H2308.65V1068H2195.84ZM2413.83 1261.88V630.863H2514.3L2526.64 693.436C2540.74 674.047 2559.25 657.008 2582.16 642.32C2605.66 627.631 2635.92 620.287 2672.94 620.287C2714.07 620.287 2750.79 630.275 2783.1 650.252C2815.42 670.228 2840.97 697.549 2859.78 732.214C2878.58 766.879 2887.98 806.244 2887.98 850.31C2887.98 894.376 2878.58 933.741 2859.78 968.406C2840.97 1002.48 2815.42 1029.51 2783.1 1049.49C2750.79 1068.88 2714.07 1078.57 2672.94 1078.57C2640.04 1078.57 2611.25 1072.4 2586.57 1060.06C2561.89 1047.72 2541.92 1030.39 2526.64 1008.07V1261.88H2413.83ZM2649.14 979.864C2684.98 979.864 2714.65 967.819 2738.15 943.73C2761.66 919.64 2773.41 888.501 2773.41 850.31C2773.41 812.12 2761.66 780.686 2738.15 756.01C2714.65 731.333 2684.98 718.994 2649.14 718.994C2612.71 718.994 2582.75 731.333 2559.25 756.01C2536.33 780.099 2524.88 811.239 2524.88 849.429C2524.88 887.619 2536.33 919.053 2559.25 943.73C2582.75 967.819 2612.71 979.864 2649.14 979.864ZM2978.67 1068V433.448H3091.48V697.843C3106.17 673.753 3125.85 654.952 3150.53 641.439C3175.79 627.338 3204.58 620.287 3236.89 620.287C3290.95 620.287 3332.66 637.326 3362.04 671.403C3392.01 705.481 3406.99 755.422 3406.99 821.227V1068H3295.06V831.803C3295.06 794.2 3287.42 765.41 3272.15 745.434C3257.46 725.457 3233.96 715.469 3201.64 715.469C3169.91 715.469 3143.48 726.632 3122.32 748.959C3101.76 771.286 3091.48 802.425 3091.48 842.378V1068H2978.67ZM3655.48 1078.57C3617.88 1078.57 3587.03 1072.7 3562.95 1060.94C3538.86 1048.61 3520.94 1032.45 3509.19 1012.47C3497.43 992.496 3491.56 970.463 3491.56 946.374C3491.56 905.833 3507.42 872.931 3539.15 847.666C3570.88 822.402 3618.47 809.77 3681.92 809.77H3792.97V799.194C3792.97 769.229 3784.45 747.196 3767.41 733.095C3750.37 718.994 3729.22 711.944 3703.96 711.944C3681.04 711.944 3661.07 717.525 3644.03 728.689C3626.99 739.265 3616.41 755.128 3612.3 776.28H3502.13C3505.07 744.552 3515.65 716.938 3533.86 693.436C3552.66 669.934 3576.75 652.014 3606.13 639.676C3635.51 626.75 3668.41 620.287 3704.84 620.287C3767.12 620.287 3816.18 635.857 3852.02 666.997C3887.86 698.137 3905.78 742.202 3905.78 799.194V1068H3809.71L3799.14 997.49C3786.21 1020.99 3768 1040.38 3744.5 1055.66C3721.58 1070.93 3691.91 1078.57 3655.48 1078.57ZM3681.04 990.439C3713.36 990.439 3738.33 979.864 3755.95 958.712C3774.17 937.56 3785.62 911.415 3790.32 880.275H3694.26C3664.3 880.275 3642.85 885.857 3629.93 897.02C3617 907.596 3610.54 920.815 3610.54 936.679C3610.54 953.718 3617 966.938 3629.93 976.338C3642.85 985.739 3659.89 990.439 3681.04 990.439ZM4262.45 1078.57C4229.55 1078.57 4200.76 1072.4 4176.08 1060.06C4151.41 1047.72 4131.43 1030.39 4116.15 1008.07L4103.82 1068H4003.35V433.448H4116.15V693.436C4130.26 674.047 4148.76 657.008 4171.68 642.32C4195.18 627.631 4225.44 620.287 4262.45 620.287C4303.58 620.287 4340.3 630.275 4372.62 650.252C4404.93 670.228 4430.49 697.549 4449.29 732.214C4468.09 766.879 4477.49 806.244 4477.49 850.31C4477.49 894.376 4468.09 933.741 4449.29 968.406C4430.49 1002.48 4404.93 1029.51 4372.62 1049.49C4340.3 1068.88 4303.58 1078.57 4262.45 1078.57ZM4238.66 979.864C4274.5 979.864 4304.17 967.819 4327.67 943.73C4351.17 919.64 4362.92 888.501 4362.92 850.31C4362.92 812.12 4351.17 780.686 4327.67 756.01C4304.17 731.333 4274.5 718.994 4238.66 718.994C4202.23 718.994 4172.27 731.333 4148.76 756.01C4125.85 780.099 4114.39 811.239 4114.39 849.429C4114.39 887.619 4125.85 919.053 4148.76 943.73C4172.27 967.819 4202.23 979.864 4238.66 979.864ZM4629 563.002C4608.43 563.002 4591.39 556.832 4577.88 544.494C4564.95 532.155 4558.49 516.586 4558.49 497.784C4558.49 478.983 4564.95 463.707 4577.88 451.956C4591.39 439.617 4608.43 433.448 4629 433.448C4649.56 433.448 4666.31 439.617 4679.23 451.956C4692.74 463.707 4699.5 478.983 4699.5 497.784C4699.5 516.586 4692.74 532.155 4679.23 544.494C4666.31 556.832 4649.56 563.002 4629 563.002ZM4572.59 1068V630.863H4685.4V1068H4572.59ZM4793.06 1068V630.863H4892.65L4901.47 704.893C4914.98 679.041 4934.37 658.477 4959.63 643.201C4985.48 627.925 5015.74 620.287 5050.41 620.287C5104.46 620.287 5146.47 637.326 5176.44 671.403C5206.4 705.481 5221.38 755.422 5221.38 821.227V1068H5108.57V831.803C5108.57 794.2 5100.94 765.41 5085.66 745.434C5070.38 725.457 5046.59 715.469 5014.27 715.469C4982.55 715.469 4956.4 726.632 4935.84 748.959C4915.86 771.286 4905.87 802.425 4905.87 842.378V1068H4793.06Z"
                                fill="white" />
                            <path
                                d="M1492.81 772.41C1492.81 1170.74 1169.9 1493.65 771.579 1493.65C373.253 1493.65 50.345 1170.74 50.345 772.41C50.345 374.081 373.253 51.1714 771.579 51.1714C1169.9 51.1714 1492.81 374.081 1492.81 772.41Z"
                                stroke="white" stroke-width="100.424" />
                            <path
                                d="M439.541 1079.16C398.704 1079.16 365.204 1072.79 339.043 1060.05C312.881 1046.68 293.42 1029.17 280.658 1007.52C267.896 985.871 261.516 961.993 261.516 935.886C261.516 891.95 278.744 856.292 313.2 828.911C347.657 801.531 399.342 787.841 468.255 787.841H588.853V776.379C588.853 743.905 579.601 720.027 561.096 704.745C542.592 689.463 519.621 681.822 492.183 681.822C467.298 681.822 445.603 687.871 427.099 699.969C408.594 711.431 397.109 728.623 392.642 751.546H273.001C276.192 717.161 287.677 687.234 307.458 661.764C327.876 636.294 354.038 616.873 385.942 603.501C417.846 589.492 453.579 582.488 493.14 582.488C560.777 582.488 614.057 599.362 652.98 633.11C691.904 666.858 711.365 714.614 711.365 776.379V1067.69H607.038L595.553 991.283C581.515 1016.75 561.734 1037.77 536.211 1054.32C511.326 1070.88 479.102 1079.16 439.541 1079.16ZM467.298 983.642C502.392 983.642 529.511 972.181 548.654 949.258C568.434 926.335 580.877 897.999 585.982 864.251H481.655C449.112 864.251 425.822 870.3 411.785 882.399C397.747 893.86 390.728 908.187 390.728 925.38C390.728 943.845 397.747 958.172 411.785 968.36C425.822 978.548 444.327 983.642 467.298 983.642Z"
                                fill="white" />
                            <path
                                d="M1053.26 1079.16C1017.53 1079.16 986.264 1072.47 959.464 1059.1C932.665 1045.73 910.97 1026.94 894.38 1002.74L880.98 1067.69H771.867V380.001H894.38V661.764C909.694 640.751 929.793 622.285 954.679 606.366C980.202 590.448 1013.06 582.488 1053.26 582.488C1097.93 582.488 1137.81 593.313 1172.9 614.963C1208 636.612 1235.75 666.221 1256.17 703.79C1276.59 741.358 1286.8 784.02 1286.8 831.777C1286.8 879.533 1276.59 922.196 1256.17 959.764C1235.75 996.696 1208 1025.99 1172.9 1047.64C1137.81 1068.65 1097.93 1079.16 1053.26 1079.16ZM1027.42 972.181C1066.34 972.181 1098.57 959.127 1124.09 933.021C1149.61 906.914 1162.38 873.166 1162.38 831.777C1162.38 790.388 1149.61 756.322 1124.09 729.578C1098.57 702.834 1066.34 689.463 1027.42 689.463C987.859 689.463 955.317 702.834 929.793 729.578C904.908 755.685 892.465 789.433 892.465 830.822C892.465 872.211 904.908 906.277 929.793 933.021C955.317 959.127 987.859 972.181 1027.42 972.181Z"
                                fill="white" />
                        </svg>
                    </div>
                    {/*<div className={'divider my-0 py-0'}/>*/}

                    <div class='text-lg mb-2 w-full px-4 py-1 flex justify-between items-center border-y border-slate-800'>
                        <span class='text-white font-bold text-sm'>{decodeURIComponent(params.folderName)}</span>

                        <span class='flex gap-2'>
                            <Icon icon="iconamoon:file-add-light" class='cursor-pointer' height={20} width={20}
                                onClick={() => openModal('create', 'file', selectedFileId())} />
                        </span>
                    </div>
                    <div className="h-[calc(100vh-160px)] overflow-y-auto px-2">

                        <ul class="list-none p-0">
                            <For each={files()}>
                                {(file) => (
                                    <Show when={!hideFiles.includes(file.name)}>
                                        <RenderFileItem
                                            file={file}
                                            parentId={null}
                                            selectedId={selectedFileId}
                                            setSelectedId={setSelectedFileId}
                                            expandedFolders={expandedFolders}
                                            setExpandedFolders={setExpandedFolders}
                                            handleCreate={openModal}
                                            handleRename={handleRename}
                                            handleDelete={handleDelete}
                                            setCurrentFile={setCurrentFile}
                                            handleDoubleClick={handleDoubleClick}
                                            activeDropdownId={activeDropdownId}
                                            setActiveDropdownId={setActiveDropdownId}
                                            openModal={openModal}
                                            setCurrentType={setCurrentType}
                                            currentType={currentType}
                                        />
                                    </Show>
                                )}
                            </For>
                        </ul>
                    </div>
                    <div class="flex items-center px-5 py-3 mx-5 bg-dark-slate-800 rounded-md cursor-pointer"
                        onClick={() => setSettingModalOpen(true)}>
                        <Icon icon="uil:setting" height={24} width={24} />
                        <span class="mx-3">Settings</span>
                    </div>
                </div>
                <ProjectSettings open={settingModalOpen()} onClose={() => setSettingModalOpen(false)} />
                <EditItemModal
                    open={modalOpen()}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedFileId(null);
                    }}
                    type={currentType()}
                    mode={modalMode()}
                    parentId={currentParentId()}
                    itemId={selectedFileId()}
                    handleAddFile={handleAddFile}
                    handleRename={handleRename}
                    handleDelete={handleDelete}
                />
            </div>
        </Show>
    );
};
