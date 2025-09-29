import { getPrefectureCoordinate } from '@/data/prefecture';
import { Member } from '@/types/member';
import Image from 'next/image';

// 会員情報吹き出しコンポーネント
const MemberTooltip = ({ member, onClose }: { member: Member; onClose: () => void }) => {
  const prefectureInfo = getPrefectureCoordinate(member.prefecture);
  const prefectureColor = prefectureInfo?.color || '#333';


  // 都道府県の色に対応するTailwindクラスを取得
  const getBorderColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      '#1f77b4': 'border-blue-500',
      '#ff7f0e': 'border-orange-500',
      '#2ca02c': 'border-green-600',
      '#d62728': 'border-red-600',
      '#9467bd': 'border-purple-500',
      '#8c564b': 'border-amber-700',
      '#e377c2': 'border-pink-400',
      '#7f7f7f': 'border-gray-500',
      '#bcbd22': 'border-yellow-500',
      '#17becf': 'border-cyan-500',
    };
    return colorMap[color] || 'border-gray-500';
  };

  const getBackgroundColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      '#1f77b4': 'bg-blue-500',
      '#ff7f0e': 'bg-orange-500',
      '#2ca02c': 'bg-green-600',
      '#d62728': 'bg-red-600',
      '#9467bd': 'bg-purple-500',
      '#8c564b': 'bg-amber-700',
      '#e377c2': 'bg-pink-400',
      '#7f7f7f': 'bg-gray-500',
      '#bcbd22': 'bg-yellow-500',
      '#17becf': 'bg-cyan-500',
    };
    return colorMap[color] || 'bg-gray-500';
  };

  return (
    <>
      {/* 背景オーバーレイ */}
      {/* <div
        className="fixed inset-0 z-40 bg-white bg-opacity-50"
        onClick={onClose}
      /> */}

      {/* モーダルコンテンツ */}
      <div
        className={`fixed z-50 bg-white bg-opacity-90 rounded-lg shadow-lg border-2 px-4 py-3 max-w-sm transform -translate-x-1/2 -translate-y-1/2 cursor-pointer ${getBorderColorClass(
          prefectureColor,
        )}`}
        style={{
          left: '50%',
          top: '50%',
        }}
        onClick={onClose}
      >
        <div className="flex flex-col items-center gap-3">
          {/* 都道府県ラベル */}
          <div
            className={`px-2 py-1 rounded text-xs font-medium text-white ${getBackgroundColorClass(
              prefectureColor,
            )}`}
          >
            {member.prefecture}
          </div>

          {/* サムネイル画像 */}
          <div className="relative w-16 h-16">
            <Image
              src={member.avatarPath}
              alt={`${member.name}のアバター`}
              width={64}
              height={64}
              className="rounded-full object-cover border-2"
              style={{ borderColor: prefectureColor }}
            />
          </div>

          {/* 名前と組織 */}
          <div className="text-center">
            <div className="font-semibold text-gray-800 text-sm">{`${member.name} さん`}</div>
            {member.organization && (
              <div className="text-xs text-gray-600 mt-1">{member.organization}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MemberTooltip;
