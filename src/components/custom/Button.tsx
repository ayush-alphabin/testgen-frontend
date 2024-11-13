import { JSX } from 'solid-js';

interface ButtonProps {
    iconPrefix?: JSX.Element;
    iconSuffix?: JSX.Element;
    label: string;
    type?: 'filled' | 'outline';
    onClick?: () => void;
    extraClass?: string;
}

export function CustomButton({ iconPrefix, iconSuffix, label, type = 'filled',onClick ,extraClass}: ButtonProps) {
    return (
        <button class={`btn ${type === 'filled' ? 'btn-primary' : 'btn-outline'} flex items-center gap-2 ${extraClass}`} onClick={onClick}>
            {iconPrefix && <span>{iconPrefix}</span>}
            <span>{label}</span>
            {iconSuffix && <span>{iconSuffix}</span>}
        </button>
    );
}
