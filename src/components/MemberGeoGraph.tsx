// app/components/MemberGeoGraph.tsx
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { forceX, forceY, forceCollide, forceManyBody } from 'd3-force';
import { Member } from '@/types/member';
import { getPrefectureCoordinate } from '@/data/prefecture';
import MemberTooltip from '@/components/MemberTooltip';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

type DisplayMode = 'initial' | 'thumbnail';

interface GraphNode {
  id: string;
  name: string;
  pref: string;
  firstChar: string;
  avatarPath: string;
  _targetX: number;
  _targetY: number;
  x: number;
  y: number;
}

export default function MemberGeoGraph({ members }: { members: Member[] }) {
  const ref = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('initial');
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 画像キャッシュ
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // --- 1) 緯度経度を画面比率に合わせて線形マッピングするプロジェクタ ---
  // 緯度経度の歪み補正は行わず、単純に lng/lat を [0..width] / [0..height] に線形変換する
  const projection = useMemo(() => {
    // members から表示対象の lng/lat の範囲を算出
    const coords = members
      .map((m) => getPrefectureCoordinate(m.prefecture))
      .filter((c): c is NonNullable<ReturnType<typeof getPrefectureCoordinate>> => !!c);

    // 何もなければ安全なデフォルト（日本付近のざっくりした範囲）
    if (coords.length === 0) {
      const minLng = 122;
      const maxLng = 146;
      const minLat = 24;
      const maxLat = 46;
      const lngRange = Math.max(1e-6, maxLng - minLng);
      const latRange = Math.max(1e-6, maxLat - minLat);
      return ([lng, lat]: [number, number]) => {
        const x = ((lng - minLng) / lngRange) * dimensions.width;
        const y = ((maxLat - lat) / latRange) * dimensions.height; // y は上が 0 になるよう反転
        return [x - dimensions.width / 2, y - dimensions.height / 2] as [number, number];
      };
    }

    const lngs = coords.map((c) => c.lng);
    const lats = coords.map((c) => c.lat);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const lngRange = Math.max(1e-6, maxLng - minLng);
    const latRange = Math.max(1e-6, maxLat - minLat);

    // 画面比率にそのままフィットさせる（x は width、y は height にスケーリング）
    return ([lng, lat]: [number, number]) => {
      const x = ((lng - minLng) / lngRange) * dimensions.width;
      const y = ((maxLat - lat) / latRange) * dimensions.height; // 上原点のため反転
      // ForceGraph の座標は任意スケールなので、中心が (0,0) になるよう平行移動しておく
      return [x - dimensions.width / 2, y - dimensions.height / 2] as [number, number];
    };
  }, [members, dimensions.width, dimensions.height]);

  // --- 2) ノード配列（エッジなし） ---
  const data = useMemo(() => {
    // ForceGraph は x/y 初期値があると収束が速い
    const nodes = members
      .map((m, index) => {
        const coords = getPrefectureCoordinate(m.prefecture);
        if (!coords) {
          console.warn(`Coordinates not found for prefecture: ${m.prefecture}`);
          return null;
        }

        const [x0, y0] = projection([coords.lng, coords.lat]) as [number, number];
        // 初期位置は重心 + 微小ジッター
        const jitter = () => (Math.random() - 0.5) * 8;

        // アバター画像パスを事前に計算（01-20のループ）
        const avatarIndex = ((index % 20) + 1).toString().padStart(2, '0');
        const avatarPath = `/img/avator${avatarIndex}.png`;

        return {
          id: `${index}-${m.name}`,
          name: m.name,
          pref: m.prefecture,
          firstChar: m.name ? m.name.charAt(0) : '?',
          avatarPath: avatarPath,
          _targetX: x0,
          _targetY: y0,
          x: x0 + jitter(),
          y: y0 + jitter(),
        };
      })
      .filter((node): node is NonNullable<typeof node> => node !== null);
    return { nodes, links: [] };
  }, [members, projection]);

  // アバター画像を事前に読み込んでキャッシュ
  useEffect(() => {
    const loadImages = async () => {
      const imagePromises: Promise<void>[] = [];

      // 01-20の画像を事前読み込み
      for (let i = 1; i <= 20; i++) {
        const index = i.toString().padStart(2, '0');
        const path = `/img/avator${index}.png`;

        if (!imageCache.current.has(path)) {
          const promise = new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              imageCache.current.set(path, img);
              resolve();
            };
            img.onerror = () => {
              // エラーの場合もresolveして処理を続行
              resolve();
            };
            img.src = path;
          });
          imagePromises.push(promise);
        }
      }

      await Promise.all(imagePromises);
      setImagesLoaded(true);
    };

    loadImages();
  }, []);

  // 画像読み込み完了後にグラフを更新
  useEffect(() => {
    if (imagesLoaded && ref.current) {
      // 少し遅延を入れてから再描画（キャッシュが完全に反映されるまで）
      setTimeout(() => {
        if (ref.current) {
          ref.current.refresh?.();
        }
      }, 100);
    }
  }, [imagesLoaded]);

  // 画面サイズの監視
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight, // 画面全体の高さを使用
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!ref.current) return;

    // --- 3) d3-force のカスタム設定 ---
    // 居住地の基準点へ引き寄せ（適度な強さで継続的な動きを作る）
    ref.current.d3Force('x', forceX((n: GraphNode) => n._targetX).strength(0.3));
    ref.current.d3Force('y', forceY((n: GraphNode) => n._targetY).strength(0.3));

    // ほどよい反発（動きを維持するために少し強めに）
    ref.current.d3Force('charge', forceManyBody().strength(-12));

    // 衝突回避：アバターサイズに合わせて調整
    const radius = 24; // px（アバターのサイズより少し大きめ）
    ref.current.d3Force('collide', forceCollide(radius));

    // 重心の周りに軽くバラけさせたい場合（任意）
    // ref.current.d3Force("radial", forceRadial(10, (n: any) => n._targetX, (n: any) => n._targetY).strength(0.02));

    // 高DPRでの過描画を抑制
    ref.current.setCanvasPixelRatio?.(Math.min(window.devicePixelRatio || 1, 2));

    // 継続的な微細な動きのために温度を設定
    ref.current.d3Force('center', null); // 中心力を無効化
    ref.current.d3ReheatSimulation(); // シミュレーションを再加熱

    // 初期から適切なサイズで表示
    setTimeout(() => {
      ref.current?.zoomToFit(0, 80); // ヘッダー・フッター分を考慮したパディング
    }, 100); // 少し遅延を入れてレンダリング完了後に実行
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ touchAction: 'none' }}>
      {/* タブ切り替えUI */}
      <div className="absolute top-[72px] sm:top-[108px] left-4 z-50 flex bg-white/90 backdrop-blur-sm rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => setDisplayMode('initial')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            displayMode === 'initial' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          頭文字
        </button>
        <button
          onClick={() => setDisplayMode('thumbnail')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            displayMode === 'thumbnail'
              ? 'bg-blue-500 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          サムネイル
        </button>
      </div>

      <ForceGraph2D
        ref={ref}
        graphData={data}
        width={dimensions.width}
        height={dimensions.height}
        // 見た目
        nodeRelSize={15}
        nodeAutoColorBy="pref"
        linkWidth={0} // エッジなし
        // パフォーマンス・操作性
        cooldownTicks={300}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        minZoom={0.25}
        maxZoom={12}
        // カスタムノード描画: 表示モードに応じて頭文字またはアバター画像を表示
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D) => {
          const radius = 20;

          // 都道府県の色情報を取得
          const prefectureInfo = getPrefectureCoordinate(node.pref);
          const prefectureColor = prefectureInfo?.color || '#333';

          if (displayMode === 'thumbnail') {
            // サムネイル表示モード: キャッシュされたアバター画像を使用
            const cachedImage = imageCache.current.get(node.avatarPath);

            ctx.save();

            // 円形クリッピングパスを設定
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            // キャッシュされた画像があれば描画、なければ白背景
            if (cachedImage && cachedImage.complete && cachedImage.naturalWidth !== 0) {
              ctx.drawImage(cachedImage, node.x - radius, node.y - radius, radius * 2, radius * 2);
            } else {
              // フォールバック: 白背景
              ctx.fillStyle = '#fff';
              ctx.fill();
            }

            ctx.restore();

            // 円形のボーダーを描画（都道府県の色）
            ctx.strokeStyle = prefectureColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            // 頭文字表示モード: 事前設定された頭文字を使用
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
            ctx.fill();

            // 円形のボーダーを描画（都道府県の色）
            ctx.strokeStyle = prefectureColor;
            ctx.lineWidth = 3;
            ctx.stroke();

            // 文字を描画
            ctx.fillStyle = '#333';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.firstChar, node.x, node.y);
          }
        }}
        // 当たり判定を広めに（スマホ向け）
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 24, 0, Math.PI * 2);
          ctx.fill();
        }}
        // アバターモードを設定
        nodeCanvasObjectMode={() => 'replace'}
        onBackgroundClick={() => {
          setSelectedMember(null);
          setClickPosition(null);
        }}
        onZoom={() => {
          // ズーム操作時にツールチップを閉じる
          setSelectedMember(null);
          setClickPosition(null);
        }}
        onZoomEnd={() => {
          // ズーム終了時にもツールチップを閉じる（念のため）
          setSelectedMember(null);
          setClickPosition(null);
        }}
        onNodeClick={(node: any, event: any) => {
          // 対応する会員を検索
          const member = members.find((m) => `${members.indexOf(m)}-${m.name}` === node.id);
          if (member) {
            setSelectedMember(member);
            // クリック位置を画面座標で取得
            if (event) {
              setClickPosition({ x: event.x || event.clientX, y: event.y || event.clientY });
            }
          }
        }}
      />

      {/* 会員情報吹き出し */}
      {selectedMember && clickPosition && (
        <MemberTooltip member={selectedMember} position={clickPosition} />
      )}

      {/* 背景クリックで吹き出しを閉じる（モバイルのパン/ズームを阻害しないよう pointer-events: none） */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          onClick={() => {
            setSelectedMember(null);
            setClickPosition(null);
          }}
        />
      )}
    </div>
  );
}
