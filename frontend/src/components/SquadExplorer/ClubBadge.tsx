import React, { useState, useEffect } from "react";

interface ClubBadgeProps {
  clubName: string;
  className?: string;
}

export default function ClubBadge({ clubName, className = "w-10 h-10" }: ClubBadgeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!clubName || clubName === "Unknown") {
      setError(true);
      return;
    }

    const cleanName = clubName.replace(/\([^)]*\)/g, '').trim();
    
    // Hardcoded overrides for problematic logos (like fake PNG checkerboards)
    const overrides: Record<string, string> = {
      "Arsenal FC": "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg",
      "Arsenal": "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg",
    };

    if (overrides[cleanName]) {
       setDataUrl(overrides[cleanName]);
       return;
    }

    const logoUrl = `https://tse1.mm.bing.net/th?q=${encodeURIComponent(cleanName + ' official football club logo transparent png')}&w=150&h=150&c=7&rs=1&p=0&dpr=2&pid=1.7`;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const width = canvas.width;
      const height = canvas.height;
      const getPixel = (x: number, y: number) => {
        const i = (y * width + x) * 4;
        return [data[i], data[i+1], data[i+2]];
      };
      
      const isWhite = (x: number, y: number) => {
        const [r, g, b] = getPixel(x, y);
        // Looser threshold to catch JPEG compression halos
        return r > 210 && g > 210 && b > 210;
      };

      const visited = new Uint8Array(width * height);
      const queueX = new Int32Array(width * height);
      const queueY = new Int32Array(width * height);
      let head = 0;
      let tail = 0;

      const enqueue = (x: number, y: number) => {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = y * width + x;
          if (!visited[idx] && isWhite(x, y)) {
            visited[idx] = 1;
            queueX[tail] = x;
            queueY[tail] = y;
            tail++;
          }
        }
      };

      // Seed the edges
      for (let x = 0; x < width; x++) { enqueue(x, 0); enqueue(x, height - 1); }
      for (let y = 0; y < height; y++) { enqueue(0, y); enqueue(width - 1, y); }

      // BFS to clear contiguous background
      while (head < tail) {
        const x = queueX[head];
        const y = queueY[head];
        head++;
        
        const i = (y * width + x) * 4;
        data[i + 3] = 0; // Set alpha to 0
        
        enqueue(x + 1, y);
        enqueue(x - 1, y);
        enqueue(x, y + 1);
        enqueue(x, y - 1);
      }
      
      ctx.putImageData(imgData, 0, 0);
      setDataUrl(canvas.toDataURL("image/png"));
    };
    img.onerror = () => setError(true);
    img.src = logoUrl;
  }, [clubName]);

  if (error || (!dataUrl && clubName === "Unknown")) {
    const cleanName = clubName ? clubName.replace(/\([^)]*\)/g, '').trim() : "?";
    return (
      <div className={`relative shrink-0 flex items-center justify-center bg-white/5 rounded-full overflow-hidden shadow-lg ${className}`}>
         <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=random&color=fff&rounded=true&bold=true`} className="w-full h-full" alt="Fallback" />
      </div>
    );
  }

  if (!dataUrl) {
    return <div className={`rounded-full bg-white/5 animate-pulse shrink-0 ${className}`}></div>;
  }

  return (
    <div className={`relative shrink-0 flex items-center justify-center drop-shadow-2xl ${className}`}>
      <img 
        src={dataUrl} 
        alt={`${clubName} badge`} 
        className="w-[120%] h-[120%] object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]" 
      />
    </div>
  );
}
