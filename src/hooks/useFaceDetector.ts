/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import { AppStatus } from "../types";

export interface FaceDetectorResult {
  leftEAR: number;
  rightEAR: number;
  faceDetected: boolean;
}

export function useFaceDetector() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const lastResultRef = useRef<FaceDetectorResult>({
    leftEAR: 0,
    rightEAR: 0,
    faceDetected: false
  });

  // Load FaceLandmarker from CDN binaries
  useEffect(() => {
    let active = true;

    async function initDetector() {
      try {
        setStatus(AppStatus.LOADING);
        
        // Use standard resolver pointing to CDN
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );

        if (!active) return;

        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 1
        });

        if (!active) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setStatus(AppStatus.READY);
      } catch (err: any) {
        console.error("Failed to initialize FaceLandmarker:", err);
        if (active) {
          setErrorMsg("Could not load eye-tracking engine. Please check your internet connection.");
          setStatus(AppStatus.ERROR);
        }
      }
    }

    initDetector();

    return () => {
      active = false;
      stopCamera();
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setFaceDetected(false);
    lastResultRef.current = { leftEAR: 0, rightEAR: 0, faceDetected: false };
  }, []);

  const startCamera = useCallback(async () => {
    if (!landmarkerRef.current) {
      setErrorMsg("Eye tracking engine is not ready yet.");
      return;
    }

    try {
      stopCamera();
      setErrorMsg(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setStatus(AppStatus.MONITORING);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setErrorMsg("Camera access denied or webcam not available. Please allow camera permissions to use the eye monitor.");
      setStatus(AppStatus.ERROR);
    }
  }, [stopCamera]);

  const getDistance = (p1: { x: number; y: number; z: number }, p2: { x: number; y: number; z: number }) => {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) + 
      Math.pow(p1.y - p2.y, 2) + 
      Math.pow(p1.z - p2.z, 2)
    );
  };

  // The 60 FPS drawing and parsing loop
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    const canvas = canvasRef.current;

    if (!video || !landmarker || video.paused || video.ended) {
      animationFrameIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas?.getContext("2d");
    if (canvas && video.videoWidth && video.videoHeight) {
      // Keep canvas matching the video aspect ratio
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
    }

    try {
      const results = landmarker.detectForVideo(video, performance.now());
      
      if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
        if (!faceDetected) setFaceDetected(true);

        const landmarks = results.faceLandmarks[0];

        // 1. Calculate EAR
        // Left Eye: Top (159), Bottom (145), Outer (33), Inner (133)
        const dVerticalLeft = getDistance(landmarks[159], landmarks[145]);
        const dHorizontalLeft = getDistance(landmarks[33], landmarks[133]);
        const leftEAR = dVerticalLeft / (dHorizontalLeft || 1.0);

        // Right Eye: Top (386), Bottom (374), Inner (362), Outer (263)
        const dVerticalRight = getDistance(landmarks[386], landmarks[374]);
        const dHorizontalRight = getDistance(landmarks[362], landmarks[263]);
        const rightEAR = dVerticalRight / (dHorizontalRight || 1.0);

        lastResultRef.current = {
          leftEAR,
          rightEAR,
          faceDetected: true
        };

        // 2. Beautiful Canvas overlays for telemetry representation (with clean spacing/design)
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Standardize drawing styles
          ctx.lineWidth = 2;

          // Draw Eye nodes highlights (Green/Red depending on openness)
          const drawEyeNodes = (indices: number[], ear: number) => {
            const isOpen = ear > 0.18; // generic visual guide
            ctx.fillStyle = isOpen ? "rgba(34, 197, 94, 0.7)" : "rgba(239, 68, 68, 0.9)";
            ctx.strokeStyle = isOpen ? "rgba(34, 197, 94, 0.9)" : "rgba(239, 68, 68, 1.0)";

            ctx.beginPath();
            indices.forEach((idx, i) => {
              const pt = landmarks[idx];
              const x = pt.x * canvas.width;
              const y = pt.y * canvas.height;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Draw center focal point
            const centerIdx = indices[0]; // just anchor center
            const cx = landmarks[centerIdx].x * canvas.width;
            const cy = landmarks[centerIdx].y * canvas.height;
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
          };

          // Eye landmarks sets
          // Represent boundaries
          const leftEyeIndices = [33, 159, 133, 145];
          const rightEyeIndices = [362, 386, 263, 374];

          drawEyeNodes(leftEyeIndices, leftEAR);
          drawEyeNodes(rightEyeIndices, rightEAR);

          // Draw stylized face oval wireframe (subtle grey lines just for alignment guidance)
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.beginPath();
          // Profile points path (forehead, chin, cheeks)
          const faceOutlineIndices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
          faceOutlineIndices.forEach((idx, i) => {
            const pt = landmarks[idx];
            if (pt) {
              const x = pt.x * canvas.width;
              const y = pt.y * canvas.height;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
          });
          ctx.closePath();
          ctx.stroke();
        }
      } else {
        if (faceDetected) setFaceDetected(false);
        lastResultRef.current = {
          leftEAR: 0,
          rightEAR: 0,
          faceDetected: false
        };

        if (ctx && canvas) {
          // Semi transparent overlay if no face
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    } catch (e) {
      console.error("Frame detection issue:", e);
    }

    animationFrameIdRef.current = requestAnimationFrame(processFrame);
  }, [faceDetected]);

  // Handle continuous video play triggers
  useEffect(() => {
    if (status === AppStatus.MONITORING) {
      animationFrameIdRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [status, processFrame]);

  return {
    status,
    setStatus,
    errorMsg,
    setErrorMsg,
    faceDetected,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    lastResultRef
  };
}
