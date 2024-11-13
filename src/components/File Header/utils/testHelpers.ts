import { v4 as uuidv4 } from 'uuid';
import { TestItem } from '../../../utils/fileUtils';

export const generateJson = (testTree: any) => {
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
        if (tree[0].type === 'folder' && tree[0].children?.every((c: any) => c.checked === true)) {
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

export const generateJsonForCloud = (testTree: any) => {
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

export function getProjectName(filePath: string) {
    if (filePath.includes('\\')) {
        return filePath.split('\\').pop();
    } else if (filePath.includes('/')) {
        return filePath.split('/').pop();
    }
    return undefined;
}

export function generateUniqueId() {
    return uuidv4().substring(0, 13);
}
