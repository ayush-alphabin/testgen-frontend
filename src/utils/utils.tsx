import { createSignal } from "solid-js";
import { IoFolder, IoDocument } from 'solid-icons/io';
import { Icon } from '@iconify-icon/solid';

export const useToggle = (initialValue = false) => {
    const [value, setValue] = createSignal(initialValue);
    const toggle = () => setValue(prev => !prev);
    return [value, toggle] as const;
};

export function stripAnsiCodes(str: any) {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

export const getProjectPath= () =>{
   return window.localStorage.getItem('directory_path');
}

export const getProjectName=() =>{
    const path = window.localStorage.getItem('directory_path');
    if (!path) {
        return '';
    }
    return path.split('/').pop();
}

export const hideFiles = [
    'node_modules',
    '.playwright-artifacts',
    'temp-locator-mapping.json',
    '.last-run.json',
    'results.json',
    '.git',
    '.DS_Store',
    '.gitignore',
    'playwright.config.ts',
    'playwright.config.js',
    'package-lock.json',
    'package.json',
    'Dockerfile',
    'README.md',
    'test-results',
    'screenshots',
    '.gitlab-ci.yml',
]

export const getFileIcon = (type: any) => {
    switch (type) {
        case '.html':
            return <Icon icon="devicon:html5" height={18} width={18} />;
        case '.js':
            return <Icon icon="logos:javascript" height={18} width={18} />;
        case '.ts':
            return <Icon icon="logos:typescript-icon" height={18} width={18} />;
        case '.env':
            return <Icon icon="uil:setting" height={18} width={18} />;
        case '.json':
            return <Icon icon="vscode-icons:file-type-json" height={18} width={18} />;
        case '.last-run.json':
            return <Icon icon="vscode-icons:file-type-json" height={18} width={18} />;
        case '.spec.js':
            return <Icon  icon="grommet-icons:test"  style="color: #f0dc00" height={18} width={18} />;
        case '.config.js':
            return <Icon icon="logos:playwright" height={18} width={18} />;
        case '.config.ts':
            return <Icon icon="logos:playwright" style={'color: #486dfe'} height={18} width={18} />;
        case '.spec.ts':
            return <Icon  icon="grommet-icons:test"  style="color: #486dfe" height={18} width={18} />;
        case '.md':
            return <Icon icon="ion:information-circle-outline" height={18} width={18} style={{color: "#486dfe"}}/>;
        case 'file':
            return <IoDocument height={18} width={18} />;
        case 'folder':
            return <IoFolder height={18} width={18} />; 
        default:
            return null;
    }
};


export function getLanguageByExtension(extension: string | undefined): string {
    switch (extension) {
        case '.html':
            return 'html';
        case '.ts':
            return 'typescript';
        case '.spec.ts':
            return 'typescript';
        case '.config.ts':
            return 'typescript';
        case '.js':
            return 'javascript';
        case '.spec.js':
            return 'javascript';
        case '.config.js':
            return 'javascript';
        case '.json':
            return 'json';
        case '.last-run.json':
            return 'json';
        case '.md':
            return 'markdown';
        case '.env':
            return 'plaintext';
        default:
            return 'plaintext'; // Fallback to plaintext for unknown extensions
    }
}