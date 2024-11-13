import {Accessor, JSX, Setter} from 'solid-js';

interface InputProps {
    type?: string;
    placeholder?: string;
    iconPrefix?: JSX.Element;
    iconSuffix?: JSX.Element;
    filled?: boolean;
    value: Accessor<string>;
    setValue: Setter<string>;
    extraClass?: string;
}

export function CustomInput({ type = 'text', placeholder, value, setValue,extraClass,iconPrefix, iconSuffix, filled = false, }: InputProps) {
    return (
        <div class={`form-control w-full ${extraClass}`}> {/* Add extraClass here */}
            <div class={`input-group ${filled ? 'text-white' : 'text-black'}`}>
                {iconPrefix && <span class="input-group-prepend">{iconPrefix}</span>}
                <input
                    type={type}
                    value={value()}
                    onInput={(e) => setValue(e.target.value)} // Two-way binding
                    placeholder={placeholder}
                    class={`input input-${filled ? 'primary' : 'outline'} w-full`}
                />
                {iconSuffix && <span class="input-group-append">{iconSuffix}</span>}
            </div>
        </div>
    );
}
