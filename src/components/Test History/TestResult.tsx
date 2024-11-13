import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { useLocation } from "@solidjs/router";
import Breadcrumbs from "../custom/Breadcumb";
import { stripAnsiCodes } from "../../utils/utils";
import { apiClient } from "../../api/api";

export const TestResults = () => {
    const location = useLocation();

    const [results, setResults] = createSignal([]);
    const [searchTerm, setSearchTerm] = createSignal("");
    const [statusFilter, setStatusFilter] = createSignal("");
    const [loading, setLoading] = createSignal(true);
    const [runId, setRunId] = createSignal("");
    const [errorDetails, setErrorDetails] = createSignal(null);
    const [modalOpen, setModalOpen] = createSignal(false);

    const filteredResults = createMemo(() => {
        if (!results()) return
        return results()
            .map((suite) => ({
                ...suite,
                specs: suite.specs?.filter((spec) => {
                    const matchesSearchTerm =
                        spec.title.toLowerCase().includes(searchTerm().toLowerCase()) ||
                        spec.file.toLowerCase().includes(searchTerm().toLowerCase());

                    const matchesStatusFilter =
                        statusFilter() === "" || (statusFilter() === "Passed" ? spec.ok : !spec.ok);

                    return matchesSearchTerm && matchesStatusFilter;
                }) || [],
            }))
            .filter((suite) => suite.specs.length > 0);
    });

    const fetchTestResults = async () => {
        setLoading(true);

        try {
            const res = await apiClient.post(`https://malamute-noble-miserably.ngrok-free.app/get-results`, {
                id: runId()
            })
            
            setResults(res.suites);

        } catch (error) {
            console.error('Error fetching and processing test results:', error);
        } finally {
            setLoading(false);
        }
    };

    // Call fetchTestResults on mount
    onMount(() => {
        const { state } = location;
        setRunId(state.runId);
        fetchTestResults();
    });


    const openModalWithErrorDetails = (error) => {
        // Strip ANSI codes before setting the error details
        const cleanedError = {
            stack: stripAnsiCodes(error.stack),
        };
        setErrorDetails(cleanedError);
        setModalOpen(true);
    };


    const breadcrumbItems = [
        { label: "Home", link: "/", icon: "mdi:home" },
        { label: "Run History", link: "/run-history", icon: "mdi:history" },
        { label: "Test Results", link: "/", icon: "mdi:history" },
    ];

    return (
        <div className="p-4 flex justify-center items-center">
            <div className="w-full lg:px-40 p-6  text-white h-full rounded-md space-y-4">
                <Breadcrumbs items={breadcrumbItems} />

                <h1 className="text-2xl font-bold my-6 text-left">Result of Runs</h1>

                <div className="flex justify-between items-center mb-4">
                    <input
                        type="text"
                        placeholder="Search by test case title or file name..."
                        className="input input-bordered w-full md:w-1/2 lg:w-1/3 mb-2 md:mb-0"
                        onInput={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <button
                            className={`badge badge-lg ${statusFilter() === "" ? "badge-info" : "badge-outline badge-info"
                                } cursor-pointer`}
                            onClick={() => setStatusFilter("")}
                        >
                            All
                        </button>
                        <button
                            className={`badge badge-lg ${statusFilter() === "Passed" ? "badge-success" : "badge-outline badge-success"
                                } cursor-pointer`}
                            onClick={() => setStatusFilter("Passed")}
                        >
                            Passed
                        </button>
                        <button
                            className={`badge badge-lg ${statusFilter() === "Failed" ? "badge-error" : "badge-outline badge-error"
                                } cursor-pointer`}
                            onClick={() => setStatusFilter("Failed")}
                        >
                            Failed
                        </button>
                    </div>
                </div>

                <Show when={!loading()} fallback={<div className="flex loading center" />}>
                    <div className="card shadow-lg overflow-auto bg-gray-900 p-5">
                        <For each={filteredResults()} fallback={<div>No results found</div>}>
                            {(suite) => (
                                <div className="collapse collapse-arrow my-2 p-1 bg-base-100">
                                    <input type="checkbox" className="peer" checked />
                                    <div className="collapse-title text-lg font-medium flex items-center justify-between">
                                        <span>{suite.file}</span>
                                    </div>
                                    <div className="collapse-content">
                                        <For each={suite.specs}>
                                            {(spec) => (
                                                <div
                                                    className="flex flex-col md:flex-row justify-between border-b border-gray-700 p-4 last:border-none"
                                                    onClick={() => !spec.ok && openModalWithErrorDetails(spec.tests[0].results[0].error)}
                                                >
                                                    <div className="text-left">
                                                        <span className="text-sm font-semibold">{spec.title}</span>
                                                        <br />
                                                        <span className="text-xs text-gray-500">
                                                            {`${spec.file}:${spec.line}`}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col md:flex-row gap-2">
                                                        <Show when={!spec.ok}>
                                                            <div className="text-right mt-2 md:mt-0">
                                                                <span className={`badge badge-outline rounded-md `}>
                                                                    See Details
                                                                </span>
                                                            </div>
                                                        </Show>
                                                        <div className="text-right mt-2 md:mt-0">
                                                            <span className={`badge rounded-md ${spec.ok ? "badge-success" : "badge-error"}`}>
                                                                {spec.ok ? "Passed" : "Failed"}
                                                            </span>
                                                        </div>

                                                    </div>
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </Show>

                <Show when={modalOpen()}>
                    <div className="modal modal-open">
                        <div className="modal-box bg-gray-800 text-white max-w-5xl">
                            <h2 className="text-xl font-bold">Error Details</h2>
                            <div className="mockup-code mt-4 overflow-auto max-h-[60vh]">
                                <pre class="p-5">{errorDetails()?.stack}</pre>
                            </div>
                            <div className="modal-action">
                                <button className="btn btn-primary" onClick={() => setModalOpen(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </Show>
            </div>
        </div>

    );
};
