import { createSignal, For, Show } from 'solid-js';
import { Icon } from '@iconify-icon/solid';
import { apiClient } from "../../api/api";
import { API_ENDPOINTS } from "../../api/apiConfig";
import { toast } from "solid-toast";
import { getProjectName, getProjectPath } from "../../utils/utils";
import { useEditor } from "../../context/File-Explorer Context/FileExplorerContext";

export const LocatorModal = () => {
    const [isOpen, setIsOpen] = createSignal(false);
    const [locators, setLocators] = createSignal({});
    const [loading, setLoading] = createSignal(false);  // Signal for loading state
    const { updateFile, files } = useEditor();
    const [locatorSignals, setLocatorSignals] = createSignal({}); // Signal for each locator
    const [expandedURLs, setExpandedURLs] = createSignal<{ [key: string]: boolean }>({});

    const openModal = async () => {
        setIsOpen(true);
        setLoading(true); // Start loading
        try {
            const response = await apiClient.post(API_ENDPOINTS.GET_GLOBAL_JS, {
                projectPath: getProjectPath(),
                collection: getProjectName()
            });
            const locatorsData = response;

            // Initialize locators and signals
            const locatorsObj = {};
            const signalsObj = {};

            Object.entries(locatorsData).forEach(([url, entries]) => {
                entries.forEach((entry) => {
                    const id = entry.index; // Use `index` as the unique ID

                    // Initialize locators object for each entry under the URL
                    if (!locatorsObj[url]) locatorsObj[url] = [];
                    locatorsObj[url].push({
                        ...entry,
                        isVisible: false,
                    });

                    // Create signal for each locator value
                    const [signal, setSignal] = createSignal(entry.locator);
                    signalsObj[id] = [signal, setSignal]; // Map signal to `id`
                });
            });
            setLocators(locatorsObj);
            setLocatorSignals(signalsObj);
        } catch (error) {
            console.error('Error loading locators:', error);
            toast.error('Failed to load locators.');
        } finally {
            setLoading(false); // Stop loading
        }
    };

    const closeModal = () => {
        setIsOpen(false);
    };

    const toggleExpand = (url: string) => {
        setExpandedURLs((prev) => ({ ...prev, [url]: !prev[url] }));
    };

    const toggleImage = (id) => {
        // First, update the state to toggle visibility
        setLocators((prevLocators) => {
            const newLocators = { ...prevLocators };

            // Iterate through all URLs and locate the correct entry by `index`
            Object.keys(newLocators).forEach((url) => {
                const entry = newLocators[url].find((loc) => loc.index === id);
                if (entry) {
                    entry.isVisible = !entry.isVisible; // Toggle visibility

                    // Log entry to check if it's properly toggled
                    console.log("Toggled entry:", entry);
                }
            });

            return newLocators;
        });

        // Now, fetch the image only if it's not already loaded
        fetchImageIfVisible(id);
    };

    const fetchImageIfVisible = async (id) => {
        const currentLocators = locators();

        // Find the specific entry based on `id`
        for (const url of Object.keys(currentLocators)) {
            const entry = currentLocators[url].find((loc) => loc.index === id);

            if (entry && entry.isVisible && !entry.image) {
                try {
                    const response = await apiClient.post(API_ENDPOINTS.GET_IMAGE_PATH, { id, collection: getProjectName() });

                    if (response.error) {
                        toast.error(response.error);
                        continue;
                    }

                    // After the image is fetched, update the corresponding entry with the image path
                    setLocators((prevLocators) => {
                        const newLocators = { ...prevLocators };
                        const updatedEntry = newLocators[url].find((loc) => loc.index === id);

                        if (updatedEntry) {
                            updatedEntry.image = response.image; // Set image path
                        }

                        return newLocators;
                    });
                } catch (error) {
                    console.error('Error fetching image:', error);
                }
            }
        }
    };



    const updateLocator = async (id) => {
        const updatedLocator = locatorSignals()[id][0](); // Get the value from the signal

        try {
            const res = await apiClient.post(API_ENDPOINTS.UPDATE_LOCATORS, { id, projectPath: getProjectPath(), locator: updatedLocator, collection: getProjectName() });
            toast.success("Locator updated successfully!");
            const fileId = files().find((file: any) => file.name === 'global.js')?.id;
            updateFile(fileId!, { code: res.content });
        } catch (error) {
            console.error('Error updating locator:', error);
            toast.error("Failed to update locator.");
        }
    };

    const deleteLocator = async (id) => {
        try {
            const res =await apiClient.post(API_ENDPOINTS.DELETE_LOCATOR, { id, projectPath: getProjectPath(), collection: getProjectName() });
            setLocators((prevLocators) => {
                const newLocators = { ...prevLocators };
                Object.keys(newLocators).forEach(url => {
                    newLocators[url] = newLocators[url].filter((loc) => loc.index !== id);
                });
                return newLocators;
            });
            const fileId = files().find((file: any) => file.name === 'global.js')?.id;
            updateFile(fileId!, { code: res.content });
            toast.success("Locator deleted successfully!");
        } catch (error) {
            console.error('Error deleting locator:', error);
            toast.error("Failed to delete locator.");
        }
    };

    return (
        <>
            <Icon icon="material-symbols:rule-settings" height={25} width={25} onClick={openModal} />
            <Show when={isOpen()}>
                <div class="modal modal-open">
                    <div class="modal-box max-w-[calc(100vw-50px)] w-full text-white">
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-bold">Locators</h2>
                            <Icon icon="mdi:close" height={25} width={25} onClick={closeModal}/>
                        </div>

                        {/* Show loading indicator when data is being fetched */}
                        <Show when={loading()}>
                            <div class="flex justify-center items-center h-20">
                                <span class="text-lg">Loading...</span>
                            </div>
                        </Show>

                        {/* Show the locators table when not loading */}
                        <Show when={!loading()}>
                            <div class="p-4">
                                <For each={Object.keys(locators())}>
                                    {(url) => (
                                        <div class="mb-4 border border-gray-800 p-5 rounded-md bg-[#1C232D]">
                                            {/* URL Header with Expand/Collapse Button */}
                                            <div class="flex justify-between items-center cursor-pointer"
                                                 onClick={() => toggleExpand(url)}>
                                                <span class="font-semibold">{url}</span>
                                                <button class="px-2 py-1 bg-[#1C232D] text-white rounded">
                                                    {expandedURLs()[url] ? <Icon icon={'mdi:chevron-up'} height={20} width={20}/> : <Icon icon={'mdi:chevron-down'} height={20} width={20}/>}
                                                </button>
                                            </div>
                                            {expandedURLs()[url] && (
                                                <div class="mt-2">
                                                    <table
                                                        class="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg">
                                                        <thead>
                                                        <tr>
                                                            <th class="py-2 px-4">Index</th>
                                                            <th class="py-2 px-4">Locator</th>
                                                            {/* <th class="py-2 px-4">Image</th> */}
                                                        </tr>
                                                        </thead>
                                                        <tbody>
                                                        <For each={locators()[url]}>
                                                            {(entry) => {
                                                                const [locatorSignal, setLocatorSignal] = locatorSignals()[entry.index] || [() => "", () => {}];

                                                                return (
                                                                    <tr>
                                                                        <td class="border-b px-4 py-2 border-gray-600"
                                                                            style={{ 'text-align-last': 'center' }}>{entry.index}</td>
                                                                        <td class="border-b px-4 py-2 border-gray-600"
                                                                            style={{ 'text-align-last': 'center' }}>
                                                                            <input
                                                                                type="text"
                                                                                class={'w-full input input-bordered input-primary-500'}
                                                                                value={locatorSignal()}
                                                                                onInput={(e) => {
                                                                                    const newValue = e.target.value;
                                                                                    setLocatorSignal(newValue); // Update the signal
                                                                                }}
                                                                            />
                                                                        </td>
                                                                        {/* <td class="border-b px-4 py-2 w-[250px] h-[55px] border-gray-600"
                                                                            style={{ 'text-align-last': 'center' }}>
                                                                                <img src={`http://localhost:3001${entry.image}`}
                                                                                     alt={`Screenshot for ${entry.index}`}
                                                                                     class="inline mt-2 h-auto object-contain" />
                                                                        </td> */}
                                                                        <td class="border-b px-4 py-2 border-gray-600"
                                                                            style={{ 'text-align-last': 'center' }}>
                                                                            <button
                                                                                class="btn btn-info btn-sm mr-2 font-medium"
                                                                                onClick={() => updateLocator(entry.index)}>Update
                                                                            </button>
                                                                            <button
                                                                                class="btn btn-error-200 btn-sm btn-outline font-medium"
                                                                                onClick={() => deleteLocator(entry.index)}>Delete
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }}
                                                        </For>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </For>
                            </div>
                        </Show>
                    </div>
                </div>
            </Show>
        </>
    );
};
