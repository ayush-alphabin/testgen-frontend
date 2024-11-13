export let socketcodegen: WebSocket | null = null;
let messageListeners: Array<(data: any) => void> = [];

// Initializes the WebSocket and returns a promise when the connection is opened
export const initializeWebSocket = (url = "ws://localhost:3001") => {
    return new Promise<WebSocket>((resolve, reject) => {
        if (!socketcodegen || socketcodegen.readyState === WebSocket.CLOSED) {
            socketcodegen = new WebSocket(url);

            socketcodegen.onopen = () => {
                console.log('WebSocket connection opened');
                resolve(socketcodegen); // Resolve the promise when the connection is opened
            };

            socketcodegen.onclose = () => {
                console.log('WebSocket connection closed');
            };

            socketcodegen.onerror = (error) => {
                console.error('WebSocket error:', error.message);
                reject(error); // Reject the promise if there's a connection error
            };

            // Set up the single onmessage handler that will dispatch to all listeners
            socketcodegen.onmessage = (event) => {
                const handleMessage = (message: string) => {
                    try {
                        const parsedData = JSON.parse(message);
                        
                        messageListeners.forEach((listener) => listener(parsedData));
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };

                if (typeof event.data === 'string') {
                    handleMessage(event.data); // Handle string message
                } else if (event.data instanceof Blob) {
                    // Handle Blob (binary) message
                    const reader = new FileReader();
                    reader.onload = () => handleMessage(reader.result as string);
                    reader.onerror = (err) => console.error('Error reading Blob message:', err);
                    reader.readAsText(event.data); // Read the Blob as text
                } else {
                    console.error('Unsupported WebSocket message type:', typeof event.data);
                }
            };
        } else {
            resolve(socketcodegen); // If already open, immediately resolve
        }
    });
};

// Adds a new listener to the WebSocket message listener list
export const listenForMessages = (callback: (data: any) => void) => {
    if (!socketcodegen) {
        console.error('WebSocket is not initialized');
        return;
    }

    // Register the new listener
    messageListeners.push(callback);
};

// Removes a specific listener from the WebSocket message listener list
export const removeMessageListener = (callback: (data: any) => void) => {
    messageListeners = messageListeners.filter((listener) => listener !== callback);
};

// Sends a message through WebSocket
export const sendMessage = (message: any) => {
    if (socketcodegen && socketcodegen.readyState === WebSocket.OPEN) {
        socketcodegen.send(JSON.stringify(message));
    } else {
        console.error('WebSocket is not connected or ready');
    }
};

// Closes the WebSocket connection
export const closeWebSocket = () => {
    if (socketcodegen) {
        console.log('Closing WebSocket connection');
        socketcodegen.close();
        socketcodegen = null;
        messageListeners = []; // Clear all message listeners when the WebSocket is closed
    }
};
