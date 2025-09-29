'use client';

import { Menu, X } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

export default function HamburgerMenu() {
  const { displayMode, setDisplayMode, isMenuOpen, setIsMenuOpen } = useAppContext();

  return (
    <nav className="relative">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="メニューを開く"
      >
        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* ポップアップメニュー */}
      {isMenuOpen && (
        <>
          {/* 背景のオーバーレイ */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* メニューコンテンツ */}
          <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border z-50 p-4 min-w-[200px]">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">表示モード</h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setDisplayMode('initial');
                      setIsMenuOpen(false);
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                      displayMode === 'initial'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    頭文字
                  </button>
                  <button
                    onClick={() => {
                      setDisplayMode('thumbnail');
                      setIsMenuOpen(false);
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                      displayMode === 'thumbnail'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    サムネイル
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}