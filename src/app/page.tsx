import Image from 'next/image';
import { loadMembers } from '@/lib/csv';
import MemberGeoGraph from '@/components/MemberGeoGraph';
import Link from 'next/link';

export default async function Home() {
  const members = loadMembers();

  return (
    <main className="font-sans min-h-screen relative flex flex-col">
      <header className="absolute flex top-0 justify-center items-center sm:text-2xl font-bold z-10 bg-[#F0F0F0]/80 w-full p-4 sm:p-8">
        <h1 className="">みんなでつくる中国山地 百年会議 会員マップ</h1>
      </header>
      <div className="w-full min-h-screen relative">
        <MemberGeoGraph members={members} />
      </div>
      <footer className="absolute flex justify-center items-center bottom-0 text-sm sm:text-base z-10 bg-[#F0F0F0]/80 w-full p-4">
        <Link
          className="hover:underline hover:underline-offset-4"
          href="https://cs-editors.site/"
          target="_blank"
          rel="noopener noreferrer"
        >
          みんなでつくる中国山地 百年会議 公式サイト→
        </Link>
      </footer>
    </main>
  );
}
