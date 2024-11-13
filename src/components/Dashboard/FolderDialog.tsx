import {Component, createSignal, createEffect, onMount, For, Show} from "solid-js";
import {
    Grid,
    Paper,
    Typography,
    IconButton,
    Button,
    Dialog,
    Box,
    DialogTitle,
    DialogContent,
    TextField,
    DialogActions,
} from "@suid/material";
import EditIcon from "@suid/icons-material/Edit";
import DeleteIcon from "@suid/icons-material/Delete";
import AddIcon from "@suid/icons-material/Add";
import {useNavigate} from "@solidjs/router";
import {Icon} from "@iconify-icon/solid";
import {API_ENDPOINTS} from "../../api/apiConfig";
import {apiClient} from "../../api/api";
import {toast} from "solid-toast";

const FolderDialog: Component<{
    open: boolean;
    onClose: () => void;
    onSave: (folder: { name: string; description: string }) => void;
    folder?: { name: string; description: string } | null;
}> = (props) => {
    const [folder, setFolder] = createSignal({name: '', description: ''});

    createEffect(() => {
        if (props.folder) {
            setFolder(props.folder);
        } else {
            setFolder({name: '', description: ''});
        }
    });

    const handleSave = () => {
        if (!props.folder) {
            if (folder().name.trim() === '') {
                toast.error("Folder name is required");
                return;
            }
            if (folder().description.trim() === '') {
                toast.error("Folder description is required");
                return;
            }
        }

        props.onSave(folder());
    };

    return (
        <div class={`modal ${props.open ? 'modal-open' : ''}`} id="folder-dialog">
            <div class="modal-box bg-gray-800 text-white">
                <h3 class="font-bold text-lg">
                    {props.folder ? 'Edit Folder' : 'Add Folder'}
                </h3>
                <div class="py-4">
                    <div class="form-control">
                        <label class="label text-gray-300">
                            <span class="label-text">Project Name</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Enter folder name"
                            value={folder().name}
                            onInput={(e) => setFolder({...folder(), name: e.currentTarget.value})}
                            class="input input-bordered w-full bg-gray-700 text-gray-200"
                        />
                    </div>
                    <div class="form-control mt-4">
                        <label class="label text-gray-300">
                            <span class="label-text">Project Description</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Enter description"
                            value={folder().description}
                            onInput={(e) => setFolder({...folder(), description: e.currentTarget.value})}
                            class="input input-bordered w-full bg-gray-700 text-gray-200"
                        />
                    </div>
                </div>
                <div class="modal-action justify-between">
                    <button class="btn btn-outline h-10 btn-sm" onClick={props.onClose}>
                        Cancel
                    </button>
                    <button class="btn btn-info text-white font-medium btn-sm h-10" onClick={handleSave}>
                        {props.folder ? 'Update' : 'Submit'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FolderDialog;