import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
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
  width: number;
  height: number;
}

export const Graph: React.FC<GraphProps> = ({ nodes, links, onNodeClick, onNodeDoubleClick, onNodeContextMenu, width, height }) => {
  const zoomRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<NodeData, LinkData> | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [animatedNodes, setAnimatedNodes] = useState<NodeData[]>([]);
  const [animatedLinks, setAnimatedLinks] = useState<LinkData[]>([]);
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  useEffect(() => {
    if (!zoomRef.current) return;
    const zoomBehavior = d3.zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (e) => {
        setTransform(e.transform);
      });
    
    d3.select(zoomRef.current).call(zoomBehavior);
    d3.select(zoomRef.current).on("dblclick.zoom", null);
  }, []);

  useEffect(() => {
    if (!width || !height) return;

    // Initialize or update simulation
    if (!simulationRef.current) {
      simulationRef.current = d3.forceSimulation<NodeData, LinkData>()
        .force('link', d3.forceLink<NodeData, LinkData>().id(d => d.id))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide<NodeData>().radius(d => 45 + (d.text?.length || 0) * 5).iterations(3))
        .on('tick', () => {
          setAnimatedNodes([...simulationRef.current!.nodes()]);
          // Force update links as well
          const currentLinks = simulationRef.current!.force<d3.ForceLink<NodeData, LinkData>>('link')?.links();
          if (currentLinks) {
            setAnimatedLinks([...currentLinks]);
          }
        });
    }

    const simulation = simulationRef.current;
    
    // Update center and radial forces if dimensions change
    simulation.force('center', d3.forceCenter(width / 2, height / 2));
    simulation.force('radial', null); // Remove radial force to allow organic expansion

    // Update nodes and links
    simulation.nodes(nodes);
    
    const linkForce = simulation.force<d3.ForceLink<NodeData, LinkData>>('link');
    if (linkForce) {
      // Create a new array of links with string IDs for source and target
      // This ensures d3 re-binds the links to the LATEST node objects in the simulation
      const d3Links = links.map(d => ({
        ...d,
        source: typeof d.source === 'object' ? (d.source as NodeData).id : d.source,
        target: typeof d.target === 'object' ? (d.target as NodeData).id : d.target
      }));
      
      linkForce.links(d3Links);
      
      linkForce.distance(d => {
        // Find the actual node objects if they are just IDs
        const targetNode = typeof d.target === 'object' ? d.target as NodeData : nodes.find(n => n.id === d.target);
        const sourceNode = typeof d.source === 'object' ? d.source as NodeData : nodes.find(n => n.id === d.source);
        
        if (!targetNode || !sourceNode) return 100;
        
        // If the target node is expanded (has children) or is loading, it should move away from its parent
        const baseDistance = (targetNode.isExpanded || targetNode.isLoading) ? 300 : 80;
        return baseDistance + ((sourceNode.text?.length || 0) + (targetNode.text?.length || 0)) * 5;
      });
    }

    // Reheat simulation gently so nodes don't fly too far
    simulation.alpha(0.3).restart();

    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height]);

  // Drag handlers
  const handleDragStart = (e: React.PointerEvent, node: NodeData) => {
    if (!simulationRef.current) return;
    const sim = simulationRef.current;
    sim.alphaTarget(0.1).restart();
    node.fx = node.x;
    node.fy = node.y;
  };

  const handleDrag = (e: React.PointerEvent, node: NodeData) => {
    if (!zoomRef.current) return;
    const [x, y] = d3.pointer(e.nativeEvent, zoomRef.current);
    node.fx = (x - transform.x) / transform.k;
    node.fy = (y - transform.y) / transform.k;
  };

  const handleDragEnd = (e: React.PointerEvent, node: NodeData) => {
    if (!simulationRef.current) return;
    const sim = simulationRef.current;
    sim.alphaTarget(0);
    node.fx = null;
    node.fy = null;
  };

  return (
    <div ref={zoomRef} className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing pointer-events-auto">
      <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none">
        <g transform={transform.toString()}>
          {animatedLinks.map((link, i) => {
            const source = link.source as NodeData;
            const target = link.target as NodeData;
            if (source.x === undefined || source.y === undefined || target.x === undefined || target.y === undefined) return null;
            return (
              <line
                key={`link-${i}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#e5e7eb" // gray-200
                strokeWidth={2}
                className="transition-all duration-300"
              />
            );
          })}
        </g>
      </svg>
      
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ 
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
          transformOrigin: '0 0' 
        }}
      >
        {animatedNodes.map((node) => {
          if (node.x === undefined || node.y === undefined) return null;
          
          const isSelected = node.isSelected;
          const isRoot = node.isRoot;
          
          return (
            <motion.div
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                x: node.x - 50, // Center offset (approximate width/2)
                y: node.y - 20, // Center offset (approximate height/2)
                scale: isRoot || isSelected ? 1.2 : 1,
                opacity: 1
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, mass: 0.5 }}
              className={cn(
                "absolute pointer-events-auto cursor-pointer select-none",
                "flex flex-col items-center justify-center min-w-[100px] px-4 py-2 rounded-full",
                "backdrop-blur-md border shadow-lg transition-colors duration-300",
                isSelected 
                  ? "bg-yellow-400/80 border-yellow-500 text-black shadow-yellow-400/20" 
                  : isRoot
                    ? "bg-black/80 border-black text-white"
                    : "bg-white/60 border-gray-200 text-gray-800 hover:bg-white/80"
              )}
              onClick={(e) => {
                if (e.detail === 1) {
                  clickTimeoutRef.current = setTimeout(() => {
                    onNodeClick(node);
                  }, 250);
                } else if (e.detail === 2) {
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  if (onNodeDoubleClick) onNodeDoubleClick(node);
                }
              }}
              onContextMenu={(e) => onNodeContextMenu(e, node)}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                handleDragStart(e, node);
              }}
              onPointerMove={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  handleDrag(e, node);
                }
              }}
              onPointerUp={(e) => {
                e.currentTarget.releasePointerCapture(e.pointerId);
                handleDragEnd(e, node);
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium whitespace-nowrap">{node.text}</span>
                {node.isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              </div>
              {node.translation && (
                <span className="text-[10px] opacity-80 mt-0.5 text-center max-w-[120px] break-words leading-tight">
                  {node.translation}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
