import { Component, onMount, createSignal } from 'solid-js';
import 'tailwindcss/tailwind.css';
import Editor from "./Editor";
import Dashboard from "./Dashboard/Dashboard";
import { Router, Route } from '@solidjs/router';
import { TestResults } from "./Test History/TestResult";
import TestHistory from "./Test History/TestHistory";
import { TestHistoryProvider } from '../context/TestHistoryProvider';
import { Clerk } from "@clerk/clerk-js";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const App: Component = () => {
    const [isSignedIn, setIsSignedIn] = createSignal(false);
    const [isLoaded, setIsLoaded] = createSignal(false);

    onMount(async () => {
        // Initialize and load Clerk
        const clerk = new Clerk(clerkPubKey);
        await clerk.load({
            appearance: {
                variables: {
                    colorPrimary: '#4b6474', // Dark Slate 500
                    colorBackground: '#1e2731', // Dark Slate 800 for overall background
                    colorText: '#f8fafc', // Main text color
                    colorTextSecondary: '#8ba2b1', // Secondary text color
                    colorTextOnPrimaryBackground: '#ffffff', // Text on primary buttons or backgrounds
                    colorInputText: '#f8fafc', // Text color inside input
                    colorInputBackground: '#2c3a42', // Input background color (Dark Slate 700)
                    colorNeutral: '#94a3b8', // Slate 400
                },
            }
        });


        setIsLoaded(true);

        // Set initial authentication state
        setIsSignedIn(!!clerk.user);

        // Listen for changes in authentication state
        clerk.addListener((authState) => {
            setIsSignedIn(!!authState.user);
        });

        // Conditionally mount Clerk components only after loading
        if (!clerk.user) {
            clerk.mountSignIn(document.getElementById("sign-in")!);
        }
    });

    return (
        <div class="bg-background min-h-screen">
            {isLoaded() ? (
                    <TestHistoryProvider>
                        <Router>
                            <Route path="/" component={Dashboard} />
                            <Route path="/run-history" component={TestHistory} />
                            <Route path="/run-history/test-results" component={TestResults} />
                            <Route path="/editor/:folderName" component={Editor} />
                        </Router>
                    </TestHistoryProvider>
            ) : (
                <div class='flex items-center justify-center h-screen'>
                    <div class="loading" />
                </div>
            )}
        </div>
    );
};

export default App;
