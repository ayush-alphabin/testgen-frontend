import { useTheme } from '@suid/material/styles';
import * as monaco from 'monaco-editor';
import { Component, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import No_File_Selected from "../assets/no_file_selected.png";
import { initializeWebSocket, listenForMessages, sendMessage } from '../codegenWs';
import { useEditor } from '../context/File-Explorer Context/FileExplorerContext';
import { getLanguageByExtension } from "../utils/utils";

const MonacoEditor: Component<{ runningLine: number | null }> = (props) => {
    const {
        currentFile,
        theme,
        saveFile,
        addWhereCursor,
        handleFileChange,
        getCurrentContent,
        getCursorPosition,
        setEditorInstance,
        fetchAndUpdateFile,
        editorInstance,
        updateFile,
    } = useEditor();
    let editorContainer: HTMLDivElement | undefined;
    let editor: monaco.editor.IStandaloneCodeEditor;
    const themeData = useTheme();
    const getEditorContent = createMemo(() => currentFile()?.code || '');
    const [loading, setLoading] = createSignal(false);

    function isCursorInTestBlock(content: string, position: monaco.Position) {
        const lines = content.split('\n');
        let insideTestBlock = false;
        let blockDepth = 0;

        // Traverse through lines to identify if the cursor is inside a test block
        for (let i = 0; i < lines.length; i++) {
            const trimmedLine = lines[i].trim();

            // Skip only commented-out lines
            if (trimmedLine.startsWith('//')) {
                continue;  // Ignore comments but don't modify line numbers
            }

            // Detect the start of a test block
            if (trimmedLine.includes('test(') && blockDepth === 0) {
                insideTestBlock = true;
                blockDepth = 1;
            }

            // Track opening braces within the block (count all `{`)
            if (insideTestBlock && trimmedLine.includes('{')) {
                blockDepth++;
            }

            // Track closing braces within the block (count all `}`)
            if (insideTestBlock && trimmedLine.includes('}')) {
                blockDepth--;
            }

            // If we reach the cursor line, determine if it's inside the test block
            const cursorLine = position.lineNumber - 1; // Adjust for zero-based index
            if (i === cursorLine) {
                return blockDepth > 0; // Return true if block depth is positive
            }

            // Check if we are outside the test block after processing closing braces
            if (blockDepth === 0) {
                insideTestBlock = false; // We've exited the test block
            }
        }

        return false; // Return false if not inside any test block
    }

    const addCodeToEditor = (code: string) => {
        const currentContent = getCurrentContent();
        const cursorPosition = getCursorPosition();

        if (!cursorPosition) return;

        if (isCursorInTestBlock(currentContent, cursorPosition)) {
            addWhereCursor(code);
        } else {
            const newTestCase = `
// Auto generated test case
test("Test Case", async ({ browser }) => {
    ${code}
});
`;

            const insertionPosition = cursorPosition.lineNumber + 1;
            addWhereCursor(newTestCase);

            // Calculate the position to focus inside the test block
            const newCursorPosition = {
                lineNumber: insertionPosition + 3, // The line inside the test block where code starts
                column: 1, // The column where the code starts
            };

            editorInstance().setPosition(newCursorPosition);
            editorInstance().focus();
        }
    };

    const formateDocument = () => {
        editorInstance().getAction('editor.action.formatDocument').run();
    };


    const getLanguage = createMemo(() => {
        return getLanguageByExtension(currentFile()?.extension);
    });

    createEffect(() => {
        initializeWebSocket("ws://localhost:3001")
            .then(() => {
                listenForMessages((data) => {
                    if (data.event === "codeUpdate") {
                        addCodeToEditor(data.message);
                    }

                    if (data.event === "stopRecord") {


                        const startLineNumber = data.startLine;
                        const cursorPosition = getCursorPosition();
                        const endLineNumber = cursorPosition?.lineNumber;

                        if (
                            startLineNumber !== null &&
                            endLineNumber !== null &&
                            startLineNumber <= endLineNumber
                        ) {
                            const editor = editorInstance(); // Assuming editor instance is accessible
                            if (!editor) {
                                console.error("Editor instance not found");
                                return;
                            }

                            const model = editor.getModel();
                            if (!model) {
                                console.error("Editor model not found");
                                return;
                            }

                            const codeBetweenLines = model.getValueInRange({
                                startLineNumber: startLineNumber,
                                startColumn: 1,
                                endLineNumber: endLineNumber,
                                endColumn: model.getLineMaxColumn(endLineNumber),
                            });

                            // Send WebSocket message (outside of reactive context to prevent loops)
                            sendMessage({
                                event: "endRecording",
                                code: codeBetweenLines,
                                startLine: startLineNumber,
                                endLine: endLineNumber,
                            });
                        }
                    }

                    if (data.event === "replaceCode") {



                        const { startLine, endLine, code } = data;
                        const editor = editorInstance();
                        if (!editor) {
                            console.error("Editor instance not found");
                            return;
                        }

                        const model = editor.getModel();
                        if (!model) {
                            console.error("Editor model not found");
                            return;
                        }

                        const endColumn = model.getLineMaxColumn(
                            startLine + code.split("\n").length - 1
                        );
                        editor.setPosition({ lineNumber: startLine, column: endColumn });

                        editor.executeEdits("", [
                            {
                                range: new monaco.Range(
                                    startLine,
                                    1,
                                    endLine,
                                    model.getLineMaxColumn(endLine)
                                ),
                                text: code,
                                forceMoveMarkers: true,
                            },
                        ]);

                        fetchAndUpdateFile("global.js");
                        formateDocument()
                    }

                    if (data.event === "loadingStart") {
                        setLoading(true);
                    }

                    if (data.event === "loadingEnd") {
                        setLoading(false);
                    }
                });
            })
    });

    onMount(() => {
        monaco.editor.defineTheme('myTheme', {
            base: 'vs',
            inherit: true, // Inherit other rules from the base theme
            rules: [],
            colors: {
                'editor.background': '#11171c', // Dark slate background color
                'editor.foreground': '#f8fafc', // Text color
                'editor.lineHighlightBackground': '#2c3a42', // Line highlight color
                'editorCursor.foreground': '#ffffff', // Cursor color
                'editorLineNumber.foreground': '#8ba2b1', // Line number color
            }
        });

        // Create the Monaco editor
        editor = monaco.editor.create(editorContainer, {
            value: getEditorContent(),
            language: getLanguage(),
            theme: 'myTheme', // Apply custom theme
            lineNumbers: 'on',
            wordWrap: 'on',
            formatOnType: true,
            formatOnPaste: true,
            foldingImportsByDefault: true,
            automaticLayout: true,
            folding: true,
            minimap: { enabled: true },
            fontSize: 14,
        });

        setEditorInstance(editor);

        editor.onDidChangeModelContent(() => {
            const newValue = editor.getValue();
            if (newValue !== currentFile()?.code) {
                handleFileChange(newValue);
            }
        });

        onCleanup(() => {
            editor.dispose();
        });
    });


    createEffect(() => {
        const file = currentFile();
        if (editor && file) {

            const currentCode = file.code || '';
            const oldModel = editor.getModel();
            if (oldModel) oldModel.dispose();

            const newModel = monaco.editor.createModel(currentCode, getLanguage());
            editor.setModel(newModel);

            const isReadOnly = ['playwright.config.js', 'global.js', 'package.json', 'package-lock.json'].includes(file.name);
            editor.updateOptions({ readOnly: isReadOnly });
        } else if (editor) {
            editor.setValue(''); // Clear the editor if no file is selected
        }
    });


    createEffect(() => {
        if (editor) {
            monaco.editor.setTheme(theme());
        }
    });

    return (
        <>
            {/* Loader Overlay */}
            <div class={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${loading() ? '' : 'hidden'}`}>
                <div class="text-center bg-slate-900 rounded-lg p-5">
                    <div class="loading"></div>
                    <p class="text-white">Please wait while updating locator...</p>
                </div>
            </div>

            {/* Main Content */}
            <div
                ref={(el) => (editorContainer = el)}
                class={'flex items-center justify-center h-screen'}
                style={{
                    display: (currentFile() && currentFile()!.name !== 'index.html' && !loading()) ? 'block' : 'none',
                }}
            />

            <div
                class="flex items-center bg-background flex-col justify-center h-screen"
                style={{
                    display: !currentFile() ? 'flex' : 'none',
                }}
            >
                <img src={No_File_Selected} alt={'No File Selected'} class={'h-200px'} />
                <div className="text-3xl center text-white">Select a file to get started</div>
                <div className="text-2xl center text-slate-300">with your test case execution</div>
            </div>
        </>
    );

};

export default MonacoEditor;
