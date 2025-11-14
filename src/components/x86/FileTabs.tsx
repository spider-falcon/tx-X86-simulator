"use client";
import type { FC } from 'react';
import type { ProgramFile } from '@/lib/x86/types';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, X, Edit, MoreVertical } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface FileTabsProps {
  files: ProgramFile[];
  activeFile: string;
  setActiveFile: (name: string) => void;
  onAddFile: () => void;
  onRenameFile: (name: string) => void;
  onDeleteFile: (name: string) => void;
}

const FileTabsComponent: FC<FileTabsProps> = ({ files, activeFile, setActiveFile, onAddFile, onRenameFile, onDeleteFile }) => {
  return (
    <div className="flex items-center gap-2">
      <Tabs value={activeFile} onValueChange={setActiveFile} className="w-full relative">
        <ScrollArea className="w-full">
            <TabsList className="bg-transparent border-0 p-0">
            {files.map(file => (
                <div key={file.name} className="relative group/tab">
                <TabsTrigger value={file.name} className={cn("font-code text-xs sm:text-sm pr-8", activeFile === file.name && "bg-card border-b-0 rounded-b-none")}>
                    {file.name}
                </TabsTrigger>
                <div className="absolute right-0.5 top-0 h-full flex items-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/tab:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onRenameFile(file.name)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDeleteFile(file.name)} className="text-destructive">
                                <X className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                </div>
            ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Tabs>
      <Button onClick={onAddFile} variant="outline" size="icon" className="h-10 w-10 flex-shrink-0">
        <Plus className="h-4 w-4" />
        <span className="sr-only">Add File</span>
      </Button>
    </div>
  );
};

export default FileTabsComponent;
