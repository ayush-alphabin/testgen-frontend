import { createContext, useContext, createSignal, JSX } from "solid-js";
import { Stack } from "@suid/material";
import CustomAlert from "../components/custom/Alert";

interface AlertContextProps {
    showAlert: (severity: 'success' | 'info' | 'warning' | 'error', title: string, description: string, icon?: string) => void;
}

const AlertContext = createContext<AlertContextProps>();

export const AlertProvider = (props: { children: JSX.Element }) => {
    const [alertDetails, setAlertDetails] = createSignal<{
        severity: 'success' | 'info' | 'warning' | 'error';
        title: string;
        description: string;
        icon?: string;
    } | null>(null);

    const showAlert = (severity: 'success' | 'info' | 'warning' | 'error', title: string, description: string, icon?: string) => {
        setAlertDetails({ severity, title, description, icon });
        setTimeout(() => setAlertDetails(null), 3000); // Optionally hide the alert after 3 seconds
    };

    return (
        <AlertContext.Provider value={{ showAlert }}>
            {props.children}
            {alertDetails() && (
                <Stack
                    sx={{
                        margin: 0,
                        width: "auto",
                        position: "fixed",
                        top: 5,
                        right: 5,  // Positioned to the top right
                        zIndex: 9999
                    }}
                    spacing={2}
                >
                    <CustomAlert
                        severity={alertDetails()!.severity}
                        title={alertDetails()!.title}
                        description={alertDetails()!.description}
                        icon={alertDetails()!.icon}
                        onClose={() => setAlertDetails(null)}  // Handle close
                    />
                </Stack>
            )}
        </AlertContext.Provider>
    );
};

export const useAlert = () => useContext(AlertContext);
