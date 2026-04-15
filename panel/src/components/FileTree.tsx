import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FileCode, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export type FileEntry = {
    name: string;
    path: string;
    isDir: boolean;
    children?: FileEntry[];
};

type FileTreeProps = {
    tree: FileEntry[];
    onFileSelect: (path: string) => void;
    currentFilePath?: string;
};

type TreeItemProps = {
    item: FileEntry;
    level: number;
    onFileSelect: (path: string) => void;
    currentFilePath?: string;
};

const TreeItem: React.FC<TreeItemProps> = ({ item, level, onFileSelect, currentFilePath }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isSelected = currentFilePath === item.path;

    const toggleOpen = (e: React.MouseEvent) => {
        if (item.isDir) {
            e.stopPropagation();
            setIsOpen(!isOpen);
        }
    };

    const handleClick = () => {
        if (!item.isDir) {
            onFileSelect(item.path);
        } else {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div>
            <div
                className={cn(
                    'flex items-center py-1 px-2 cursor-pointer hover:bg-accent/50 rounded-sm text-sm transition-colors',
                    isSelected && 'bg-accent text-accent-foreground font-medium',
                    level > 0 && 'ml-4',
                )}
                onClick={handleClick}
            >
                <div className="flex items-center gap-1 min-w-0 flex-1">
                    {item.isDir ? (
                        <>
                            {isOpen ? (
                                <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                            ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
                            )}
                            {isOpen ? (
                                <FolderOpen className="h-4 w-4 shrink-0 text-blue-400" />
                            ) : (
                                <Folder className="h-4 w-4 shrink-0 text-blue-400" />
                            )}
                        </>
                    ) : (
                        <>
                            <div className="w-4 h-4" /> {/* Indent for files */}
                            <FileCode className="h-4 w-4 shrink-0 text-orange-400" />
                        </>
                    )}
                    <span className="truncate">{item.name}</span>
                </div>
            </div>
            {item.isDir && isOpen && item.children && (
                <div className="border-l border-border/50 ml-4">
                    {item.children.map((child) => (
                        <TreeItem
                            key={child.path}
                            item={child}
                            level={level + 1}
                            onFileSelect={onFileSelect}
                            currentFilePath={currentFilePath}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const FileTree: React.FC<FileTreeProps> = ({ tree, onFileSelect, currentFilePath }) => {
    return (
        <ScrollArea className="h-full pr-4">
            <div className="flex flex-col gap-px py-2">
                {tree.map((item) => (
                    <TreeItem
                        key={item.path}
                        item={item}
                        level={0}
                        onFileSelect={onFileSelect}
                        currentFilePath={currentFilePath}
                    />
                ))}
            </div>
        </ScrollArea>
    );
};
