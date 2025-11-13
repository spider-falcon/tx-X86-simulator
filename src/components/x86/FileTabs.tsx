"use client";
import type { FC } from 'react';
import type { ProgramFile } from '@/lib/x86/types';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FileTabsProps {
  files: ProgramFile[];
  activeFile: string;
  setActiveFile: (name: string) => void;
}

const FileTabsComponent: FC<FileTabsProps> = ({ files, activeFile, setActiveFile }) => {
  return (
    <Tabs value={activeFile} onValueChange={setActiveFile} className="w-full">
      <TabsList className="bg-card border">
        {files.map(file => (
          <TabsTrigger key={file.name} value={file.name} className="font-code text-xs sm:text-sm">
            {file.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default FileTabsComponent;
