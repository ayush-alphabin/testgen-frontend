import {Component, createEffect, createSignal, Show} from "solid-js";
import { useEditor } from "../../context/File-Explorer Context/FileExplorerContext";
import { useAlert } from "../../context/AlertContext";

interface EditItemModalProps {
    open: boolean;
    onClose: () => void;
    type: 'file' | 'folder';
    itemId: string; // This will be used for editing/renaming
    parentId?: string;
    mode: 'create' | 'edit' | 'delete';

    // Functions
    handleAddFile: (name: string, type: 'file' | 'folder', parentId?: string) => void;
    handleRename: (id: string, name: string) => void;
    handleDelete: (id: string, parentId?: string) => void;
}

export const EditItemModal: Component<EditItemModalProps> = (props) => {
    const [itemName, setItemName] = createSignal('');
    const [itemId, setItemId] = createSignal('');

    const handleSave = () => {
        if (props.mode === 'delete') {
            props.handleDelete(itemId(), props.parentId);
            props.onClose();
        }
        const nameValue = itemName().trim();
        if (nameValue === '' && props.mode !== 'delete') {
            alert('Name cannot be empty.');
            return;
        }

        if (props.mode === 'create') {
            props.handleAddFile(nameValue, props.type, props.parentId);
            setItemName('');
            props.onClose();
        }
        if (props.mode === 'edit' && props.itemId) {
            props.handleRename(props.itemId, nameValue);
            props.onClose();
        }

    };

    createEffect(() => {
        if (props.itemId) {
            setItemId(props.itemId);
        }
    })

    return (
        <div class={`modal ${props.open ? 'modal-open' : ''}`}>
            <div class="modal-box">
                <h2 class="font-bold text-lg">
                    {props.mode === 'create' ? `Create New ${props.type.charAt(0).toUpperCase() + props.type.slice(1)}` :
                        props.mode === 'edit' ? `Rename ${props.type.charAt(0).toUpperCase() + props.type.slice(1)}` :
                            `Delete ${props.type.charAt(0).toUpperCase() + props.type.slice(1)}`}
                </h2>
                <div class="py-4">
                    <Show when={props.mode !== 'delete'}>
                        <input
                            type="text"
                            placeholder={`${props.type.charAt(0).toUpperCase() + props.type.slice(1)} Name`}
                            class="input input-bordered w-full"
                            value={itemName()}
                            onInput={(e) => setItemName(e.currentTarget.value)}
                        />
                    </Show>
                    <Show when={props.mode === 'delete'}>
                        <p>Are you sure you want to delete this {props.type} {itemId()}?</p>
                    </Show>
                </div>
                <div class="modal-action justify-between">
                    <button class="btn h-10 btn-sm btn-outline" onClick={props.onClose}>Cancel</button>
                    <button class="btn btn-info h-10 btn-sm w-20 text-white font-medium" onClick={handleSave}>
                        {props.mode === 'delete' ? 'Delete' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};
