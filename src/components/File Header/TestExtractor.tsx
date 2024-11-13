import { Checkbox } from "@suid/material";
import { Icon } from "@iconify-icon/solid";
import { createEffect, Show, For } from "solid-js";
import { TestItem, File } from "../../utils/fileUtils";



export const TestExtractor = (props: {
    files: File[];
    testTree: any;
    setTestTree: any;
}) => {

    const extractTests = (files: File[]): TestItem[] => {
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
                    children: extractTestsFromFile(file),
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

                // Match describe block
                const describeMatch = line.match(/test\.describe\(['"](.+?)['"]/);

                // Match test function with possible newline between test name and function
                const testMatch = line.match(/test\(['"](.+?)['"]\s*,\s*(async\s*)?\(/);

                const openBraceMatch = line.match(/\{/);
                const closeBraceMatch = line.match(/\}/);

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
    const countTests = (items: TestItem[]): number => {
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
        const files: any = new Array(props.files) || [];  // Ensure `files` is an array
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
                <Show when={prop.item.expanded && prop.item.children!.length > 0}>
                    <ul class="menu bg-base-200 menu-xs rounded-box">
                        <For each={prop.item.children}>
                            {(child) => <TreeItem item={child} level={prop.level + 1} />}
                        </For>
                    </ul>
                </Show>
            </li>
        );
    };
    return (
        <ul class="menu bg-base-200 menu-xs rounded-box">
            <For each={props.testTree()}>
                {(item) => <TreeItem item={item} level={0} />}
            </For>
        </ul>
    );

};
