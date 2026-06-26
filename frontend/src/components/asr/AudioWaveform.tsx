"use client";

import { useEffect, useRef } from "react";

export default function AudioWaveform({ stream, active }: { stream: MediaStream | null; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!stream || !active || !canvasRef.current) return;

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = "#1a1a1a";
      canvasCtx.fillRect(0, 0, W, H);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = "#22c55e";
      canvasCtx.beginPath();

      const sliceWidth = W / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * H) / 2;
        if (i === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);
        x += sliceWidth;
      }
      canvasCtx.lineTo(W, H / 2);
      canvasCtx.stroke();
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      ctx.close();
    };
  }, [stream, active]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={60}
      className="w-full h-12 rounded bg-gray-900"
    />
  );
}
