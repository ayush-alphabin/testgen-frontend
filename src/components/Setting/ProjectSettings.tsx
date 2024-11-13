import { createEffect, onMount } from "solid-js";
import { Icon } from "@iconify-icon/solid";
import { useProjectSettings } from "../../context/ProjectSettingContext";
import { Checkbox } from "@suid/material";

export const ProjectSettings = (props) => {
    const {
        baseUrl = '', // Ensure it's an empty string by default
        setBaseUrl = '',
        selectedBrowser = 'chromium', // Ensure a default browser is selected
        setSelectedBrowser,
        slowMo = 0, // Ensure a default value for slowMo
        setSlowMo,
        testDirPath = '', // Ensure it's an empty string by default
        setTestDirPath,
        fetchProjectSettings,
        saveProjectSettings,
        isHeadless = false, // Ensure a default value for headless
        setIsHeadless,
        workers = 1, // Ensure a default value for workers
        setWorkers,
    } = useProjectSettings();

    onMount(()=>{
        fetchProjectSettings();
    })

    createEffect(() => {
        if (props.open) {
            fetchProjectSettings(); // Fetch settings every time the modal is opened
        }
    });

    const handleSave = async () => {
        await saveProjectSettings();
        props.onClose();
    };

    return (
        <div class={`modal ${props.open ? 'modal-open' : ''}`} onClick={props.onClose}>
            <div class="modal-box w-full max-w-lg  relative" onClick={(e) => e.stopPropagation()}>
                <h2 class="text-lg font-bold mb-4">Project Settings</h2>
                <div class="divider"></div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Project Base URL</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Enter URL here"
                            class="input input-bordered w-full"
                            value={baseUrl()}
                            onInput={(e) => setBaseUrl(e.target.value)}
                        />
                    </div>

                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Slow Mo (Ms)</span>
                        </label>
                        <input
                            type="number"
                            placeholder="Enter Slow Mo in Ms"
                            class="input input-bordered w-full"
                            value={slowMo()}
                            onInput={(e) => setSlowMo(e.target.value)}
                        />
                    </div>

                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Test Directory Path</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Enter Directory Path"
                            class="input input-bordered w-full"
                            value={testDirPath()}
                            onInput={(e) => setTestDirPath(e.target.value)}
                        />
                    </div>

                    {/*  <div class="form-control">
                        <label class="label">
                            <span class="label-text">Output Directory Path</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Enter Output Path"
                            class="input input-bordered w-full"
                            value={outputDirPath()}
                            onInput={(e) => setOutputDirPath(e.target.value)}
                        />
                    </div> */}

                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Number of Workers</span>
                        </label>
                        <input
                            type="number"
                            placeholder="Enter Number of Workers"
                            class="input input-bordered w-full"
                            value={workers() || 1}
                            onInput={(e) => setWorkers(e.target.value)}
                            min={1}
                            max={5}
                        />
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">{"Show Browser"}</span>
                        </label>

                        <div class="flex items-center border border-slate-600 p-2 rounded-lg h-12">
                            <Checkbox
                                class="text-slate-500"
                                sx={{ width: '1.5rem', height: 'auto', color: "slate-600" }}
                                checked={isHeadless()}
                                onChange={(event, checked) => {
                                    setIsHeadless(checked);
                                }}
                            />
                            <span class="label-text ml-2">{" "}Headless Mode</span>
                        </div>
                    </div>

                    <div class="form-control lg:col-span-2">
                        <label class="label">
                            <span class="label-text">Select Project Browser</span>
                        </label>
                        <div class="flex gap-2">
                            <label
                                class="cursor-pointer flex items-center gap-2 border border-slate-600 p-2 rounded-lg">
                                <input
                                    type="radio"
                                    name="browser"
                                    value="chromium"
                                    class="radio radio-slate-800 radio-sm mr-2"
                                    checked={selectedBrowser() === "chromium"}
                                    onChange={(e) => setSelectedBrowser(e.target.value)}
                                />
                                <span class="flex items-center gap-1"><Icon icon="logos:chrome" height={20} width={20} />{" "} Chromium</span>
                            </label>
                            <label class="cursor-pointer flex items-center gap-2 border border-slate-600 p-2 rounded-lg">
                                <input
                                    type="radio"
                                    name="browser"
                                    value="firefox"
                                    class="radio radio-slate-800 radio-sm mr-2"
                                    checked={selectedBrowser() === "firefox"}
                                    onChange={(e) => setSelectedBrowser(e.target.value)}
                                />
                                <span class="flex items-center gap-1"><Icon icon="logos:firefox" height={20} width={20} /> Firefox</span>
                            </label>
                            <label class="cursor-pointer flex items-center gap-2 border border-slate-600 p-2 rounded-lg">
                                <input
                                    type="radio"
                                    name="browser"
                                    value="edge"
                                    class="radio radio-slate-800 radio-sm mr-2"
                                    checked={selectedBrowser() === "edge"}
                                    onChange={(e) => setSelectedBrowser(e.target.value)}
                                />
                                <span class="flex items-center gap-1"><Icon icon="logos:microsoft-edge" height={20} width={20} /> Edge</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="modal-action flex justify-between gap-2 mt-10">
                    <button class="btn btn-outline h-10 btn-sm" onClick={props.onClose}>Cancel</button>
                    <button class="btn btn-info text-white font-medium w-20 h-10 btn-sm" onClick={handleSave}>Save</button>
                </div>
            </div>
        </div>

    );
};
