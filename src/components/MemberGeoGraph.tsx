// app/components/MemberGeoGraph.tsx
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { forceCollide, forceManyBody } from 'd3-force';
import { Member } from '@/types/member';
import { getPrefectureCoordinate } from '@/data/prefecture';
import MemberTooltip from '@/components/MemberTooltip';
import { useAppContext } from '@/contexts/AppContext';

export type DisplayMode = 'initial' | 'thumbnail';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => null,
});

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
  vx?: number;
  vy?: number;
  _angle?: number;
  _radius?: number;
  _isRoot?: boolean;
}

export default function MemberGeoGraph({ members }: { members: Member[] }) {
  const { displayMode, setDisplayMode } = useAppContext();
  const ref = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 画像キャッシュ（アバター + ロゴ）
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);

  // --- 1) 地理的な力の向きを変更した座標変換（北→右、南→左、中国地方中心） ---
  // 緯度経度の歪み補正は行わず、地理的方向を回転させてマッピング
  const projection = useMemo(() => {
    // 中国地方の都道府県を定義
    const chugokuRegion = ['鳥取県', '島根県', '岡山県', '広島県', '山口県'];

    // members から表示対象の lng/lat の範囲を算出
    const coords = members
      .map((m) => getPrefectureCoordinate(m.prefecture))
      .filter((c): c is NonNullable<ReturnType<typeof getPrefectureCoordinate>> => !!c);

    // 中国地方の中心座標を算出（広島県を中心として設定）
    const hiroshima = getPrefectureCoordinate('広島県');
    const centerLat = hiroshima?.lat || 34.396294;
    const centerLng = hiroshima?.lng || 132.459622;

    // 何もなければ安全なデフォルト（中国地方中心の範囲）
    if (coords.length === 0) {
      const minLng = 131;
      const maxLng = 135;
      const minLat = 34;
      const maxLat = 36;
      const lngRange = Math.max(1e-6, maxLng - minLng);
      const latRange = Math.max(1e-6, maxLat - minLat);
      return ([lng, lat]: [number, number]) => {
        // 北→右、南→左の変換: 緯度を x軸に、経度を y軸に（反転）
        const x = ((lat - minLat) / latRange) * dimensions.width;
        const y = ((maxLng - lng) / lngRange) * dimensions.height;
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

    // 地理的方向を変更: 北（高緯度）→右、南（低緯度）→左
    // 中国地方を中心に配置するためのオフセットを計算
    return ([lng, lat]: [number, number]) => {
      // 緯度を x軸、経度を y軸に配置（90度回転効果）
      const x = ((lat - minLat) / latRange) * dimensions.width;
      const y = ((maxLng - lng) / lngRange) * dimensions.height; // 経度を反転してy軸に

      // 中国地方のメンバーが多い場合は、その地域を中心に近づける
      const isChugoku = chugokuRegion.some((pref) => members.some((m) => m.prefecture === pref));

      let adjustedX = x - dimensions.width / 2;
      let adjustedY = y - dimensions.height / 2;

      // 中国地方のメンバーがいる場合、中央寄りに調整
      if (isChugoku) {
        const chugokuCenterX =
          ((centerLat - minLat) / latRange) * dimensions.width - dimensions.width / 2;
        const chugokuCenterY =
          ((maxLng - centerLng) / lngRange) * dimensions.height - dimensions.height / 2;

        // 中国地方の中心を画面中央に近づけるためのオフセット
        const offsetX = -chugokuCenterX * 0.3;
        const offsetY = -chugokuCenterY * 0.3;

        adjustedX += offsetX;
        adjustedY += offsetY;
      }

      return [adjustedX, adjustedY] as [number, number];
    };
  }, [members, dimensions.width, dimensions.height]);

  // --- 2) 都道府県比率に応じた方位分割とノード配列（Rootノード含む） ---
  const data = useMemo(() => {
    // 都道府県別のメンバー数をカウント
    const prefectureCount = members.reduce((acc, member) => {
      acc[member.prefecture] = (acc[member.prefecture] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 全メンバー数
    const totalMembers = members.length;

    // 都道府県をメンバー数の多い順にソート
    const sortedPrefectures = Object.entries(prefectureCount)
      .sort(([, a], [, b]) => b - a)
      .map(([pref, count]) => ({ pref, count, ratio: count / totalMembers }));

    // 方位角を比率に応じて割り当て
    let currentAngle = 0;
    const prefectureAngles: Record<
      string,
      { startAngle: number; endAngle: number; centerAngle: number }
    > = {};

    sortedPrefectures.forEach(({ pref, ratio }) => {
      const angleRange = ratio * 2 * Math.PI; // 比率に応じた角度範囲
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleRange;
      const centerAngle = currentAngle + angleRange / 2;

      prefectureAngles[pref] = { startAngle, endAngle, centerAngle };
      currentAngle = endAngle;
    });

    // ForceGraph は x/y 初期値があると収束が速い
    const nodes = members
      .map((m, index) => {
        const coords = getPrefectureCoordinate(m.prefecture);
        if (!coords) {
          console.warn(`Coordinates not found for prefecture: ${m.prefecture}`);
          return null;
        }

        // 中心点（広島県を中心として設定）
        const centerX = 0;
        const centerY = 0;

        // 都道府県の方位範囲を取得
        const angleInfo = prefectureAngles[m.prefecture];
        if (!angleInfo) {
          console.warn(`Angle info not found for prefecture: ${m.prefecture}`);
          return null;
        }

        // 都道府県内の何番目のメンバーかを計算
        const membersInPref = members.filter((member) => member.prefecture === m.prefecture);
        const memberIndexInPref = membersInPref.findIndex((member) => member.name === m.name);
        const totalInPref = membersInPref.length;

        // 都道府県内での方位角を計算（範囲内で均等分布）
        let angle: number;
        if (totalInPref === 1) {
          // 1人だけの場合は中央角度
          angle = angleInfo.centerAngle;
        } else {
          // 複数人いる場合は範囲内で均等分布
          const angleStep = (angleInfo.endAngle - angleInfo.startAngle) / totalInPref;
          angle = angleInfo.startAngle + angleStep * (memberIndexInPref + 0.5);
        }

        // 中心からの距離（Rootノードと重ならないよう調整）
        const minRadius = 90; // Rootノード（半径65px）とのクリアランスを保つ
        const baseRadius = 120; // ベース距離
        const radiusVariation = 50; // 距離のバリエーション
        const radius = Math.max(minRadius, baseRadius + (Math.random() - 0.5) * radiusVariation);

        // 極座標から直交座標に変換
        const x0 = centerX + radius * Math.cos(angle);
        const y0 = centerY + radius * Math.sin(angle);

        return {
          id: `${index}-${m.name}`,
          name: m.name,
          pref: m.prefecture,
          firstChar: m.name ? m.name.charAt(0) : '?',
          avatarPath: m.avatarPath,
          _targetX: x0,
          _targetY: y0,
          x: x0,
          y: y0,
          _angle: angle,
          _radius: radius,
          _isRoot: false,
        };
      })
      .filter((node): node is NonNullable<typeof node> => node !== null);

    // Rootノードを中心に追加（会員とは異なる特別ノード）
    const rootNode = {
      id: 'root-community',
      name: 'みんなでつくる中国山地百年会議',
      pref: '',
      firstChar: '',
      avatarPath: '',
      _targetX: 0,
      _targetY: 0,
      x: 0,
      y: 0,
      _angle: 0,
      _radius: 0,
      _isRoot: true,
    };

    return { nodes: [rootNode, ...nodes], links: [] };
  }, [members, projection]);

  // アバター画像とロゴを事前に読み込んでキャッシュ
  useEffect(() => {
    const loadImages = async () => {
      const imagePromises: Promise<void>[] = [];

      // ロゴ画像を読み込み
      const logoPath = '/img/logo.png';
      if (!imageCache.current.has(logoPath)) {
        const logoPromise = new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            imageCache.current.set(logoPath, img);
            setLogoLoaded(true);
            resolve();
          };
          img.onerror = () => {
            console.warn('Logo image failed to load:', logoPath);
            setLogoLoaded(false);
            resolve();
          };
          img.src = logoPath;
        });
        imagePromises.push(logoPromise);
      }

      // 01-20のアバター画像を事前読み込み
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

    // --- 3) d3-force のカスタム設定（中心からの放射状配置） ---
    // Rootノードを中心に固定する力
    ref.current.d3Force('center-root', function (alpha: number) {
      const nodes = data.nodes as (GraphNode & { vx: number; vy: number })[];
      const strength = 1.0; // Rootノードは強固定

      nodes.forEach((node) => {
        if (node._isRoot) {
          // Rootノードを中心に固定
          node.x = 0;
          node.y = 0;
          node.vx = 0;
          node.vy = 0;
        }
      });
    });

    // 中心からの放射状配置を維持する力（会員ノードのみ）
    ref.current.d3Force('radial', function (alpha: number) {
      const nodes = data.nodes as (GraphNode & { vx: number; vy: number })[];
      const strength = 0.3 * alpha;

      nodes.forEach((node) => {
        if (!node._isRoot && node._angle !== undefined && node._radius !== undefined) {
          // 目標位置を極座標から計算
          const targetX = node._radius * Math.cos(node._angle);
          const targetY = node._radius * Math.sin(node._angle);

          // 目標位置への力を適用
          const dx = targetX - node.x;
          const dy = targetY - node.y;

          node.vx = (node.vx || 0) + dx * strength;
          node.vy = (node.vy || 0) + dy * strength;
        }
      });
    });

    // 同じ都道府県内での引き寄せ力（方位角を維持しながら）
    ref.current.d3Force('prefecture', function (alpha: number) {
      const nodes = data.nodes as (GraphNode & { vx: number; vy: number })[];
      const strength = 0.1 * alpha;

      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          // 同じ都道府県のノード同士を引き寄せる（距離方向のみ）
          if (
            nodeA.pref === nodeB.pref &&
            nodeA._angle !== undefined &&
            nodeB._angle !== undefined
          ) {
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0 && distance > 30) {
              // 距離が遠い場合のみ引き寄せる
              const force = strength / distance;
              const fx = dx * force * 0.5; // 放射状配置を保つため弱めに
              const fy = dy * force * 0.5;

              nodeA.vx = (nodeA.vx || 0) + fx;
              nodeA.vy = (nodeA.vy || 0) + fy;
              nodeB.vx = (nodeB.vx || 0) - fx;
              nodeB.vy = (nodeB.vy || 0) - fy;
            }
          }
        }
      }
    });

    // 適度な反発（放射状配置を保つため弱めに）
    ref.current.d3Force('charge', forceManyBody().strength(-5));

    // 衝突回避：アバターサイズに合わせて調整
    ref.current.d3Force(
      'collide',
      forceCollide().radius((node: any) => {
        if (node._isRoot) {
          return 70; // Rootノードは大きな衝突半径
        }
        return 18; // 会員ノードは通常サイズ
      }),
    );

    // 高DPRでの過描画を抑制
    ref.current.setCanvasPixelRatio?.(Math.min(window.devicePixelRatio || 1, 2));

    // 中心力を無効化（放射状配置を維持するため）
    ref.current.d3Force('center', null);

    // x/y方向の引き寄せ力を無効化（放射状配置を優先）
    ref.current.d3Force('x', null);
    ref.current.d3Force('y', null);

    // シミュレーションを再加熱
    ref.current.d3ReheatSimulation();

    // 初期から適切なサイズで表示
    setTimeout(() => {
      ref.current?.zoomToFit(0, 80); // ヘッダー・フッター分を考慮したパディング
    }, 100); // 少し遅延を入れてレンダリング完了後に実行
  }, [data.nodes]);

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ touchAction: 'none' }}>
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
        // カスタムノード描画: Rootノードと会員ノードを区別して描画
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D) => {
          // Rootノードの描画
          if (node._isRoot) {
            const rootRadius = 85; // Rootノードは大きめ

            // 白い半透明の正円背景
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(node.x, node.y, rootRadius, 0, Math.PI * 2);
            ctx.fill();

            // ボーダー
            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.restore();

            // ロゴ画像を描画
            const logoImage = imageCache.current.get('/img/logo.png');
            if (logoImage && logoLoaded) {
              const logoW = 156; // ロゴのサイズ
              const logoH = 75;
              ctx.drawImage(logoImage, node.x - logoW / 2, node.y - logoH / 2, logoW, logoH);
            }

            return;
          }

          // 会員ノードの描画
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
            ctx.fillStyle = '#fffc';
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
          // Rootノードはクリック不可
          if (node._isRoot) return;

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 24, 0, Math.PI * 2);
          ctx.fill();
        }}
        // アバターモードを設定
        nodeCanvasObjectMode={() => 'replace'}
        onBackgroundClick={() => {
          setSelectedMember(null);
        }}
        onZoom={() => {
          // ズーム操作時にツールチップを閉じる
          setSelectedMember(null);
        }}
        onZoomEnd={() => {
          // ズーム終了時にもツールチップを閉じる（念のため）
          setSelectedMember(null);
        }}
        onNodeClick={(node: any, event: any) => {
          // Rootノードはクリック不可
          if (node._isRoot) return;

          // 対応する会員を検索
          const member = members.find((m) => `${members.indexOf(m)}-${m.name}` === node.id);
          if (member) {
            setSelectedMember(member);
          }
        }}
      />

      {/* 会員情報吹き出し */}
      {selectedMember && (
        <MemberTooltip
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
