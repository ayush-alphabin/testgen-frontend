import { createSignal, createEffect, onCleanup, onMount } from "solid-js";
import { io, Socket } from "socket.io-client";
import { useEditor } from "./context/File-Explorer Context/FileExplorerContext";
import { toast } from "solid-toast";
import * as monaco from "monaco-editor";
import { editor } from "monaco-editor";
import { DefaultEventsMap } from "@socket.io/component-emitter";
import { getProjectName, getProjectPath } from "./utils/utils";
import { apiClient } from "./api/api";
import { API_ENDPOINTS } from "./api/apiConfig";
import { closeWebSocket, getCodegenSocket, initializeWebSocket, listenForMessages, sendMessage, socketcodegen } from "./codegenWs";

let socketK8S: Socket<DefaultEventsMap, DefaultEventsMap>;

export const getSocketInstance = () => {
  if (!socketK8S) {
    socketK8S = io("https://malamute-noble-miserably.ngrok-free.app", {
      transports: ["websocket", "polling"],
      timeout: 60000,
      withCredentials: true, // Ensure credentials are passed
    });
  }

  return socketK8S;
};

export const useSocket = () => {
  const [generatedCode, setGeneratedCode] = createSignal("");
  const {
    addWhereCursor,
    getCursorPosition,
    editorInstance,
  } = useEditor();
  
  const loadUrl = (url) => {
    const projectDetails = {
      path: getProjectPath(),
      name: getProjectName(),
    };
    const cursorPosition = getCursorPosition();
    const startLine = cursorPosition?.lineNumber;

    // Send message to load the URL

    sendMessage({
      event: "loadUrl",
      url: url,
      startLine: startLine,
      projectDetails: projectDetails
    })
  };


  return { generatedCode, loadUrl };
};
