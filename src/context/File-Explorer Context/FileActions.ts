import { File } from '../../../src/utils/fileUtils';
import {createNewFile} from "../../utils/fileUtils";
import {Accessor, Setter} from "solid-js";
import {apiClient} from "../../api/api";
import {API_ENDPOINTS} from "../../api/apiConfig";

// export const handleFileChange = (code: string, currentFile: any, setFiles: any, setCurrentFile: any,setOriginalContent: any) => {
//     const current = currentFile();
//     if (current) {
//         const updatedFile: File = { ...current, code };
//         setCurrentFile(updatedFile);
//         setFiles(files => files.map((file: File) => (file.id === updatedFile.id ? updatedFile : file)));
//     }
//     setOriginalContent(current.code || ""); // Update original content when a file is selected
// };


export const handleNameChange = (
    name: string,
    currentFile: Accessor<File | null>,
    setFiles: Setter<File[]>,
    setCurrentFile: Setter<File | null>
) => {
    const current = currentFile();
    if (current) {
        const newPath = `${current.path?.substring(0, current.path.lastIndexOf('/'))}/${name}`;
        const updatedFile: File = { ...current, name, path: newPath };

        setCurrentFile(updatedFile);
        setFiles((files) => files.map((file) => (file.id === updatedFile.id ? updatedFile : file)));
    }
};


export const handleAddFile = async (
    name: string,
    type: 'file' | 'folder',
    parentId: string | undefined,
    files: Accessor<File[]>,
    setFiles: Setter<File[]>,
    setCurrentFile: Setter<File | null>
)  => {
    const findParent = (files: File[], parentId: string): File | undefined => {
        for (const file of files) {
            if (file.id === parentId) return file;
            if (file.children) {
                const found = findParent(file.children, parentId);
                if (found) return found;
            }
        }
        return undefined;
    };

    const parentFile = parentId ? findParent(files(), parentId) : null;
    const newPath = parentFile ? `${parentFile.path}/${name}` : name;
    const newFile = createNewFile(name, type, '', newPath);

    const { path } = parentFile;
    await apiClient.post(API_ENDPOINTS.CREATE_FILE, { projectPath: path, name, type });


    const updateChildren = (files: File[]): File[] => {
        return files.map((file) => {
            if (file.id === parentId && file.children) {
                return { ...file, children: [...file.children, newFile] };
            } else if (file.children) {
                return { ...file, children: updateChildren(file.children) };
            }
            return file;
        });
    };

    if (parentId) {
        setFiles(updateChildren(files()));
    } else {
        setFiles([...files(), newFile]);
    }
};


export const updatePlaywrightConfig = (files: File[], baseUrl: string, selectedBrowser: string, setFiles: any) => {
    let filesUpdated = false;

    const updatedFiles = files.map(file => {
        if (file.name === 'playwright.config.js') {
            const updatedCode = `
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  snapshotDir: './test-results/snapshots',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'json', // Reporter to use.
  use: {
    baseURL: '${baseUrl}',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    ${selectedBrowser}
  ]
});
            `;

            if (file.code !== updatedCode) {
                filesUpdated = true;
                return {
                    ...file,
                    code: updatedCode,
                };
            }
        }
        return file;
    });

    if (filesUpdated) {
        setFiles(updatedFiles);
    }

    return filesUpdated;
};

const describePattern = /test\.describe\(['"`](.*?)['"`],\s*\(\s*\)\s*=>\s*{([\s\S]*?)}\);/g;
const testCasePattern = /test\(['"`](.*?)['"`],\s*async\s*\(\s*{?\s*page?\s*}?\s*\)\s*=>\s*{([\s\S]*?)}\);/g;
const lifecycleHookPattern = /test\.(beforeAll|beforeEach|afterEach|afterAll)\(\s*async\s*\(\s*\{?\s*(?:browser|page)?\s*\}?\s*\)\s*=>\s*{([\s\S]*?)}\s*\);/g;

export const validateCodeStructure = (code: string): { isValid: boolean, errors: string[] } => {
    let errors: string[] = [];

    // Validate the structure of test.describe block
    const describeMatches = code.match(describePattern);
    if (!describeMatches) {
        errors.push("Missing or incorrectly structured 'test.describe' block.");
    }

    // Validate the structure of test cases inside the describe block
    const testCaseMatches = code.match(testCasePattern);
    if (!testCaseMatches && describeMatches) {
        errors.push("Missing or incorrectly structured 'test' cases inside 'test.describe'.");
    }

    // Validate lifecycle hooks to ensure no nesting of describe or test cases
    const lifecycleMatches = code.match(lifecycleHookPattern);
    if (lifecycleMatches) {
        lifecycleMatches.forEach((hook) => {
            const [fullMatch, hookType, hookContent] = hook.match(/test\.(beforeAll|beforeEach|afterEach|afterAll)\(\s*async\s*\(\s*\{?\s*(?:browser|page)?\s*\}?\s*\)\s*=>\s*{([\s\S]*?)}\s*\);/) || [];
            if (hookContent.match(describePattern) || hookContent.match(testCasePattern)) {
                errors.push(`'test.describe' or 'test' blocks cannot be nested inside '${hookType}' hooks.`);
            }
        });
    }

    // Additional checks for nested describe blocks or incorrect usage
    const nestedDescribePattern = /test\.describe\((?:'|"|`)(.*?)(?:'|"|`),\s*\(\)\s*=>\s*{(?:[\s\S]*?test\.describe)/g;
    const nestedDescribeMatch = code.match(nestedDescribePattern);
    if (nestedDescribeMatch) {
        errors.push("Nested 'test.describe' blocks are not allowed.");
    }

    // Additional checks for unsupported beforeEach, afterEach in nested structure
    const nestedBeforeEachPattern = /test\.beforeEach\(\(\)\s*=>\s*{(?:[\s\S]*?test\.beforeEach)/g;
    const nestedAfterEachPattern = /test\.afterEach\(\(\)\s*=>\s*{(?:[\s\S]*?test\.afterEach)/g;
    if (code.match(nestedBeforeEachPattern) || code.match(nestedAfterEachPattern)) {
        errors.push("Nested 'test.beforeEach' or 'test.afterEach' blocks are not supported.");
    }

    return { isValid: errors.length === 0, errors };
};
