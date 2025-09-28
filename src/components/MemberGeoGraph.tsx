// app/components/MemberGeoGraph.tsx
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3-geo';
import { forceX, forceY, forceCollide, forceManyBody } from 'd3-force';
import { Member } from '@/types/member';
import { getPrefectureCoordinate } from '@/data/prefecture';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

export default function MemberGeoGraph({ members }: { members: Member[] }) {
  const ref = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // --- 1) 日本向けの地図投影（メルカトル）を作る ---
  // ビューポートは CSS で管理するので、後でサイズに応じてスケールを更新してもOK
  const projection = useMemo(() => {
    // 中心とスケールは適宜調整（ここでは日本だいたい中央）
    return d3.geoMercator().center([137.0, 38.0]).scale(1600).translate([0, 0]);
  }, []);

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
        return {
          id: `${index}-${m.name}`,
          name: m.name,
          pref: m.prefecture,
          _targetX: x0,
          _targetY: y0,
          x: x0 + jitter(),
          y: y0 + jitter(),
        };
      })
      .filter((node): node is NonNullable<typeof node> => node !== null);
    return { nodes, links: [] };
  }, [members, projection]);

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
    // 居住地の基準点へ引き寄せ（強すぎるとガチガチになるので 0.08 前後から）
    ref.current.d3Force('x', forceX((n: any) => n._targetX).strength(0.08));
    ref.current.d3Force('y', forceY((n: any) => n._targetY).strength(0.08));

    // ほどよい反発（弱めのクーロン斥力）
    ref.current.d3Force('charge', forceManyBody().strength(-5));

    // 衝突回避：見た目より少し大きめに（タップもしやすい）
    const radius = 6; // px（ズームで相対的に見え方は変わる）
    ref.current.d3Force('collide', forceCollide(radius));

    // 重心の周りに軽くバラけさせたい場合（任意）
    // ref.current.d3Force("radial", forceRadial(10, (n: any) => n._targetX, (n: any) => n._targetY).strength(0.02));

    // 高DPRでの過描画を抑制
    ref.current.setCanvasPixelRatio?.(Math.min(window.devicePixelRatio || 1, 2));

    // 初期から適切なサイズで表示
    setTimeout(() => {
      ref.current?.zoomToFit(0, 80); // ヘッダー・フッター分を考慮したパディング
    }, 100); // 少し遅延を入れてレンダリング完了後に実行
  }, []);

  return (
    // <div className="relative w-full h-full">
    // Zoom値表示
    // <div className="absolute top-4 right-4 z-10 bg-black/70 text-white px-3 py-1 rounded text-sm">
    //   Zoom: {zoom.toFixed(2)}
    // </div>
    <ForceGraph2D
      ref={ref}
      graphData={data}
      width={dimensions.width}
      height={dimensions.height}
      // 見た目
      nodeRelSize={3}
      nodeAutoColorBy="pref"
      linkWidth={0} // エッジなし
      // パフォーマンス・操作性
      cooldownTicks={150}
      enableNodeDrag={true}
      minZoom={0.25}
      maxZoom={12}
      // 当たり判定を広めに（スマホ向け）
      nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
        ctx.fill();
      }}
      // ラベルはズームイン時のみ
      nodeCanvasObjectMode={() => 'after'}
      nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, scale: number) => {
        if (scale < 2.5) return;
        ctx.font = `${12 / scale ** 0.6}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.name, node.x, node.y - 10);
      }}
      // onEngineStop={() => ref.current?.zoomToFit(200, 40)}
      onNodeClick={(node: any) => {
        // クリック/タップでその居住地の塊に寄る
        const duration = 800;
        ref.current?.centerAt(node._targetX, node._targetY, duration);
        ref.current?.zoom(4, duration);
        // 小窓表示はここで state を立てるなど
      }}
    />
    // </div>
  );
}
