import fs from 'fs';
import path from 'path';
import { Member } from '@/types/member';

export function parseCSV(csvContent: string): Member[] {
  const lines = csvContent.trim().split('\n');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    return {
      prefecture: values[0],
      name: values[1],
      organization: values[2] || ''
    };
  });
}

export function loadMembers(): Member[] {
  const csvPath = path.join(process.cwd(), 'src', 'data', 'members.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  return parseCSV(csvContent);
}