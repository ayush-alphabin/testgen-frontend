import {createContext, createSignal, onMount, useContext} from "solid-js";
import {createStore} from "solid-js/store";

interface TestHistoryEntry {
    date: string;
    time: string;
    status: string;
    uuid: string;
}

export const TestHistoryContext = createContext(undefined);

export function TestHistoryProvider(props) {
    // Load history from localStorage or initialize as an empty array
    const storedHistory = window.localStorage.getItem("testHistory");
    let initialHistory: TestHistoryEntry[] = [];

    try {
        if (storedHistory) {
            initialHistory = JSON.parse(storedHistory);
            if (!Array.isArray(initialHistory)) {
                console.error("Invalid history data in localStorage, initializing as empty array");
                initialHistory = [];
            }
        }
    } catch (error) {
        console.error("Failed to parse history from localStorage, initializing as empty array", error);
        initialHistory = [];
    }

    // Initialize the store with the initial history
    const [history, setHistory] = createStore<TestHistoryEntry[]>(initialHistory);

    // Function to add a new entry to the history and save to localStorage
    const addHistoryEntry = (entry: TestHistoryEntry) => {
        const updatedHistory = [...history, entry];
        setHistory(updatedHistory); // Correctly update the store
        window.localStorage.setItem("testHistory", JSON.stringify(updatedHistory));
    };

    return (
        <TestHistoryContext.Provider value={{ history, addHistoryEntry }}>
            {props.children}
        </TestHistoryContext.Provider>
    );
}

export function useTestHistory() {
    const context = useContext(TestHistoryContext);
    if (!context) {
        throw new Error("useTestHistory must be used within a TestHistoryProvider");
    }
    return context;
}
