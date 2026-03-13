import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { NodeData, LinkData } from '../types';
import { Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GraphProps {
  nodes: NodeData[];
  links: LinkData[];
  onNodeClick: (node: NodeData) => void;
  onNodeDoubleClick?: (node: NodeData) => void;
  onNodeContextMenu: (e: React.MouseEvent, node: NodeData) => void;
  onDeleteNode?: (node: NodeData) => void;
  width: number;
  height: number;
}

interface SimNode extends NodeData {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimLink {
  source: SimNode;
  target: SimNode;
}

export const Graph: React.FC<GraphProps> = ({
  nodes,
  links,
  onNodeClick,
  onNodeDoubleClick,
  onNodeContextMenu,
  width,
  height,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, undefined> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const rafRef = useRef<number>(0);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  // Track new node IDs for entrance animation
  const knownNodeIds = useRef<Set<string>>(new Set());
  const [, forceRender] = useState(0);

  // Direct DOM update for max performance — bypasses React render cycle
  const updateDOM = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const t = transformRef.current;
    const mainGroup = svg.querySelector('.main-group') as SVGGElement;
    if (mainGroup) {
      mainGroup.setAttribute('transform', `translate(${t.x},${t.y}) scale(${t.k})`);
    }

    // Update links
    const linkElements = svg.querySelectorAll('.link-line');
    const simLinks = linksRef.current;
    linkElements.forEach((el, i) => {
      if (i < simLinks.length) {
        const link = simLinks[i];
        const sx = link.source.x;
        const sy = link.source.y;
        const tx = link.target.x;
        const ty = link.target.y;
        // Curved line using quadratic bezier
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2;
        const dx = tx - sx;
        const dy = ty - sy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Subtle curve offset
        const offset = Math.min(dist * 0.1, 20);
        const cx = mx - (dy / dist) * offset;
        const cy = my + (dx / dist) * offset;
        el.setAttribute('d', `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`);
      }
    });

    // Update node positions
    const nodeGroups = svg.querySelectorAll('.node-group');
    const simNodes = nodesRef.current;
    nodeGroups.forEach((el, i) => {
      if (i < simNodes.length) {
        const node = simNodes[i];
        el.setAttribute('transform', `translate(${node.x}, ${node.y})`);
      }
    });
  }, []);

  // Initialize zoom
  useEffect(() => {
    if (!svgRef.current) return;

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .filter((event) => {
        // Allow zoom on wheel, and pan on mouse drag (not on nodes)
        if (event.type === 'wheel') return true;
        if (event.type === 'mousedown' || event.type === 'touchstart') {
          // Only allow pan if not clicking on a node
          const target = event.target as Element;
          if (target.closest('.node-group')) return false;
          return true;
        }
        return true;
      })
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        updateDOM();
      });

    zoomBehaviorRef.current = zoomBehavior;
    d3.select(svgRef.current).call(zoomBehavior);
    d3.select(svgRef.current).on('dblclick.zoom', null);

    return () => {
      d3.select(svgRef.current!).on('.zoom', null);
    };
  }, [updateDOM]);

  // Main simulation effect
  useEffect(() => {
    if (!width || !height) return;

    // Build sim nodes: reuse existing positions if possible
    const oldNodesMap = new Map<string, SimNode>();
    nodesRef.current.forEach((n) => oldNodesMap.set(n.id, n));

    const simNodes: SimNode[] = nodes.map((n) => {
      const existing = oldNodesMap.get(n.id);
      if (existing) {
        // Merge updated props into existing simulation node (keep position)
        return {
          ...existing,
          ...n,
          x: existing.x,
          y: existing.y,
          vx: existing.vx,
          vy: existing.vy,
          fx: existing.fx,
          fy: existing.fy,
        };
      }
      // New node — find its parent from links so it spawns near the parent
      const parentLink = links.find(
        (l) =>
          (typeof l.target === 'string' ? l.target : (l.target as NodeData).id) === n.id
      );
      let startX = n.x ?? width / 2;
      let startY = n.y ?? height / 2;
      if (parentLink) {
        const parentId =
          typeof parentLink.source === 'string'
            ? parentLink.source
            : (parentLink.source as NodeData).id;
        const parentNode = oldNodesMap.get(parentId);
        if (parentNode) {
          // Spawn near parent with slight random offset for organic spread
          const angle = Math.random() * Math.PI * 2;
          const dist = 30 + Math.random() * 20;
          startX = parentNode.x + Math.cos(angle) * dist;
          startY = parentNode.y + Math.sin(angle) * dist;
        }
      }
      return {
        ...n,
        x: startX,
        y: startY,
      } as SimNode;
    });

    // Build sim links (d3 will resolve string IDs to node objects)
    const simLinkData = links.map((l) => ({
      source: typeof l.source === 'string' ? l.source : (l.source as NodeData).id,
      target: typeof l.target === 'string' ? l.target : (l.target as NodeData).id,
    }));

    nodesRef.current = simNodes;

    // Track new nodes for animation
    const hasNewNodes = simNodes.some((n) => !knownNodeIds.current.has(n.id));
    simNodes.forEach((n) => {
      knownNodeIds.current.add(n.id);
    });

    // Reuse existing simulation if possible to avoid jarring reset
    if (simulationRef.current) {
      const simulation = simulationRef.current;
      
      // Update nodes
      simulation.nodes(simNodes);
      
      // Update links
      const linkForce = simulation.force<d3.ForceLink<SimNode, any>>('link');
      if (linkForce) {
        linkForce.links(simLinkData);
      }
      
      // Update center
      simulation.force('center', d3.forceCenter(width / 2, height / 2).strength(0.03));
      
      // Gentle reheat — only enough to settle new nodes, not displace existing ones
      if (hasNewNodes) {
        simulation.alpha(0.15).restart();
      } else {
        simulation.alpha(0.05).restart();
      }
    } else {
      // First-time creation
      const simulation = d3
        .forceSimulation<SimNode>(simNodes)
        .force(
          'link',
          d3
            .forceLink<SimNode, any>(simLinkData)
            .id((d: any) => d.id)
            .distance((d: any) => {
              const target = d.target as SimNode;
              const source = d.source as SimNode;
              if (!target || !source) return 120;
              const baseDistance =
                target.isExpanded || target.isLoading ? 250 : 120;
              return (
                baseDistance +
                ((source.text?.length || 0) + (target.text?.length || 0)) * 2.5
              );
            })
            .strength(0.8)
        )
        .force('charge', d3.forceManyBody().strength(-280).distanceMax(400))
        .force('center', d3.forceCenter(width / 2, height / 2).strength(0.03))
        .force(
          'collide',
          d3
            .forceCollide<SimNode>()
            .radius((d) => 50 + (d.text?.length || 0) * 3.5)
            .iterations(2)
        )
        .alphaDecay(0.03)
        .velocityDecay(0.4)
        .on('tick', () => {
          // Update link refs from the simulation's resolved links
          const linkForce = simulation.force<d3.ForceLink<SimNode, any>>('link');
          if (linkForce) {
            const newLinks = linkForce.links() as unknown as SimLink[];
            // If link count changed, force React re-render to update SVG structure
            if (newLinks.length !== linksRef.current.length) {
              linksRef.current = newLinks;
              forceRender((c) => c + 1);
            } else {
              linksRef.current = newLinks;
            }
          }
          updateDOM();
        });

      simulationRef.current = simulation;
      simulation.alpha(0.4).restart();
    }

    // Force a React render to update the SVG structure for new/removed nodes
    forceRender((c) => c + 1);

    // Don't stop simulation on cleanup — we reuse it
  }, [nodes, links, width, height, updateDOM]);

  // Node drag handlers
  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, node: SimNode) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);

      dragStartPos.current = { x: e.clientX, y: e.clientY };
      isDragging.current = false;

      const sim = simulationRef.current;
      if (sim) {
        sim.alphaTarget(0.1).restart();
      }
      node.fx = node.x;
      node.fy = node.y;
    },
    []
  );

  const handleNodePointerMove = useCallback(
    (e: React.PointerEvent, node: SimNode) => {
      if (!dragStartPos.current) return;
      if (!(e.target as Element).hasPointerCapture(e.pointerId)) return;

      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        isDragging.current = true;
      }

      const t = transformRef.current;
      // Convert screen coords to graph coords
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const graphX = (e.clientX - svgRect.left - t.x) / t.k;
      const graphY = (e.clientY - svgRect.top - t.y) / t.k;

      node.fx = graphX;
      node.fy = graphY;
    },
    []
  );

  const handleNodePointerUp = useCallback(
    (e: React.PointerEvent, node: SimNode) => {
      (e.target as Element).releasePointerCapture(e.pointerId);
      const sim = simulationRef.current;
      if (sim) {
        sim.alphaTarget(0);
      }
      node.fx = null;
      node.fy = null;

      if (!isDragging.current) {
        // It was a click, not a drag
        if (e.detail >= 2 || (e as any)._isDoubleClick) {
          // Double click
          if (onNodeDoubleClick) onNodeDoubleClick(node);
        } else {
          onNodeClick(node);
        }
      }

      dragStartPos.current = null;
      isDragging.current = false;
    },
    [onNodeClick, onNodeDoubleClick]
  );

  // Double-click detection using separate handler
  const lastClickTime = useRef<Map<string, number>>(new Map());
  const handleNodeClickDetect = useCallback(
    (e: React.MouseEvent, node: SimNode) => {
      e.stopPropagation();
      e.preventDefault();
    },
    []
  );

  const handleNodeDblClick = useCallback(
    (e: React.MouseEvent, node: SimNode) => {
      e.stopPropagation();
      e.preventDefault();
      if (onNodeDoubleClick && !isDragging.current) {
        onNodeDoubleClick(node);
      }
    },
    [onNodeDoubleClick]
  );

  const simNodes = nodesRef.current;
  const simLinks = linksRef.current;

  // Estimate node dimensions for proper centering
  const getNodeWidth = (text: string) => {
    const charCount = text.length;
    // Rough estimate: each CJK char ~16px, latin ~9px, padding 32px
    const avgCharWidth = /[\u4e00-\u9fff]/.test(text) ? 16 : 9;
    return Math.max(80, charCount * avgCharWidth + 40);
  };

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: 'grab' }}
      >
        <defs>
          {/* Gradient for links */}
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d1d5db" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#9ca3af" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#d1d5db" stopOpacity="0.6" />
          </linearGradient>
          {/* Glow filter for selected nodes */}
          <filter id="selectedGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#facc15" floodOpacity="0.4" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Shadow filter */}
          <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.08" />
          </filter>
        </defs>

        <g className="main-group">
          {/* Links */}
          {simLinks.map((link, i) => {
            const source = link.source;
            const target = link.target;
            if (!source || !target) return null;

            return (
              <path
                key={`link-${source.id || i}-${target.id || i}`}
                className="link-line"
                d={`M ${source.x || 0} ${source.y || 0} L ${target.x || 0} ${target.y || 0}`}
                fill="none"
                stroke="url(#linkGradient)"
                strokeWidth={1.5}
                strokeLinecap="round"
                opacity={0.7}
              />
            );
          })}

          {/* Nodes */}
          {simNodes.map((node) => {
            if (node.x === undefined || node.y === undefined) return null;

            const isSelected = node.isSelected;
            const isRoot = node.isRoot;
            const nodeW = getNodeWidth(node.text);
            const nodeH = node.translation ? 52 : 36;
            const scale = isRoot || isSelected ? 1.1 : 1;

            return (
              <g
                key={node.id}
                className="node-group"
                transform={`translate(${node.x}, ${node.y})`}
                style={{ cursor: 'pointer' }}
                onPointerDown={(e) => handleNodePointerDown(e, node)}
                onPointerMove={(e) => handleNodePointerMove(e, node)}
                onPointerUp={(e) => handleNodePointerUp(e, node)}
                onDoubleClick={(e) => handleNodeDblClick(e, node)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNodeContextMenu(e, node);
                }}
              >
                <g transform={`scale(${scale})`}>
                  {/* Node background */}
                  <rect
                    x={-nodeW / 2}
                    y={-nodeH / 2}
                    width={nodeW}
                    height={nodeH}
                    rx={nodeH / 2}
                    ry={nodeH / 2}
                    fill={
                      isSelected
                        ? 'rgba(250, 204, 21, 0.85)'
                        : isRoot
                        ? 'rgba(0, 0, 0, 0.85)'
                        : 'rgba(255, 255, 255, 0.75)'
                    }
                    stroke={
                      isSelected
                        ? '#eab308'
                        : isRoot
                        ? '#000'
                        : '#e5e7eb'
                    }
                    strokeWidth={isSelected ? 2 : 1}
                    filter={isSelected ? 'url(#selectedGlow)' : 'url(#nodeShadow)'}
                    style={{ backdropFilter: 'blur(12px)' }}
                  />
                  {/* Selection ring animation */}
                  {isSelected && (
                    <rect
                      x={-nodeW / 2 - 3}
                      y={-nodeH / 2 - 3}
                      width={nodeW + 6}
                      height={nodeH + 6}
                      rx={(nodeH + 6) / 2}
                      ry={(nodeH + 6) / 2}
                      fill="none"
                      stroke="#facc15"
                      strokeWidth={1.5}
                      opacity={0.5}
                    >
                      <animate
                        attributeName="opacity"
                        values="0.5;0.2;0.5"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </rect>
                  )}
                  {/* Node text */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    y={node.translation ? -8 : 0}
                    fill={
                      isSelected
                        ? '#000'
                        : isRoot
                        ? '#fff'
                        : '#1f2937'
                    }
                    fontSize={14}
                    fontWeight={isRoot ? 600 : 500}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {node.text}
                  </text>
                  {/* Translation text */}
                  {node.translation && (
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      y={10}
                      fill={
                        isSelected
                          ? 'rgba(0,0,0,0.7)'
                          : isRoot
                          ? 'rgba(255,255,255,0.7)'
                          : 'rgba(107,114,128,0.9)'
                      }
                      fontSize={10}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >
                      {node.translation}
                    </text>
                  )}
                  {/* Loading indicator */}
                  {node.isLoading && (
                    <g transform={`translate(${nodeW / 2 - 14}, ${-6})`}>
                      <circle
                        cx="6"
                        cy="6"
                        r="5"
                        fill="none"
                        stroke={isRoot ? '#fff' : '#9ca3af'}
                        strokeWidth="2"
                        strokeDasharray="20"
                        strokeLinecap="round"
                      >
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0 6 6"
                          to="360 6 6"
                          dur="1s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </g>
                  )}
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
