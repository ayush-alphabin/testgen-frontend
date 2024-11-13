// @ts-nocheck
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { useEditor } from "../../context/File-Explorer Context/FileExplorerContext";
import { useRecentlyEditor } from "../../context/RecentlyEditorContext";
import { getFileIcon } from "../../utils/utils";
import { Icon } from "@iconify-icon/solid";
import { Menu, MenuItem, ListItemIcon, Divider, Dialog } from "@suid/material";
import { useTheme } from "@suid/material/styles";
import { SelectFilesModal } from "./SelectFilesModal";
import { useProjectSettings } from "../../context/ProjectSettingContext";
import { useSocket } from "../../SocketHandler";
import { LocatorModal } from "./LocatorModal";
import { listenForMessages, sendMessage, socketcodegen, initializeWebSocket } from "../../codegenWs";

export const FileHeader = () => {
  const { currentFile } = useEditor();
  const { loadUrl, closeBrowser } = useSocket();
  const { baseUrl } = useProjectSettings();
  const [isRecording, setIsRecording] = createSignal(false);
  const [modalOpen, setModalOpen] = createSignal(false);
  const [modalOpenRun, setModalOpenRun] = createSignal(false);
  const [url, setUrl] = createSignal("");
  const openRunModal = () => setModalOpenRun(true);
  const closeRunModal = () => setModalOpenRun(false);
  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const enteredUrl = url();
    if (enteredUrl) {
      setIsRecording(true);
      // Assuming loadUrl is a function that handles loading the URL and starting recording
      loadUrl(enteredUrl);
      closeModal();
    }
  };

  const handleStop = (e) => {
    setIsRecording(false);
    sendMessage({
      event: "closefromFrontend",
    })
    closeRunModal(); // Close the browser
  };

  createEffect(() => {
    if (baseUrl()) {
      setUrl(baseUrl());
    }
  });

  createEffect(() => {
    initializeWebSocket("ws://localhost:3001")
      .then(() => {
        listenForMessages((message) => {
          if (message.event === "stopRecord") {
            setIsRecording(false);
          }
        });
      })
      .catch((error) => {
        console.error("Failed to initialize WebSocket:", error);
      });
  });

  return (
    <div
      class="flex flex-row relative justify-between items-center h-[55px] w-full overflow-x-auto overflow-y-hidden bg-dark-slate-950"
      style={{
        display: currentFile() ? "flex" : "none",
      }}
    >
      <RecentFilesTab />
      <div class="p-2 gap-2 flex items-center">
        <Show when={currentFile()?.name === "global.js"}>
          <LocatorModal />
        </Show>
        <div class="p-2 gap-2 flex items-center">  
  
          <Icon
            icon="mi:export"
            class={`text-gray-600 cursor-pointer`}
            height={22}
            width={22}
            aria-disabled={true}
          />
          <Icon
            icon="mdi:vs-code"
            class={`text-gray-600 cursor-pointer`}
            height={22}
            width={22}
            aria-disabled={true}
          />
          <Show
            when={
              currentFile()?.extension?.includes("spec.") ||
              currentFile()?.extension.includes("test.")
            }
          >
            <Show
              when={!isRecording()}
              fallback={
                <Icon
                  icon="lucide:circle-stop"
                  class={`hover:text-red-500 text-blue-500 cursor-pointer ${isRecording() ? "animate-pulse" : "animate-none"
                    }`}
                  height={22}
                  width={22}
                  onClick={handleStop}
                />
              }
            >
              <Icon
                class="cursor-pointer hover:text-blue-500"
                icon="mdi:record-rec"
                height={30}
                width={30}
                onClick={openModal}
              />
            </Show>
            <AddCodeSnippet />
          </Show>
          <Icon icon="bi:play" height={30} width={30} onClick={openRunModal} />
        </div>

        {LoadUrlDialog(modalOpen, handleSubmit, url, setUrl, closeModal)}
        <Show when={modalOpenRun()}>
          <SelectFilesModal open={openRunModal()} onClose={closeRunModal()} />
        </Show>
      </div>
    </div>
  );
};

