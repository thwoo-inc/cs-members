import Image from 'next/image';
import { loadMembers } from '@/lib/csv';

export default async function Home() {
  const members = loadMembers();

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1 className="text-2xl font-bold">コミュニティ会員</h1>
        <div className="max-w-4xl w-full">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">都道府県</th>
                <th className="border border-gray-300 px-4 py-2 text-left">氏名</th>
                <th className="border border-gray-300 px-4 py-2 text-left">所属</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">{member.prefecture}</td>
                  <td className="border border-gray-300 px-4 py-2">{member.name}</td>
                  <td className="border border-gray-300 px-4 py-2">{member.organization}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://cs-editors.site/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image aria-hidden src="/globe.svg" alt="Globe icon" width={16} height={16} />
          みんなでつくる中国山地 百年会議 公式サイト→
        </a>
      </footer>
    </div>
  );
}
