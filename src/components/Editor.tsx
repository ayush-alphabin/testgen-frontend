import { createSignal } from "solid-js";
import { Toaster } from "solid-toast";
import { AlertProvider } from "../context/AlertContext";
import { FileExplorerProvider } from "../context/File-Explorer Context/FileExplorerContext";
import { ProjectSettingsProvider } from "../context/ProjectSettingContext";
import { RecentlyEditorProvider } from "../context/RecentlyEditorContext";
import { FileExplorer } from "./File Explorer/FileExplorer";
import { FileHeader } from "./File Header/FileHeader";
import MonacoEditor from "./MonacoEditor";

const Editor = () => {
    const [baseURL, setBaseURL] = createSignal('https://www.alphabin.co/contact-us');
  
    return (
        <AlertProvider>
                <RecentlyEditorProvider>
                    <FileExplorerProvider>
                        <ProjectSettingsProvider>
                            <Toaster/>
                        <div class="flex h-screen w-screen text-white relative">


                            <aside class="w-[300px] bg-dark-slate-950 p4-4">
                                <FileExplorer />
                            </aside>

                            <main class="flex flex-row bg-[#1E1E1E] flex-grow">
                                <div class={'w-[-webkit-fill-available] overflow-y-hidden'}>
                                    <FileHeader />
                                    <div class="flex-grow">
                                        <MonacoEditor />
                                    </div>
                                </div>
                            </main>
                        </div>
                        </ProjectSettingsProvider>
                    </FileExplorerProvider>
                </RecentlyEditorProvider>
        </AlertProvider>
    );
};

export default Editor;
