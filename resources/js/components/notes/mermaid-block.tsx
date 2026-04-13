import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    securityLevel: 'loose',
});

interface MermaidProps {
    chart: string;
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && chart) {
            try {
                mermaid.render('mermaid-graph-' + Date.now(), chart, (svgCode) => {
                    if (containerRef.current) {
                        containerRef.current.innerHTML = svgCode;
                    }
                });
            } catch (e) {
                console.error("Mermaid render error:", e);
                if (containerRef.current) {
                    containerRef.current.innerHTML = 'Error rendering diagram';
                }
            }
        }
    }, [chart]);

    return <div ref={containerRef} className="mermaid-container p-4 bg-gray-100 rounded"/>;
};

export default Mermaid;
