import {For, Show} from "solid-js";
import {Icon} from "@iconify-icon/solid";

const Breadcrumbs = (props: { items: [{ label: string; link?: string; icon?: string }] }) => {
    return (
        <div class="breadcrumbs text-sm">
            <ul>
                <For each={props.items}>
                    {(item, index) => (
                        <li>
                            <Show when={item.link} fallback={
                                <span class="inline-flex items-center gap-2">
                                    <Icon icon={item.icon} class="stroke-current" height={20} width={20}/>
                                    {item.label}
                                </span>}
                            >
                                <a href={item.link} class="inline-flex items-center gap-2">
                                    <Icon icon={item.icon} class="stroke-current" height={20} width={20}/>
                                    {item.label}
                                </a>
                            </Show>
                        </li>
                    )}
                </For>
            </ul>
        </div>
    );
};

export default Breadcrumbs;
