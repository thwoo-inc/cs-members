import { getPrefectureCoordinate } from '@/data/prefecture';
import { Member } from '@/types/member';

// 会員情報吹き出しコンポーネント
const MemberTooltip = ({
  member,
  position,
}: {
  member: Member;
  position: { x: number; y: number };
}) => {
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
    <div
      className={`absolute z-50 bg-white rounded-lg shadow-lg border-2 px-3 py-2 max-w-sm pointer-events-none transform -translate-x-1/2 ${getBorderColorClass(prefectureColor)}`}
      style={{
        left: position.x,
        top: position.y + 30,
      }}
    >
      {/* 吹き出しの矢印（上向き） */}
      <div className="absolute left-1/2 transform -translate-x-1/2 -top-2">
        <div className={`w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent ${getBorderColorClass(prefectureColor).replace('border-', 'border-b-')}`} />
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-2">
        <div className={`px-2 py-1 rounded text-xs font-medium text-white flex-shrink-0 ${getBackgroundColorClass(prefectureColor)}`}>
          {member.prefecture}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-gray-800 text-sm">{member.name}</div>
          {member.organization && (
            <div className="text-xs text-gray-600 mt-1">{member.organization}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberTooltip;
