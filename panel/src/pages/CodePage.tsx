import { useCallback, useEffect, useRef, useState } from 'react';
import { useBackendApi } from '@/hooks/fetch';
import { txToast } from '@/components/txToaster';
import { Button } from '@/components/ui/button';
import { Loader2Icon, SaveIcon } from 'lucide-react';
import useSWR from 'swr';
import LazyMonacoEditor from '@/components/LazyMonacoEditor';
import { FileTree, FileEntry } from '@/components/FileTree';

type ListResp = {
    tree?: FileEntry[];
    error?: string;
};

type ReadResp = {
    content?: string;
    error?: string;
};

type SaveResp = {
    success?: boolean;
    error?: string;
};

export default function CodePage() {
    const editorRef = useRef<any>(null);
    const [currentFilePath, setCurrentFilePath] = useState<string | undefined>();
    const [editorContent, setEditorContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingFile, setIsLoadingFile] = useState(false);

    const listApi = useBackendApi<ListResp>({
        method: 'GET',
        path: '/fileManager/list',
    });

    const readApi = useBackendApi<ReadResp>({
        method: 'GET',
        path: '/fileManager/read',
    });

    const saveApi = useBackendApi<SaveResp>({
        method: 'POST',
        path: '/fileManager/save',
    });

    // Load file tree
    const { data: treeData, isLoading: isLoadingTree, mutate: refreshTree } = useSWR('/fileManager/list', async () => {
        let resp: ListResp | undefined;
        await listApi({
            success: (d) => {
                resp = d;
            },
        });
        return resp;
    });

    const handleFileSelect = (filePath: string) => {
        if (filePath === currentFilePath) return;
        setIsLoadingFile(true);
        readApi({
            queryParams: { file: filePath },
            success(d) {
                setIsLoadingFile(false);
                if (d.content !== undefined) {
                    setCurrentFilePath(filePath);
                    setEditorContent(d.content);
                } else {
                    txToast.error('Failed to load file.');
                }
            },
            error(msg) {
                setIsLoadingFile(false);
                txToast.error(msg || 'Failed to load file.');
            },
        });
    };

    const handleSave = useCallback(() => {
        if (!currentFilePath) return;
        const content = editorRef.current?.getValue() ?? editorContent;

        setIsSaving(true);
        saveApi({
            data: { file: currentFilePath, content },
            success(d) {
                setIsSaving(false);
                if (d.success) {
                    txToast.success(`File ${currentFilePath.split('/').pop()} saved successfully.`);
                } else {
                    txToast.error(d.error || 'Failed to save file.');
                }
            },
            error(msg) {
                setIsSaving(false);
                txToast.error(msg || 'Failed to save file.');
            },
        });
    }, [editorContent, currentFilePath]);

    // CTRL+S shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleSave]);

    // Determine language based on file extension
    const getLanguage = (filePath?: string) => {
        if (!filePath) return 'plain';
        const ext = filePath.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'lua': return 'lua';
            case 'js': return 'javascript';
            case 'ts': return 'typescript';
            case 'json': return 'json';
            case 'cfg': return 'ini';
            case 'md': return 'markdown';
            case 'yaml':
            case 'yml': return 'yaml';
            case 'html': return 'html';
            case 'css': return 'css';
            default: return 'plain';
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] w-full flex-col gap-4 overflow-hidden px-2 md:px-0">
            <div className="flex flex-1 gap-4 overflow-hidden rounded-lg border bg-card/50">
                {/* File Explorer Sidebar */}
                <div className="w-64 shrink-0 border-r bg-muted/30 flex flex-col overflow-hidden">
                    <div className="p-3 border-b bg-muted/50">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">Explorer</h3>
                        <p className="text-[10px] text-muted-foreground truncate">resources/</p>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {isLoadingTree ? (
                            <div className="flex h-32 items-center justify-center">
                                <Loader2Icon className="h-5 w-5 animate-spin opacity-50" />
                            </div>
                        ) : treeData?.tree ? (
                            <FileTree 
                                tree={treeData.tree} 
                                onFileSelect={handleFileSelect} 
                                currentFilePath={currentFilePath}
                            />
                        ) : (
                            <div className="p-4 text-xs text-center text-muted-foreground italic">
                                {treeData?.error || 'No resources found.'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {isLoadingFile && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                            <Loader2Icon className="h-8 w-8 animate-spin" />
                        </div>
                    )}

                    {currentFilePath ? (
                        <>
                            <div className="h-10 shrink-0 border-b bg-muted/20 flex items-center justify-between px-4">
                                <span className="text-xs font-mono text-muted-foreground truncate max-w-md">
                                    {currentFilePath}
                                </span>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 gap-1.5 text-xs" 
                                    onClick={handleSave} 
                                    disabled={isSaving}
                                >
                                    {isSaving ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <SaveIcon className="h-3 w-3" />}
                                    Save
                                </Button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <LazyMonacoEditor
                                    height="100%"
                                    language={getLanguage(currentFilePath)}
                                    value={editorContent}
                                    onChange={(value) => setEditorContent(value ?? '')}
                                    onMount={(editor) => {
                                        editorRef.current = editor;
                                    }}
                                    options={{
                                        minimap: { enabled: true },
                                        lineNumbers: 'on',
                                        wordWrap: 'on',
                                        scrollBeyondLastLine: false,
                                        fontSize: 13,
                                        theme: 'vs-dark',
                                        automaticLayout: true,
                                    }}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
                            <FileCode className="h-12 w-12" />
                            <p>Select a file from the explorer to start editing</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Missing icon used in empty state
function FileCode({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M10 13l-2 2l2 2" />
            <path d="M14 17l2-2l-2-2" />
            <path d="M14 3v4a1 1 0 0 0 1 1h4" />
            <path d="M17 21h-10a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
        </svg>
    );
}
