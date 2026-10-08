export function findReactEntryProblems(files: {
  iife: string;
  reactEsm: string;
  reactCjs: string;
  reactDts: string;
}): string[];
