import {createSignal, For, onMount, Show} from "solid-js";
import {useNavigate, useParams} from "@solidjs/router";
import {Icon} from "@iconify-icon/solid";
import Breadcrumbs from "../custom/Breadcumb";
import {useTestHistory} from "../../context/TestHistoryProvider";

const TestHistory = () => {
    const {history} = useTestHistory();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = createSignal("");
    const [filterDate, setFilterDate] = createSignal("");
    const [statusFilter, setStatusFilter] = createSignal("All"); // Status filter

    const uniqueStatuses = () => {
        const statuses = new Set(history && history.map(run => run.status));
        return Array.from(statuses);
    };

    const filteredData = () => {
        return history && history.filter((run) => {
            const matchesDate = run.date.includes(filterDate());
            const matchesSearch = run.date.toLowerCase().includes(searchTerm().toLowerCase()) || run.time.toLowerCase().includes(searchTerm().toLowerCase());
            const matchesStatus = statusFilter() === "All" || run.status === statusFilter();

            return matchesDate && matchesSearch && matchesStatus;
        });
    };

    const breadcrumbItems = [
        {label: "Home", link: "/", icon: "mdi:home"},
        {label: "Run History", icon: "mdi:history"},
    ];

    if (!history || history.length === 0) {
        return <div class="text-center grid place-items-center h-screen">No test runs found.</div>;
    }

    return (
        <div class="p-4 space-y-4 flex bg-gray-800 w-full h-[100vh]">
            <div class="mx-auto p-4 bg-gray-900 text-white w-full rounded-md">
                <Breadcrumbs items={breadcrumbItems}/>

                <h1 class="text-2xl font-bold my-6 text-left">History of Test Runs</h1>

                <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-2">
                    <label class="input input-bordered flex items-center gap-2 w-full md:w-1/3 lg:w-1/4">
                        <Icon icon={'mdi:magnify'} width={20} height={20}/>
                        <input
                            type="text"
                            placeholder="Search by date or time..."
                            onInput={(e) => setSearchTerm(e.target.value)}
                        />
                    </label>

                    <input
                        type="date"
                        class="input input-bordered w-full md:w-1/3 lg:w-1/5"
                        onInput={(e) => setFilterDate(e.target.value)}
                    />
                </div>

                <div class="flex gap-2 mb-6" style={{display: history === undefined ? "none" : "flex"}}>
                    <button
                        class={`badge badge-lg cursor-pointer ${statusFilter() === "All" ? "" : "badge-outline"}`}
                        onClick={() => setStatusFilter("All")}
                    >
                        All {history && history.length}
                    </button>
                    <For each={uniqueStatuses()}>
                        {(status) => (
                            <button
                                class={`badge badge-lg cursor-pointer ${statusFilter() === status ? "" : "badge-outline"} ${status === "Passed" ? "badge-success" : status === "Failed" ? "badge-error" : status === "Flaky" ? "badge-warning" : "badge-info"}`}
                                onClick={() => setStatusFilter(status)}
                            >
                                {status} {history.filter(run => run.status === status).length}
                            </button>
                        )}
                    </For>

                    <button
                        class={`badge badge-lg cursor-pointer ${statusFilter() === "Failed" ? "" : "badge-outline"}`}
                        onClick={() => {
                            window.localStorage.removeItem('testHistory')
                            window.location.reload()
                        }}
                    >
                        Clear History
                    </button>
                </div>

                <div class="overflow-x-auto overflow-y-auto h-[50%]">
                    <table class="table w-full">
                        <thead>
                        <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Status</th>
                            <th>View</th>
                        </tr>
                        </thead>
                        <tbody>
                        <For each={filteredData()}>
                            {(run) => (
                                <tr>
                                    <td>{run.date}</td>
                                    <td>{run.time}</td>
                                    <td>
                      <span
                          class={`badge rounded-md text-md ${run.status === "Passed" ? "badge-success" : run.status === "Failed" ? "badge-error" : run.status === "Flaky" ? "badge-warning" : "badge-info"}`}
                      >
                        {run.status}
                      </span>
                                    </td>
                                    <Show when={run.uuid && run.uuid && run.status !== "Failed"} fallback={<td/>}>

                                        <td>
                                            <a
                                                onClick={() => {
                                                    navigate(`/run-history/test-results`, {state: {runId: run.uuid}});
                                                }}
                                                className="link"
                                            >
                                                View
                                            </a>
                                        </td>
                                    </Show>
                                </tr>
                            )}
                        </For>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TestHistory;