function LoadUrlDialog<U>(
  modalOpen: () => boolean,
  handleSubmit: (e) => void,
  url: () => string,
  setUrl: Setter<string>,
  closeModal: () => boolean
) {
  return (
    <Show when={modalOpen()}>
      <div class="fixed inset-0 flex items-center justify-center z-50">
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-medium text-lg">
              Enter the URL to Record Interactions
            </h3>
            <form onSubmit={handleSubmit}>
              <div class="form-control">
                <input
                  type="text"
                  placeholder="https://example.com"
                  class="input input-bordered w-full mt-4"
                  value={url()}
                  onInput={(e) => setUrl(e.target.value)}
                />
              </div>
              <div class="modal-action justify-between">
                <button
                  type="button"
                  class="btn btn-outline h-10 btn-sm"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn btn-primary h-10 btn-sm btn-info text-white font-medium"
                >
                  Load & Record
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Show>
  );
}

const RecentFilesTab = () => {
  const {
    addRecentlyEditor,
    recentlyEditors,
    setRecentlyEditors,
    removeRecentlyEditor,
  } = useRecentlyEditor();
  const {
    setCurrentFile,
    currentFile,
    updateFile,
    saveFile,
    handleFileChange,
    localChanges,
    setLocalChanges,
  } = useEditor();
  // const [unsavedFile, setUnsavedFile] = createSignal(null);
  // const [isDialogOpen, setDialogOpen] = createSignal(false);

  // const hasUnsavedChanges = (file) => {
  //     return localChanges().has(file.id);
  // };

  // const handleDotClick = (file) => {
  //     setUnsavedFile(file);
  //     setDialogOpen(true);
  // };

  // const handleSave = () => {
  //     if (unsavedFile()) {
  //         saveFile(unsavedFile().id); // Call the centralized save function
  //         updateFile(unsavedFile().id, {code: unsavedFile().code});
  //         setDialogOpen(false);
  //     }
  // };

  // const handleDiscard = () => {
  //     if (unsavedFile()) {
  //         setLocalChanges(prev => {
  //             const newChanges = new Map(prev);
  //             newChanges.delete(unsavedFile().id);
  //             return newChanges;
  //         });
  //         setDialogOpen(false);
  //     }
  // };

  const handleFileClick = (file) => {
    if (file.id !== currentFile()?.id) {
      // if (hasUnsavedChanges(currentFile())) {
      //     setUnsavedFile(currentFile());
      //     setDialogOpen(true);
      // } else {
      setCurrentFile(file);
      // }
    }
  };

  return (
    <>
      <ul class="list-none p-0 flex flex-nowrap">
        <For each={recentlyEditors()}>
          {(file, index) => (
            <li
              key={file.id}
              class={`${file.id === (currentFile()?.id || "")
                ? "bg-dark-slate-700"
                : "bg-transparent"
                }
                                flex items-center rounded-sm gap-2 x-2 justify-center p-3 border-[#5C6E81] cursor-pointer ${index() === 0
                  ? "border-r"
                  : "border-l border-r"
                }`}
              onClick={() => handleFileClick(file)}
            >
              {getFileIcon(file.extension)}
              <span class="font-medium">
                {file.filename}
                {file.extension}
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (recentlyEditors()[index() - 1]) {
                    setCurrentFile(recentlyEditors()[index() - 1]);
                  } else if (recentlyEditors()[index() + 1]) {
                    setCurrentFile(recentlyEditors()[index() + 1]);
                  } else {
                    setCurrentFile(null);
                  }
                  removeRecentlyEditor(file.id);
                }}
                class="hover:text-red-500 cursor-pointer flex text-gray-100 ml-2"
              >
                <Icon icon="ic:round-close" height={20} width={20} />
              </span>
            </li>
          )}
        </For>
      </ul>
    </>
  );
};

