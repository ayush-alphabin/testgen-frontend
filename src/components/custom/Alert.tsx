import {Alert, AlertTitle, IconButton, styled} from "@suid/material";
import { Icon } from "@iconify-icon/solid";

const DarkAlert = styled(Alert)(({ theme }) => ({
    backgroundColor: "#333", // Dark background color
    color: "#fff", // Light text color
    ".MuiAlert-icon": {
        color: "#fff", // Default light color for the icon
    },
    ".MuiAlert-action": {
        color: "#fff", // Light color for the close button
    },
}));

const severityColors = {
    success: "#4caf50", // Green
    info: "#2196f3",    // Blue
    warning: "#ff9800", // Orange
    error: "#f44336",   // Red
};

const CustomAlert = (props: {
    severity: 'success' | 'info' | 'warning' | 'error';
    title: string;
    description: string;
    icon?: string;
    onClose?: () => void;  // Add a close handler
}) => {
    // Default icons based on severity
    const defaultIcons = {
        success: "mdi:check-circle",
        info: "mdi:information",
        warning: "mdi:alert",
        error: "mdi:alert-circle",
    };


    return (
        <DarkAlert
            severity={props.severity}
            icon={<Icon icon={props.icon || defaultIcons[props.severity]} style={`color: ${severityColors[props.severity]}`} />}
            action={
                <IconButton
                    aria-label="close"
                    color="inherit"
                    size="small"
                    onClick={props.onClose}  // Attach the close handler
                >
                    <Icon icon="mdi:close" color="#fff" />
                </IconButton>
            }
        >
            <AlertTitle sx={{ color: severityColors[props.severity] }}>{props.title}</AlertTitle>
            {props.description}
        </DarkAlert>
    );
};

export default CustomAlert;



/* How to use

import { useState } from "react";
import CustomAlert from "./CustomAlert";
import { Button } from "@suid/material";

const ExampleComponent = () => {
    const [alert, setAlert] = useState<{ severity: string; title: string; description: string; icon?: string } | null>(null);

    const handleAction = () => {
        // Simulate a successful action
        setAlert({
            severity: "success",
            title: "Success",
            description: "You have successfully completed the action!",
            icon: "mdi:check-circle",
        });

        // Automatically hide the alert after a few seconds (optional)
        setTimeout(() => setAlert(null), 3000);
    };

    return (
        <div>
            {alert && <CustomAlert {...alert} />}
            <Button variant="contained" onClick={handleAction}>
                Trigger Success Alert
            </Button>
        </div>
    );
};

export default ExampleComponent;

 */