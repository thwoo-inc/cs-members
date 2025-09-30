import { loadMembers } from '@/lib/csv';
import MemberGeoGraph from '@/components/MemberGeoGraph';
import HamburgerMenu from '@/components/HamburgerMenu';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import Image from 'next/image';

export default async function Home() {
  const members = loadMembers();

  return (
    <main className="font-sans h-[100dvh] relative flex flex-col">
      <header className="absolute top-0 z-10 bg-[#F0F0F0]/80 w-full h-[64px] sm:h-[80px]">
        <div className="container p-4 sm:p-8 flex items-center justify-between mx-auto h-full">
          <h1 className="flex flex-row gap-4 sm:gap-8 font-bold relative items-center">
            <Image
              src="./img/logo.png"
              width={468}
              height={225}
              alt="みんなでつくる中国山地 百年会議"
              className="w-[104px] h-[50px]"
            />
            <p className="text-lg font-semibold">会員マップ</p>
          </h1>
          <HamburgerMenu />
        </div>
      </header>
      <div className="w-full h-full relative">
        <MemberGeoGraph members={members} />
      </div>
      <footer className="absolute flex justify-center items-center bottom-0 text-xs sm:text-sm z-10 h-[24px] sm:h-[36px] bg-[#F0F0F0]/80 w-full p-4">
        <Link
          className="hover:underline hover:underline-offset-4 flex items-center gap-2"
          href="https://cs-editors.site/"
          target="_blank"
          rel="noopener noreferrer"
        >
          みんなでつくる中国山地 百年会議 公式サイト
          <ExternalLink size={18} />
        </Link>
      </footer>
    </main>
  );
}