const AddCodeSnippet: Component = () => {
  const [anchorEl, setAnchorEl] = createSignal<null | HTMLElement>(null);
  const { addWhereCursor } = useEditor();
  const open = () => Boolean(anchorEl());
  const handleClose = () => setAnchorEl(null);
  const handleClick = (event: MouseEvent) =>
    setAnchorEl(event.currentTarget as HTMLElement);

  const codeSnippetsMap = {
    "Add Test Features": `
test.describe('Feature: <Feature Name>', () => {

    test.beforeAll(async ({ browser }) => {
        // Code to run before the entire test suite
    });

    test.beforeEach(async ({ browser }) => {
        // Code to run before each test case
    });

    test.afterEach(async ({ browser }) => {
        // Code to run after each test case
    });

    test.afterAll(async ({ browser }) => {
        // Code to run after the entire test suite
    });

    test('Test Case 1: <Test Case Name>', async ({ browser }) => {
        // Steps for Test Case 1
    });

    test('Test Case 2: <Test Case Name>', async ({ browser }) => {
        // Steps for Test Case 2
    });

    // Add more test cases as needed

});`,

    "Add Test Cases": `
test('Test Case 1: <Test Case Name>', async ({ browser }) => {
    // Steps for Test Case 1
});`,

    "Before Each": `
test.beforeEach(async ({ browser }) => {
    // Code to run before each test case
});`,

    "After Each": `
test.afterEach(async ({ browser }) => {
    // Code to run after each test case
});`,

    "Before All": `
test.beforeAll(async ({ browser }) => {
    // Code to run before the entire test suite
});`,

    "After All": `
test.afterAll(async ({ browser }) => {
    // Code to run after the entire test suite
});`,
  };

  return (
    <>
      <Icon
        icon={`gg:add`}
        height={23}
        width={23}
        onClick={handleClick}
        class={`cursor-pointer  ${open() ? "rotate-30" : ""}`}
      />
      <Menu
        anchorEl={anchorEl()}
        id="account-menu"
        open={open()}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: "visible",
            filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
            mt: 1.5,
            backgroundColor: "#333",
            color: "white",
            ["& .MuiAvatar-root"]: {
              width: 32,
              height: 32,
              ml: -0.5,
              color: "white",
              mr: 1,
            },
            "&:before": {
              content: '""',
              display: "block",
              position: "absolute",
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              transform: "translateY(-50%) rotate(45deg)",
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{
          horizontal: "right",
          vertical: "top",
        }}
        anchorOrigin={{
          horizontal: "right",
          vertical: "bottom",
        }}
      >
        <MenuItem
          onClick={() => {
            addWhereCursor(codeSnippetsMap["Add Test Features"]);
          }}
        >
          <ListItemIcon>
            <Icon
              style={{ color: "#fff" }}
              icon="fluent:code-block-24-filled"
              height={20}
              width={20}
            />
          </ListItemIcon>
          Add Test Features
        </MenuItem>
        <Divider />

        <MenuItem
          onClick={() => {
            addWhereCursor(codeSnippetsMap["Add Test Cases"]);
          }}
        >
          <ListItemIcon>
            <Icon
              style={{ color: "#fff" }}
              icon="mdi:clipboard-text-outline"
              height={20}
              width={20}
            />
          </ListItemIcon>
          Add Test Cases
        </MenuItem>

        <MenuItem
          onClick={() => {
            addWhereCursor(codeSnippetsMap["Before Each"]);
          }}
        >
          <ListItemIcon>
            <Icon
              style={{ color: "#fff" }}
              icon="mdi:play-circle-outline"
              height={20}
              width={20}
            />
          </ListItemIcon>
          Before Each
        </MenuItem>

        <MenuItem
          onClick={() => {
            addWhereCursor(codeSnippetsMap["After Each"]);
          }}
        >
          <ListItemIcon>
            <Icon
              style={{ color: "#fff" }}
              icon="mdi:stop-circle-outline"
              height={20}
              width={20}
            />
          </ListItemIcon>
          After Each
        </MenuItem>

        <MenuItem
          onClick={() => {
            addWhereCursor(codeSnippetsMap["Before All"]);
          }}
        >
          <ListItemIcon>
            <Icon
              style={{ color: "#fff" }}
              icon="mdi:timer-settings"
              height={20}
              width={20}
            />
          </ListItemIcon>
          Before All
        </MenuItem>

        <MenuItem
          onClick={() => {
            addWhereCursor(codeSnippetsMap["After All"]);
          }}
        >
          <ListItemIcon>
            <Icon
              style={{ color: "#fff" }}
              icon="mdi:timer-settings-outline"
              height={20}
              width={20}
            />
          </ListItemIcon>
          After All
        </MenuItem>
      </Menu>
    </>
  );
};
