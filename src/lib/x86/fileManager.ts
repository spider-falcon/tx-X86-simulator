import type { ProgramFile } from './types';

export function addFile(files: ProgramFile[], name: string): ProgramFile[] {
  const newFile = { name, code: `; New file: ${name}` };
  return [...files, newFile];
}

export function updateFileCode(files: ProgramFile[], name: string, newCode: string): ProgramFile[] {
  return files.map(file => 
    file.name === name ? { ...file, code: newCode } : file
  );
}
