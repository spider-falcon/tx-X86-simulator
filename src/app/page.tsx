
"use client";

import { useState } from 'react';
import { useX86Simulator } from "@/hooks/useX86Simulator";
import Header from "@/components/x86/Header";
import FileTabs from "@/components/x86/FileTabs";
import CodeEditor from "@/components/x86/CodeEditor";
import ControlPanel from "@/components/x86/ControlPanel";
import OutputConsole from "@/components/x86/OutputConsole";
import RegisterDisplay from "@/components/x86/RegisterDisplay";
import MemoryDisplay from "@/components/x86/MemoryDisplay";
import CallStack from "@/components/x86/CallStack";
import ExecutionHistory from "@/components/x86/ExecutionHistory";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Home() {
  const simulator = useX86Simulator();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [fileToRename, setFileToRename] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  const handleRenameClick = (fileName: string) => {
    setFileToRename(fileName);
    setNewFileName(fileName);
    setRenameDialogOpen(true);
  };

  const handleRenameConfirm = () => {
    if (fileToRename && newFileName) {
      simulator.renameFile(fileToRename, newFileName);
    }
    setRenameDialogOpen(false);
    setFileToRename(null);
    setNewFileName('');
  };

  const handleDeleteClick = (fileName: string) => {
    setFileToDelete(fileName);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (fileToDelete) {
      simulator.deleteFile(fileToDelete);
    }
    setDeleteDialogOpen(false);
    setFileToDelete(null);
  };

  return (
    <>
      <main className="bg-background min-h-screen text-foreground font-body flex flex-col">
        <Header cycles={simulator.cycles} executionTime={simulator.executionTime} />
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Main content */}
          <div className="flex-1 flex flex-col p-2 sm:p-4 gap-4 overflow-auto">
            <FileTabs
                files={simulator.files}
                activeFile={simulator.activeFile}
                setActiveFile={simulator.setActiveFile}
                onAddFile={simulator.addFile}
                onRenameFile={handleRenameClick}
                onDeleteFile={handleDeleteClick}
              />
              <CodeEditor
                code={simulator.files.find(f => f.name === simulator.activeFile)?.code || ''}
                onCodeChange={(code) => simulator.updateCode(simulator.activeFile, code)}
                breakpoints={simulator.breakpoints}
                toggleBreakpoint={simulator.toggleBreakpoint}
                currentLine={simulator.currentLine}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ControlPanel
                    onStep={simulator.step}
                    onRun={simulator.run}
                    onReset={simulator.reset}
                    isRunning={simulator.isRunning}
                />
                <OutputConsole output={simulator.output} />
              </div>
          </div>
          {/* Right panel */}
          <div className="w-[350px] lg:w-[400px] flex-shrink-0 border-l bg-card/20 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-2 sm:p-4 flex flex-col gap-4">
                <RegisterDisplay registers={simulator.registers} flags={simulator.flags} />
                <MemoryDisplay memory={simulator.memory} registers={simulator.registers} />
                <CallStack callStack={simulator.callStack} />
                <ExecutionHistory history={simulator.history} />
              </div>
            </ScrollArea>
          </div>
        </div>
      </main>
      
      {/* Rename File Dialog */}
      <AlertDialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename File</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for the file "{fileToRename}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input 
            value={newFileName} 
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameConfirm()}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRenameConfirm}>Rename</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete File Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the file "{fileToDelete}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
