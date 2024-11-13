import { Box, Typography, Checkbox, LinearProgress } from "@suid/material";
import { Component, createEffect, createSignal, For, onMount, Show } from "solid-js";
import { useEditor } from "../../context/File-Explorer Context/FileExplorerContext";
import PlayArrowIcon from "@suid/icons-material/PlayArrow";
import CancelIcon from "@suid/icons-material/Cancel";
import { Icon } from "@iconify-icon/solid";
import { useProjectSettings } from "../../context/ProjectSettingContext";
import { apiClient } from "../../api/api";
import { API_ENDPOINTS } from "../../api/apiConfig";
import { getSocketInstance } from "../../SocketHandler";
import { toast } from "solid-toast";
import { v4 as uuidv4 } from 'uuid';
import { useTestHistory } from "../../context/TestHistoryProvider";

import { DefaultEventsMap } from "@socket.io/component-emitter";
import { Socket } from "socket.io-client";
import { getProjectPath } from "../../utils/utils";
import { listenForMessages, socketcodegen } from "../../codegenWs";

interface SelectFilesModalProps {
    open: boolean;
    onClose: () => void;
}

export const SelectFilesModal: Component<SelectFilesModalProps> = (props) => {
    const { testDirPath, isHeadless } = useProjectSettings();
    const { addHistoryEntry } = useTestHistory();
    const { files } = useEditor();
    const [filteredFiles, setFilteredFiles] = createSignal([]);
    const [testTree, setTestTree] = createSignal<TestItem[]>([]);
    const [message, setMessage] = createSignal<string>("");
    const [isRunning, setIsRunning] = createSignal<boolean>(false);
    const [emptyState, setEmptyState] = createSignal(false);
    const [testCompleted, setTestCompleted] = createSignal<boolean>(false); // New state to track if test is completed
    const [errorMessage, setErrorMessage] = createSignal<object>({});
    const [showReport, setShowReport] = createSignal(false);
    const [testResults, setTestResults] = createSignal<Array<{
        title: string,
        status: string,
        details?: string,
        showDetails: boolean
    }>>([]);
    let cloudSocket: Socket<DefaultEventsMap, DefaultEventsMap>;
    let socket: Socket<DefaultEventsMap, DefaultEventsMap>;

    const generateJson = () => {
        const generateSpecFileObject = (item: TestItem) => {
            const specFile: any = { name: item.name };
            let hasValidFeatures = false;
            let hasValidTestCases = false;

            if (!item.checked && item.children?.every(c => c.checked === false)) {
                return null;
            }
            // Handle features (describe blocks)
            if (item.children) {
                const selectedFeatures = item.children
                    .filter(child => child.type === "describe")
                    .map((child) => {
                        const featureObject: any = { name: child.name };
                        let hasValidTestCasesInFeature = false;

                        if (child.children) {
                            const allTestCasesSelected = child.children.every(tc => tc.checked && tc.type === "test");
                            if (allTestCasesSelected) {
                                featureObject.testCases = true;
                                hasValidTestCasesInFeature = true;
                            } else {
                                const selectedTestCases = child.children
                                    .filter(tc => tc.checked && tc.type === "test")
                                    .map(tc => tc.name);
                                if (selectedTestCases.length > 0) {
                                    featureObject.testCases = selectedTestCases;
                                    hasValidTestCasesInFeature = true;
                                }
                            }
                        }

                        if (hasValidTestCasesInFeature) {
                            hasValidFeatures = true;
                            return featureObject;
                        }

                        return null; // Omit the feature if no test cases are selected
                    })
                    .filter(Boolean); // Remove undefined features

                if (selectedFeatures.length > 0) {
                    specFile.features = selectedFeatures;
                }
            }

            // Handle test cases directly under the file (not under any describe block)
            if (item.children) {
                const selectedTestCases = item.children
                    .filter(tc => tc.checked && tc.type === "test")
                    .map(tc => tc.name);

                if (selectedTestCases.length === item.children.filter(c => c.type === "test").length) {
                    specFile.testCases = true; // All test cases directly under the file are selected
                    hasValidTestCases = true;
                } else if (selectedTestCases.length > 0) {
                    specFile.testCases = selectedTestCases; // Some test cases are selected
                    hasValidTestCases = true;
                }
            }

            // Only add `features` if they exist and are selected
            if (!hasValidFeatures) {
                delete specFile.features;
            }

            // Return the spec file if it contains valid features or test cases
            if (hasValidFeatures || hasValidTestCases) {
                return specFile;
            }

            return null; // Omit the file if it has no valid features or test cases
        };

        const traverse = (items: TestItem[]) => {
            const selectedSpecFiles: any[] = [];

            items.forEach((item) => {
                if (item.type === "folder" && item.children) {
                    const childSpecFiles = traverse(item.children);
                    if (childSpecFiles.length > 0) {
                        selectedSpecFiles.push(...childSpecFiles);
                    }
                } else if (item.type === "file") {
                    const fileObject = generateSpecFileObject(item);
                    if (fileObject) {
                        if (item.type === "file" && item.checked) {
                            selectedSpecFiles.push(item.name);
                        } else {
                            selectedSpecFiles.push(fileObject);

                        }
                    }
                }
            });

            return selectedSpecFiles;
        };

        const tree = testTree(); // Assuming testTree() returns the hierarchical test structure of TestItem[]
        if (tree.length !== 0) {
            if (tree[0].type === 'folder' && tree[0].children?.every(c => c.checked === true)) {
                return { toBeTested: { specFiles: true } };
            }
        }
        const selectedSpecFiles = traverse(tree);

        let finalJson: any = {
            toBeTested: {
                specFiles: selectedSpecFiles.length > 0 ? selectedSpecFiles : []
            }
        };

        return finalJson;
    };

    const generateJsonForCloud = () => {
        const escapeRegex = /[\(\)\[\]\{\}\^\$\+\?\.\|\\]/g;

        const collectTestCases = (item: { type: string; checked: any; name: string; children: any[]; }, file: any) => {
            const testCases = [];

            if (item.type === "test" && item.checked) {
                const testCase = {
                    rawtitle: item.name,
                    title: item.name.replace(escapeRegex, '\\$&'),
                    file: file
                };
                testCases.push(testCase);
            }

            if (item.children) {
                item.children.forEach((child: any) => {
                    testCases.push(...collectTestCases(child, file));
                });
            }

            return testCases;
        };

        const traverse = (items: any[]) => {
            let testCaseList: any[] = [];

            items.forEach(item => {
                if (item.type === "folder" && item.children) {
                    testCaseList = testCaseList.concat(traverse(item.children));
                } else if (item.type === "file" && item.checked) {
                    // For selected files, collect test cases
                    testCaseList = testCaseList.concat(collectTestCases(item, item.name));
                }
            });

            return testCaseList;
        };

        const tree = testTree(); // Assuming testTree() returns the hierarchical test structure of TestItem[]
        return traverse(tree);
    };

    const stripAnsiCodes = (text) => {
        return (text || '').replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
    };

    const appendOutput = (data) => {
        const cleanMessage = stripAnsiCodes(data.message);
        setMessage(cleanMessage)
        let match;

        // Regex to match test case result with the format: [chromium] › file:line:col › Test Case
        const testCaseRegex = /\[chromium\]\s›\s([\w\/\.\-_]+):(\d+):\d+\s›\s(.+)/;
        match = cleanMessage.match(testCaseRegex);

        let isFailure = cleanMessage.toLowerCase().includes('failed') || cleanMessage.toLowerCase().includes('error');

        setTestResults(prev => {
            let updatedResults = [...prev];

            // If this line matches a test case (file:line:column format)
            if (match) {
                const [fullMatch, filePath, lineNumber, testTitle] = match;
                const uniqueTestId = `${filePath}:${lineNumber}`;

                // Check if test case already exists
                const existingTestIndex = updatedResults.findIndex(result => result.id === uniqueTestId);

                if (existingTestIndex !== -1) {
                    // Update existing test case details (add the message)
                    updatedResults[existingTestIndex].details += `\n${cleanMessage}`;
                } else {
                    // Add a new test case entry
                    updatedResults.push({
                        id: uniqueTestId,  // Use file path and line number as unique id
                        title: cleanMessage,
                        filePath,
                        lineNumber,
                        status: 'passed',  // Default to passed unless error found later
                        details: cleanMessage, // Store the first detail
                        showDetails: false,
                    });
                }
            } else if (isFailure) {
                // If an error or failure message is found, add it to the most recent test case

                const lastTestIndex = updatedResults.length - 1;

                if (lastTestIndex >= 0) {
                    updatedResults[lastTestIndex].status = 'failed';  // Mark as failed
                    updatedResults[lastTestIndex].details += `\n${cleanMessage}`;  // Append error details
                }
            } else if (cleanMessage.match(/\d+\sfailed/)) {
                // If the line mentions overall failure count (e.g., "1 failed")
                updatedResults = updatedResults.map(result => ({
                    ...result,
                    status: 'failed', // Mark all as failed if mentioned
                    details: result.details
                }));
            }

            return updatedResults;
        });
    };


    onMount(() => {
        cloudSocket = getSocketInstance();
        const name = testDirPath().split('/').pop();// Use `pop()` to get the last element of the array
        const specFolder = findSpecFolder(files(), name);
        setFilteredFiles(specFolder);
        setMessage("");
        setShowReport(false)
        setIsRunning(false);
        setTestCompleted(false);
    });
    const showReportClick = (event: MouseEvent) => {
        // Open a new tab and prepare it for receiving content
        const newTab = window.open('', '_blank');

        if (newTab) {
            // Show a loading message in the new tab
            newTab.document.write('<html><head><title>Loading Report...</title></head><body>');
            newTab.document.write('<h1>Loading report...</h1>');
            newTab.document.write('</body></html>');
            newTab.document.close(); // Close the document to finish writing

            // Fire the API request to get the HTML report content
            fetch(API_ENDPOINTS.TEST_RESULTS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    folderPath: getProjectPath(),
                }),
            })
                .then((response) => response.text()) // Parse response as text (HTML)
                .then((htmlContent) => {
                    // When the API response is received, load the report in the new tab
                    if (newTab) {
                        newTab.document.open();
                        newTab.document.write(htmlContent); // Write HTML content directly
                        newTab.document.close(); // Important to close the document after writing
                    }
                })
                .catch((error) => {
                    // Handle the error in the new tab
                    if (newTab) {
                        newTab.document.open();
                        newTab.document.write('<h1>Error occurred while loading the report.</h1>');
                        newTab.document.write('<p>' + error.message + '</p>');
                        newTab.document.close();
                    }
                });
        }
    };


    const toggleDetails = (index: number) => {
        setTestResults(prev => prev.map((result, i) =>
            i === index ? { ...result, showDetails: !result.showDetails } : result
        ));
    };

    const findSpecFolder = (folders: any[], targetName: any) => {
        if (!Array.isArray(folders)) {
            console.error('Expected an array of folders, but got:', folders);
            return null; // Handle the case where folders is not an array
        }

        // Recursive function to find the folder with the targetName
        const findFolder = (folders: any[]) => {
            for (const folder of folders) {
                if (folder.type === 'folder') {
                    // Check if the current folder's name matches the targetName
                    if (folder.name === targetName) {
                        return folder; // Return the folder with the matching name
                    }

                    // Recursively search in the current folder's children
                    const foundInChild = findFolder(folder.children || []);
                    if (foundInChild) {
                        return foundInChild;
                    }
                }
            }
            return null; // Return null if no matching folder is found
        };

        return findFolder(folders);
    };


    const handleRunTest = async () => {
        const projectPath = getProjectPath();
        const json = generateJson();

        const files = json.toBeTested.specFiles === true ? [] : json.toBeTested.specFiles.filter((file: any) => file.type === 'file');
        const folders = json.toBeTested.specFiles === true ? [] : json.toBeTested.specFiles.filter((file: any) => file.type === 'folder');

        setErrorMessage({});
        setTestResults([]);
        setMessage("Running tests...");
        setIsRunning(true);
        setTestCompleted(false);

        try {
            toast.success('Test running started');

            await new Promise((resolve, reject) => {
                listenForMessages((data) => {
                    if (data.event === 'progress') {
                        appendOutput(data.data); // Handle progress messages
                    }
                });

                listenForMessages((data) => {
                    if (data.event === 'disconnect') {
                        setMessage("Wait for a response from the server...");
                        setIsRunning(false);
                        reject(new Error("Premature disconnect"));
                    }
                });

                // Make the API call to start the test
                apiClient.post(API_ENDPOINTS.RUN_TESTS, {
                    folders: folders || [],
                    files: files || [],
                    folderPath: projectPath,
                })
                    .then((response) => {
                        // Handle the completion response from the API
                        setTestCompleted(true);
                        setIsRunning(false);
                        if (response.success === false) {
                            appendOutput(response);
                            setErrorMessage({
                                message: response.message || 'Error running tests',
                                details: stripAnsiCodes(response.details) || 'No additional details provided',
                            });
                            setIsRunning(false);
                            setMessage(response.message)
                            reject(new Error(response.message || 'Error running tests'));
                        } else {
                            setErrorMessage({});
                            setMessage(response.message)
                            toast.success('Test completed successfully');
                            resolve();
                        }
                    })

            });
            
        } catch (error) {
            toast.error(error.message || 'Error running tests');
        } finally {
            setShowReport(true)
            // Clean up socket listeners
            // socket.off("progress");
            // socket.off("connect_error");
        }
    };

    const handleRunOnCloud = async () => {
        if (!isHeadless()) {
            toast.error('Cloud running is only supported in headless mode');
            return;
        }

        const filePath = getProjectPath();
        let projectName: string | undefined = "";

        if (filePath) {
            if (filePath.includes('\\')) {
                projectName = filePath.split('\\').pop();
            } else if (filePath.includes('/')) {
                projectName = filePath.split('/').pop();
            }
        }

        const name = testDirPath().replaceAll('./', '');
        const json = generateJsonForCloud();
        const uniqueId = uuidv4().substring(0, 13);

        setErrorMessage({});
        setTestResults([]);
        setMessage("Running tests...");
        setIsRunning(true);
        setTestCompleted(false);

        try {
            toast.success('Test running started');

            // Set up socket listeners first
            cloudSocket.on("log", (data) => {
                if (data.message.trim() === '') return;

                const regex = /\] \[0m\s*(.*)/;
                const match = data.message.match(regex);

                if (match && match[1]) {
                    const extractedText = match[1];
                    setMessage(extractedText);
                } else {
                    setMessage(data.message); // Fallback in case the pattern isn't matched
                }
            });

            cloudSocket.on("connect_error", () => {
                setMessage("Wait for a response from the server...");
                setIsRunning(false);
            });

            cloudSocket.on("disconnect", () => {
                setMessage("Wait for a response from the server...");
                setIsRunning(false);
            });

            // Make the API call to start the test
            await apiClient.post(API_ENDPOINTS.RUN_CLOUD, {
                projectPath: filePath,
                folderName: name,
                projectName: projectName,
                jsonFileName: "run-info.json",
                jsonData: json,
                uuid: uniqueId,
            })
                .then((response) => {
                    if (response.success === false) {
                        setTestCompleted(false);
                        setIsRunning(false);
                        appendOutput(response); // Append the API response to the output
                        setErrorMessage({
                            message: response.message || 'Error running tests',
                            details: stripAnsiCodes(response.details) || 'No additional details provided',
                        });
                        const now = new Date();
                        addHistoryEntry({
                            date: now.toLocaleDateString(),
                            time: now.toLocaleTimeString(),
                            status: "Failed",
                            uuid: response.uuid
                        });
                        throw new Error(response.message || 'Error running tests');
                    } else {

                        setTestCompleted(true);
                        setIsRunning(false);
                        setErrorMessage({});
                        const now = new Date();
                        addHistoryEntry({
                            date: now.toLocaleDateString(),
                            time: now.toLocaleTimeString(),
                            status: "Passed",
                            uuid: response.uuid
                        });
                        setMessage(response.message || 'Test completed successfully');
                        toast.success('Test completed successfully');
                    }
                })
                .catch((error) => {
                    setTestCompleted(false);
                    setIsRunning(false);
                    setMessage("Error running tests on cloud.");
                    setErrorMessage({
                        message: 'Error running tests on cloud.',
                        details: error.message || 'No additional details provided',
                    });
                    toast.error(error.message || 'Error running tests');
                });

        } finally {
            setTestCompleted(true);
            setIsRunning(false); // Ensure isRunning is reset
        }
    };

    const cancelTest = async () => {
        if (isRunning() && !testCompleted()) {
            await apiClient.post(API_ENDPOINTS.STOP_TESTS, {}).catch((error) => {
                if (error) {
                    setMessage("Error cancelling tests.");
                    return;
                }
                socket.off("progress");
            });
            toast.success('Test cancelled successfully');
            setIsRunning(false); // Ensure the running state is reset
        }
        props.onClose;
    };

    return (
        <div class={`modal ${props.open ? 'modal-open' : ''}`}>
            <div class="modal-box w-1/2 max-w-5xl bg-base-100 max-h-[80vh]">
                <h2 id="modal-title" class="text-xl font-bold">
                    Select Files, Features, and Test Cases to Run
                </h2>
                <div class="mt-4 max-h-[60vh] overflow-auto">
                    <TestExtractor files={filteredFiles()} testTree={testTree} setTestTree={setTestTree} setEmptyState={setEmptyState}/>
                </div>
                <div class="flex justify-end gap-4 mt-6">
                    <Show when={isRunning() || testCompleted() || errorMessage()}>
                        <button
                            class="btn btn-warning btn-outline"
                            onClick={cancelTest}
                        >
                            <span class="flex items-center">
                                <CancelIcon />
                                <span class="ml-2">{isRunning() || testCompleted() ? 'Cancel' : 'Close'}</span>
                            </span>
                        </button>
                    </Show>
                    <button
                        class="btn btn-primary"
                        disabled={isRunning() || emptyState()}
                        onClick={handleRunTest}
                    >
                        <span class="flex items-center">
                            <PlayArrowIcon class="mr-2" />
                            Run Local
                        </span>
                    </button>
                    <button
                        class="btn btn-accent"
                        disabled={isRunning() || emptyState()}
                        onClick={handleRunOnCloud}
                    >
                        <span class="flex items-center">
                            <Icon icon={'tabler:cloud-share'} class="mr-2" height={30} width={30} />
                            Run Cloud
                        </span>
                    </button>
                </div>
                <Show when={message()}>
                    <div
                        class={`mt-4 flex justify-center items-center gap-5 ${testCompleted() && !isRunning() && !errorMessage().message ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400'} p-2 rounded-md`}>

                        <Show when={isRunning()}>
                            <Icon icon={'mdi:progress-wrench'} class="animate-spin text-white" height={24}
                                width={24} />
                        </Show>
                        <Show when={testCompleted() && !isRunning() && !errorMessage().message}>
                            <Icon icon={'prime:check-circle'} class="text-white" height={24} width={24} />
                        </Show>
                        <Show when={!testCompleted() && !isRunning() && errorMessage().message} fallback={
                            <div class="flex-1 text-center">
                                <p class="text-sm">{message()}</p>
                            </div>
                        }>
                            <div class="bg-base-200 collapse">
                                <input type="checkbox" class="peer" />
                                <div class="collapse-title text-md font-medium flex items-center">
                                    <Icon icon={'prime:exclamation-circle'} class="text-red-500 mr-2" height={24}
                                        width={24} />
                                    <span>{errorMessage().message}</span>
                                </div>
                                <div class="collapse-content">
                                    <p>{errorMessage().details}</p>
                                </div>
                            </div>
                        </Show>

                    </div>
                </Show>
                <Show when={testResults().length > 0}>
                    <ul class="mt-4 space-y-2">
                        {testResults().map((result, index) => (
                            <li key={index} class={`p-2 rounded-md ${result.status === 'failed' ? 'bg-red-800 text-white' : 'bg-green-600 text-white'}`}>
                                <div class="font-medium flex justify-between items-center">
                                    {result.title}
                                    {result.status === 'failed' && (
                                        <button class="btn btn-xs btn-ghost text-white" onClick={() => toggleDetails(index)}>
                                            {result.showDetails ? 'Hide Details' : 'Show Details'}
                                        </button>
                                    )}
                                </div>

                                {result.showDetails && result.status === 'failed' && (
                                    <div class="collapse collapse-open mt-1">
                                        <div class="collapse-content bg-gray-900 p-2 rounded-md">
                                            <pre>
                                                <code class="text-gray-200">
                                                    {result.details}
                                                </code>
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </Show>
                <Show when={showReport()}>
                    <div class="justify-center flex mt-5">
                        <button
                            class="btn btn-primary"
                            onClick={showReportClick}
                        >
                            <span class="flex items-center">
                                <Icon icon={'tabler:report-search'} class="mr-2" height={30} width={30} />
                                Show Report
                            </span>
                        </button>
                    </div>
                </Show>
            </div>
        </div>
    );
};

interface File {
    id: string;
    name: string;
    type: "file" | "folder";
    code?: string;
    extension?: string;
    children?: File[];
}

interface TestItem {
    id: string;
    name: string;
    type: "folder" | "file" | "describe" | "test";
    children?: TestItem[];
    checked: boolean;
    count?: number;
    expanded: boolean; // Added for expand/collapse functionality
}

const TestExtractor = (props: {
    files: File[];
    testTree: any;
    setTestTree: any;
    setEmptyState: any;
}) => {
    const extractTests = (files) => {
        return files.map((file) => {
            if (file.type === "folder") {
                return {
                    id: file.id,
                    name: file.name,
                    type: "folder",
                    children: file.children ? extractTests(file.children) : [],
                    checked: false,
                    expanded: true,
                };
            } else if (file.type === "file" && (file.extension === ".spec.js" || file.extension === ".spec.ts")) {
                const tests = extractTestsFromFile(file);
                const totalTests = countTests(tests);
                return {
                    id: file.id,
                    name: file.name,
                    type: "file",
                    children: tests, // Use the extracted tests directly
                    checked: false,
                    expanded: true,
                    count: totalTests,
                };
            } else {
                return {
                    id: file.id,
                    name: file.name,
                    type: "file",
                    checked: false,
                    expanded: true,
                };
            }
        });
    };


    const extractTestsFromFile = (file: File): TestItem[] => {
        if (!file.code) return [];

        const lines = file.code.split("\n");
        let currentIndex = 0;

        const processLines = (): TestItem[] => {
            const items: TestItem[] = [];
            let currentDescribe: TestItem | null = null;
            let openBracesCount = 0;

            while (currentIndex < lines.length) {
                let line = lines[currentIndex].trim(); // Trim to avoid issues with indentation
                // Ignore lines that are comments or empty
                if (line.startsWith("//") || line === "") {
                    currentIndex++;
                    continue;
                }

                // Match describe block
                const describeMatch = line.match(/test\.describe\(['"](.+?)['"]/);

                // Match test function with possible newline between test name and function
                const testMatch = line.match(/test\(['"](.+?)['"]\s*,\s*(async\s*)?\(/);

                const openBraceMatch = line.match(/\{/);
                const closeBraceMatch = line.match(/\)}/);

                if (describeMatch) {
                    const describeName = describeMatch[1];
                    currentDescribe = {
                        id: `${file.id}-describe-${currentIndex}`,
                        name: `${describeName}`, // Placeholder for the count
                        type: "describe",
                        children: [], // Initialize children as an empty array
                        checked: false,
                        expanded: false,
                    };
                    items.push(currentDescribe); // Add the describe block to the items
                    openBracesCount = 1; // Start counting the braces
                } else if (testMatch) {
                    const testName = testMatch[1];
                    const newTest: TestItem = {
                        id: `${file.id}-test-${currentIndex}`,
                        name: testName,
                        type: "test",
                        checked: false,
                        expanded: false,
                    };

                    if (currentDescribe) {
                        currentDescribe.children!.push(newTest); // Add the test case inside the current describe block
                    } else {
                        items.push(newTest); // If no describe, add at the top level
                    }
                }

                // Track opening and closing braces to determine when the describe block ends
                if (openBraceMatch) {
                    openBracesCount++;
                }
                if (closeBraceMatch) {
                    openBracesCount--;
                }

                if (openBracesCount === 0 && currentDescribe) {
                    currentDescribe = null; // Close the current describe block
                }

                currentIndex++;
            }

            return items;
        };

        return processLines();
    };

    const countTests = (items) => {
        let count = 0;
        for (const item of items) {
            if (item.type === "test") {
                count++;
            } else if (item.children) {
                count += countTests(item.children);
            }
        }
        return count;
    };

    const toggleExpandCollapse = (item: TestItem) => {
        const updateExpanded = (items: TestItem[], targetId: string): TestItem[] => {
            return items.map((i) => {
                if (i.id === targetId) {
                    return {
                        ...i,
                        expanded: !i.expanded,
                    };
                } else if (i.children) {
                    return {
                        ...i,
                        children: updateExpanded(i.children, targetId),
                    };
                }
                return i;
            });
        };

        props.setTestTree((prev: TestItem[]) => updateExpanded(prev, item.id));
    };

    createEffect(() => {
        const files = new Array(props.files) || [];  // Ensure `files` is an array
        if (!Array.isArray(files)) {
            console.warn("`props.files` is not an array. Converting to an empty array.");
        }
        props.setTestTree(Array.isArray(files) ? extractTests(files) : []);
    });


    const handleCheckboxChange = (item: TestItem) => {
        const updateChecked = (items: TestItem[], targetId: string): TestItem[] => {
            return items.map((i) => {
                if (i.id === targetId) {
                    const newChecked = !i.checked;

                    const updateChildrenChecked = (children: TestItem[], checked: boolean): TestItem[] =>
                        children.map((child) => ({
                            ...child,
                            checked,
                            children: child.children ? updateChildrenChecked(child.children, checked) : child.children,
                        }));

                    return {
                        ...i,
                        checked: newChecked,
                        children: i.children ? updateChildrenChecked(i.children, newChecked) : i.children,
                    };
                }

                if (i.children) {
                    const updatedChildren = updateChecked(i.children, targetId);
                    const allChildrenChecked = updatedChildren.every(child => child.checked);
                    const anyChildUnchecked = updatedChildren.some(child => !child.checked);

                    return {
                        ...i,
                        checked: allChildrenChecked && !anyChildUnchecked, // Auto-select/deselect parent based on children

                        children: updatedChildren,
                    };
                }

                return i;
            });
        };

        const deselectSiblings = (items: TestItem[], parentId: string): TestItem[] => {
            return items.map((i) => {
                if (i.id === parentId && i.children) {
                    return {
                        ...i,
                        children: i.children.map(child => ({
                            ...child,
                            checked: child.id === item.id ? !child.checked : false,
                        })),
                    };
                }
                return i.children ? { ...i, children: deselectSiblings(i.children, parentId) } : i;
            });
        };

        props.setTestTree((prev: TestItem[]) => {
            let updatedTree = updateChecked(prev, item.id);

            if (!item.children) {
                updatedTree = deselectSiblings(updatedTree, item.id);
            }

            return updatedTree;
        });
    };

    const TreeItem = (prop: { item: TestItem; level: number }) => {
        const hasNonEmptyChildren = (item: TestItem): boolean => {
            if (item.type === "file") {
                // Return true if the file has non-empty children
                return item.children && item.children.length > 0;
            } else if (item.type === "folder") {
                // Check if any child has non-empty children
                return item.children && item.children.some(hasNonEmptyChildren);
            }
            return false;
        };
    
        // Skip rendering the folder if all files within have empty children
        if (prop.item.type === "folder" && !hasNonEmptyChildren(prop.item)) {
            return null;
        }
        if (prop.item.type === "file" && (!prop.item.children || prop.item.children.length === 0)) {
            return null;
        }
    
        
        return (
                <li class="py-1">
                    <label class="flex items-center space-x-2" style={{ height: "30px" }}>
                        <Show when={prop.item.children && prop.item.children.length > 0}>
                            <span
                                class={
                                    "cursor-pointer w-6 h-6 hover:text-blue-500 hover:bg-gray-700 rounded-full"
                                }
                                style={{ "text-align-last": "center" }}
                                onClick={() => toggleExpandCollapse(prop.item)}
                            >
                                <Show
                                    when={prop.item.expanded}
                                    fallback={<Icon icon={"mdi:chevron-right"} height={22} width={22} />}
                                >
                                    <Icon icon={"mdi:chevron-down"} height={22} width={22} />
                                </Show>
                            </span>
                        </Show>
                        <Checkbox
                            sx={{ color: "slate-600" }}
                            class="w-5 h-5 ml-0 text-slate-500"
                            checked={prop.item.checked}
                            onChange={() => handleCheckboxChange(prop.item)}
                        />
                        <span
                            class={`text-md ${prop.item.type === "folder" || prop.item.type === "file"
                                ? "font-bold"
                                : "font-medium"
                                }`}
                        >
                            {prop.item.name}
                        </span>
                        <span
                            class={'text-sm text-gray-500 font-bold'}>{prop.item.type === 'describe' ? `(${prop.item.children?.length})` : prop.item.type === 'file' ? `(${prop.item.count})` : ''}</span>
                    </label>
                    <Show when={prop.item.expanded && prop.item.children?.length > 0}>
                      
                        <ul class="menu bg-base-200 menu-xs rounded-box">
                            <For each={prop.item.children}>
                                {(child) => <TreeItem item={child} level={prop.level + 1} />}
                            </For>
                        </ul>
                    </Show>

                </li>
        );
    };
    const hasNonEmptyChildren = (item: TestItem): boolean => {
        if (item.type === "file") {
            // Return true if the file has non-empty children
            return item.children && item.children.length > 0;
        } else if (item.type === "folder") {
            // Check if any child has non-empty children
            return item.children && item.children.some(hasNonEmptyChildren);
        }
        return false;
    };
    // Helper function to check if there are any non-empty children across all items
    const hasAnyNonEmptyChildren = (items: TestItem[]): boolean => {
        const result = items.some(hasNonEmptyChildren);
        props.setEmptyState(!result); // Set emptyState based on the result
        return result;
    };

    return (
        <ul class="menu bg-base-200 menu-xs rounded-box">
        <Show when={hasAnyNonEmptyChildren(props.testTree())} fallback={<li class="self-center">No test case found in any file</li>}>
            <For each={props.testTree()}>
                {(item) => <TreeItem item={item} level={0} />}
            </For>
        </Show>
    </ul>

    );

};

//
// import { createSignal, onCleanup, onMount } from 'solid-js';
// import {getSocketInstance, sendMessage} from "../../SocketHandler"; // Import API call logic (you should have a separate API function)
//
// // This is the modal component
// export const SelectFilesModal = (props) => {
//     const [data, setData] = createSignal([]); // Signal to store data
//     let socket;
//
//     onMount(async () => {
//         // Fetch initial data via API when modal is opened
//         // try {
//         //     const initialData = await fetchData(); // Make an API call to fetch the data
//         //     setData(initialData);
//         // } catch (error) {
//         //     console.error('Failed to fetch initial data:', error);
//         // }
//
//         // Initialize Socket.IO when the dialog opens
//         socket = getSocketInstance();
//
//         // Listen for real-time updates through Socket.IO
//         socket.on('update', (newData) => {
//             console.log('Real-time data received:', newData);
//             setData(newData); // Update the data with real-time data
//         });
//
//         onCleanup(() => {
//             // Disconnect socket when the modal is closed
//             socket.disconnect();
//             console.log('Socket disconnected on cleanup');
//         });
//     });
//
//     return (
//         <div>
//             {props.isOpen && (
//                 <div class="modal">
//                     <h1>Select Files</h1>
//                     <ul>
//                         {data().map((item) => (
//                             <li>{item.name}</li>
//                         ))}
//                     </ul>
//                     <button onClick={() => sendMessage('Hello from client')}>
//                         Send Message to Server
//                     </button>
//                 </div>
//             )}
//         </div>
//     );
// };