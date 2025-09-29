import fs from 'fs';
import path from 'path';
import { Member } from '@/types/member';

export function parseCSV(csvContent: string): Member[] {
  const lines = csvContent.trim().split('\n');

  return lines.slice(1).map((line, index) => {
    const values = line.split(',');
    // 20個のアバター画像を連番でセット
    const avatarIndex = ((index % 20) + 1).toString().padStart(2, '0');
    const avatarPath = `/img/avator${avatarIndex}.png`;

    return {
      prefecture: values[0],
      name: values[1],
      organization: values[2] || '',
      avatarPath: avatarPath
    };
  });
}

export function loadMembers(): Member[] {
  const csvPath = path.join(process.cwd(), 'src', 'data', 'members.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  return parseCSV(csvContent);
}