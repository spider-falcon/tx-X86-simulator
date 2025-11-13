import type { ProgramFile } from './types';

export function addFile(files: ProgramFile[]): { files: ProgramFile[], newName: string } {
  let counter = 1;
  let newName = `new_file_${counter}.asm`;
  
  while (files.some(f => f.name === newName)) {
    counter++;
    newName = `new_file_${counter}.asm`;
  }
  
  const newFile: ProgramFile = { name: newName, code: `; New file: ${newName}` };
  return { files: [...files, newFile], newName };
}

export function renameFile(files: ProgramFile[], oldName: string, newName: string): { files: ProgramFile[], success: boolean } {
  if (oldName === newName) {
    return { files, success: true };
  }
  if (files.some(f => f.name === newName)) {
    return { files, success: false };
  }
  return {
    files: files.map(file => 
      file.name === oldName ? { ...file, name: newName } : file
    ),
    success: true
  };
}


export function deleteFile(files: ProgramFile[], nameToDelete: string, currentActiveFile: string): { files: ProgramFile[], newActiveFile: string | null } {
  const newFiles = files.filter(file => file.name !== nameToDelete);
  
  if (newFiles.length === 0) {
    return { files: [], newActiveFile: null };
  }

  let newActiveFile = currentActiveFile;
  if (currentActiveFile === nameToDelete) {
    const originalIndex = files.findIndex(f => f.name === nameToDelete);
    // Try to select the next file, or the previous one if it was the last file
    const newIndex = Math.max(0, originalIndex - 1);
    newActiveFile = newFiles[newIndex]?.name || newFiles[0]?.name;
  }

  return { files: newFiles, newActiveFile };
}

export function updateFileCode(files: ProgramFile[], name: string, newCode: string): ProgramFile[] {
  return files.map(file => 
    file.name === name ? { ...file, code: newCode } : file
  );
}
