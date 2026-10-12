import { VerificationResponse, ClaimResult } from "./api";

/**
 * Renders a high-resolution, polished shareable fact card PNG using HTML5 Canvas.
 * Reflects genuine verification results, verdicts, and sources.
 */
export async function downloadFactCardPng(
  report: VerificationResponse,
  claim?: ClaimResult
): Promise<void> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Hi-DPI settings (1200 x 675, standard 16:9 social share ratio)
  const width = 1200;
  const height = 675;
  canvas.width = width;
  canvas.height = height;

  const targetClaim = claim || report.claims[0];
  const verdict = targetClaim?.verdict || "CANNOT_CONFIRM";

  // Palette colors based on verdict
  let verdictColor = "#0F382E";
  let verdictBg = "#ECFDF5";
  let verdictLabel = "CANNOT CONFIRM";

  if (verdict === "VERIFIED") {
    verdictColor = "#15803D";
    verdictBg = "#DCFCE7";
    verdictLabel = "VERIFIED TRUE";
  } else if (verdict === "FALSE") {
    verdictColor = "#B91C1C";
    verdictBg = "#FEE2E2";
    verdictLabel = "FALSE / DEBUNKED";
  } else if (verdict === "PARTIALLY_SUPPORTED") {
    verdictColor = "#B45309";
    verdictBg = "#FEF3C7";
    verdictLabel = "PARTIALLY SUPPORTED";
  } else if (verdict === "OUTDATED") {
    verdictColor = "#4338CA";
    verdictBg = "#EEF2FF";
    verdictLabel = "OUTDATED CONTEXT";
  }

  // 1. Background
  ctx.fillStyle = "#FAF8F5";
  ctx.fillRect(0, 0, width, height);

  // Subtle border
  ctx.strokeStyle = "#E7E2D6";
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  // 2. Header Banner
  ctx.fillStyle = "#0F382E";
  ctx.fillRect(40, 40, width - 80, 75);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("SACHAI  •  OFFICIAL FACT-CHECK CARD", 70, 87);

  ctx.font = "normal 16px sans-serif";
  ctx.fillStyle = "#A7F3D0";
  ctx.fillText("Verify before you forward", width - 310, 87);

  // 3. Verdict Badge
  const badgeWidth = 320;
  const badgeHeight = 50;
  ctx.fillStyle = verdictBg;
  roundRect(ctx, 70, 145, badgeWidth, badgeHeight, 14);
  ctx.fill();
  ctx.strokeStyle = verdictColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = verdictColor;
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(verdictLabel, 95, 178);

  // 4. Claim Text Box
  ctx.fillStyle = "#1E2621";
  ctx.font = "bold 26px sans-serif";
  const claimText = targetClaim ? `"${targetClaim.claim_text}"` : report.overall_summary;
  wrapText(ctx, claimText, 70, 240, width - 140, 36, 3);

  // 5. Plain Explanation Box
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, 70, 360, width - 140, 180, 16);
  ctx.fill();
  ctx.strokeStyle = "#E8E4DC";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#0F382E";
  ctx.font = "bold 17px sans-serif";
  ctx.fillText("FINDING SUMMARY & EVIDENCE BASIS:", 95, 395);

  ctx.fillStyle = "#4B5563";
  ctx.font = "normal 18px sans-serif";
  const explanation = targetClaim ? targetClaim.explanation : report.overall_summary;
  wrapText(ctx, explanation, 95, 430, width - 190, 28, 4);

  // 6. Source Attribution & Footer
  ctx.fillStyle = "#6B7280";
  ctx.font = "normal 14px sans-serif";
  const sourcesText = targetClaim && targetClaim.sources.length > 0
    ? `Sources: ${targetClaim.sources.map((s) => s.domain).slice(0, 3).join(", ")}`
    : "Verified using multi-source index";
  ctx.fillText(sourcesText, 70, 585);

  ctx.fillStyle = "#9CA3AF";
  ctx.font = "normal 13px sans-serif";
  ctx.fillText(
    `Report ID: ${report.id}  •  ${new Date().toLocaleDateString()}  •  sachai.vercel.app`,
    width - 450,
    585
  );

  // Download Trigger
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sachai-fact-check-${report.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, "image/png");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(" ");
  let line = "";
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
      lineCount++;
      if (lineCount >= maxLines - 1 && n < words.length - 1) {
        ctx.fillText(line.trim() + "...", x, y);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}
