import { createContext, useContext, createSignal, JSX, Accessor, Setter, createEffect } from 'solid-js';
import { useAlert } from "./AlertContext";
import { apiClient } from "../api/api";
import { API_ENDPOINTS } from "../api/apiConfig";
import { useEditor } from "./File-Explorer Context/FileExplorerContext";
import { getProjectPath } from '../utils/utils';
import { initializeWebSocket, listenForMessages } from '../codegenWs';


interface ProjectSettingsContextProps {
    baseUrl: Accessor<string>;
    setBaseUrl: Setter<string>;
    selectedBrowser: Accessor<string>;
    setSelectedBrowser: Setter<string>;
    testDirPath: Accessor<string>;
    setTestDirPath: Setter<string>;
    slowMo: Accessor<number>;
    setSlowMo: Setter<number>;
    workers: Accessor<number>;
    setWorkers: Setter<number>;
    isHeadless: Accessor<boolean>;
    setIsHeadless: Setter<boolean>;
    saveProjectSettings: () => Promise<void>;
    fetchProjectSettings: () => Promise<void>;
}

const ProjectSettingsContext = createContext<ProjectSettingsContextProps>();

export const ProjectSettingsProvider = (props: { children: JSX.Element }) => {
    const { showAlert } = useAlert();
    const { files, setFiles, updateFile } = useEditor();
    const [baseUrl, setBaseUrl] = createSignal('http://127.0.0.1:8080');
    const [selectedBrowser, setSelectedBrowser] = createSignal('chromium');
    const [slowMo, setSlowMo] = createSignal(0);
    const [testDirPath, setTestDirPath] = createSignal('./tests');
    const [workers, setWorkers] = createSignal(1);
    const [isHeadless, setIsHeadless] = createSignal(false);

    const fetchProjectSettings = async () => {

        try {
            const response = await apiClient.post(API_ENDPOINTS.GET_CONFIG, {
                rootpath: getProjectPath(),
            });

            if (response) {
                const data = response;
                setBaseUrl(data.baseUrl);
                setSelectedBrowser(data.selectedBrowser);
                setTestDirPath(data.testDir);
                setSlowMo(data.slowMo);
                setWorkers(data.noOfWorkers);
                setIsHeadless(data.headless);
            } else {
                console.error('Failed to fetch project settings');
            }
        } catch (error) {
            console.error('Error fetching project settings:', error);
        }
    };

    const saveProjectSettings = async () => {

        try {
            const response = await apiClient.post(API_ENDPOINTS.UPDATE_CONFIG, {
                baseUrl: baseUrl(),
                selectedBrowser: selectedBrowser(),
                testDir: testDirPath(),
                slowMo: slowMo(),
                noOfWorkers: workers(),
                headless: isHeadless(),
                rootPath: getProjectPath(),
            });

            if (response.message) {
                console.log('Project settings saved successfully');
                showAlert('success', 'Project settings saved successfully');
                resetPlaywrightConfigFile();
            } else {
                console.error('Failed to save project settings');
            }
        } catch (error) {
            console.error('Error saving project settings:', error);
        }
    };

    const resetPlaywrightConfigFile = () => {
        const basePath = getProjectPath()
        const fileName = 'playwright.config.js';
        const fileId = files().find(file => file.name === fileName)?.id;

        apiClient.post(API_ENDPOINTS.FETCH_FILE, {
            projectPath: basePath, name: fileName,
        }).then((data) => {
            const { content, filePath } = data;
            updateFile(fileId, { code: content });

            // Update the files state
            setFiles(files =>
                files.map(file => {

                    const updatedFilePath = file.path.replace(/\//g, '\\');

                    if (updatedFilePath === filePath) {
                        return { ...file, code: content, path: filePath };
                    }
                    return file;
                })
            );
        })
    };

    return (
        <ProjectSettingsContext.Provider
            value={{
                baseUrl,
                setBaseUrl,
                selectedBrowser,
                setSelectedBrowser,
                slowMo,
                setSlowMo,
                workers,
                testDirPath,
                setTestDirPath,
                setWorkers,
                isHeadless,
                setIsHeadless,
                saveProjectSettings,
                fetchProjectSettings,
            }}
        >
            {props.children}
        </ProjectSettingsContext.Provider>
    );
};

export const useProjectSettings = () => useContext(ProjectSettingsContext);