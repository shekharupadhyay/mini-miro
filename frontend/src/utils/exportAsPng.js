import html2canvas from "html2canvas";

/**
 * Returns an exportAsPng() function with no React state dependencies.
 */
export async function exportAsPng(boardId, notes, shapes) {
    const items = [...notes, ...shapes];
    if (items.length === 0) {
      alert("Nothing on the board to export!");
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach((it) => {
      const x = it.x ?? 0, y = it.y ?? 0;
      const w = it.w ?? 160, h = it.h ?? 120;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    });

    const pad = 60;
    minX -= pad; minY -= pad;
    maxX += pad; maxY += pad;
    const contentW = maxX - minX;
    const contentH = maxY - minY;

    const worldEl = document.querySelector(".board-world");
    if (!worldEl) return;

    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed; left: -99999px; top: 0;
      width: ${contentW}px; height: ${contentH}px;
      overflow: visible; background: #ffffff;
    `;
    const clone = worldEl.cloneNode(true);
    clone.style.cssText = `
      position: absolute; left: 0; top: 0;
      transform: translate(${-minX}px, ${-minY}px) scale(1);
      transform-origin: 0 0;
      width: 1px; height: 1px;
    `;
    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        width: contentW,
        height: contentH,
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `miniMiro-${boardId}.png`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("[Export] Failed:", err);
      alert("Export failed — see console for details.");
    } finally {
      document.body.removeChild(container);
    }
  
}