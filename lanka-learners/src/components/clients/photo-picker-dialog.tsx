"use client";

import {
  CameraIcon,
  ChevronLeftIcon,
  ImagePlusIcon,
  LoaderIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SwitchCameraIcon,
  UploadIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type View = "choose" | "camera" | "preview";
type Facing = "user" | "environment";

/**
 * "Add image" button that opens a dialog offering two sources: a file from the
 * device, or a photo captured live from the camera. Either way the chosen
 * image is handed to `onSelect` as a File, so the caller uploads both the same.
 */
export function PhotoPickerDialog({
  hasPhoto,
  disabled,
  onSelect,
}: {
  hasPhoto: boolean;
  disabled?: boolean;
  onSelect: (file: File) => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("choose");
  const [facing, setFacing] = useState<Facing>("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [captured, setCaptured] = useState<{ url: string; blob: Blob } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  // Bumped on every start/stop so a slow getUserMedia that resolves after the
  // user moved on is discarded instead of leaving the camera on.
  const requestRef = useRef(0);

  const stopCamera = useCallback(() => {
    requestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const clearCaptured = useCallback(() => {
    setCaptured((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

  const startCamera = useCallback(
    async (mode: Facing) => {
      stopCamera();
      const requestId = requestRef.current;
      setCameraError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "This browser cannot open the camera. Use a secure (https) connection or upload a photo instead."
        );
        return;
      }

      setStarting(true);
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        });
        if (requestId !== requestRef.current) {
          next.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = next;
        setStream(next);

        const devices = await navigator.mediaDevices.enumerateDevices();
        setHasMultipleCameras(
          devices.filter((device) => device.kind === "videoinput").length > 1
        );
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        setCameraError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in your browser settings and try again."
            : name === "NotFoundError"
              ? "No camera was found on this device."
              : "The camera could not be started. It may be in use by another app."
        );
      } finally {
        setStarting(false);
      }
    },
    [stopCamera]
  );

  // Attach the live stream to the <video> once both exist.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) void video.play().catch(() => undefined);
  }, [stream, view]);

  function openCamera() {
    setView("camera");
    void startCamera(facing);
  }

  function switchCamera() {
    const next: Facing = facing === "user" ? "environment" : "user";
    setFacing(next);
    void startCamera(next);
  }

  // Release the camera if the component unmounts mid-capture.
  useEffect(() => () => stopCamera(), [stopCamera]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      stopCamera();
      clearCaptured();
      setCameraError(null);
      setView("choose");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    // Square centre crop — profile photos are displayed square.
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return;

    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    if (facing === "user") {
      // Match the mirrored preview so the saved photo looks as it did on screen.
      context.translate(size, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        clearCaptured();
        setCaptured({ url: URL.createObjectURL(blob), blob });
        stopCamera();
        setView("preview");
      },
      "image/jpeg",
      0.9
    );
  }

  function confirmCapture() {
    if (!captured) return;
    const file = new File([captured.blob], `camera-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    onSelect(file);
    handleOpenChange(false);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    onSelect(file);
    handleOpenChange(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <ImagePlusIcon className="size-3" />
        {hasPhoto ? "Change image" : "Add image"}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {view === "choose"
                ? "Add profile photo"
                : view === "camera"
                  ? "Take a photo"
                  : "Use this photo?"}
            </DialogTitle>
            <DialogDescription>
              {view === "choose"
                ? "Upload an existing image or take a new photo with the camera."
                : view === "camera"
                  ? "Centre the learner's face in the frame, then capture."
                  : "Retake if the photo is blurry or the face is not clear."}
            </DialogDescription>
          </DialogHeader>

          {view === "choose" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center transition-colors outline-none hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
                  <UploadIcon className="size-5" />
                </span>
                <span>
                  <span className="block font-medium">Upload photo</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    JPEG, PNG or WebP · max 5 MB
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={openCamera}
                className="group flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center transition-colors outline-none hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
                  <CameraIcon className="size-5" />
                </span>
                <span>
                  <span className="block font-medium">Take photo</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Use this device&apos;s camera
                  </span>
                </span>
              </button>
            </div>
          ) : null}

          {view === "camera" ? (
            <div className="space-y-3">
              <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`size-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
                />

                {/* Face guide */}
                {!cameraError ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-3/5 w-1/2 rounded-[50%] border-2 border-dashed border-white/60" />
                  </div>
                ) : null}

                {starting ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
                    <LoaderIcon className="size-6 animate-spin" />
                    <span className="text-xs">Starting camera…</span>
                  </div>
                ) : null}

                {cameraError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white/90">
                    <CameraIcon className="size-8 text-white/50" />
                    <p>{cameraError}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void startCamera(facing)}
                    >
                      <RefreshCwIcon className="size-3.5" />
                      Try again
                    </Button>
                  </div>
                ) : null}

                {hasMultipleCameras && !cameraError ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    aria-label="Switch camera"
                    className="absolute top-2 right-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={switchCamera}
                  >
                    <SwitchCameraIcon className="size-4" />
                  </Button>
                ) : null}
              </div>

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  aria-label="Capture photo"
                  disabled={starting || Boolean(cameraError)}
                  onClick={capture}
                  className="flex size-16 items-center justify-center rounded-full border-4 border-primary/30 bg-primary text-primary-foreground shadow-md transition-transform outline-none hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                >
                  <CameraIcon className="size-6" />
                </button>
              </div>
            </div>
          ) : null}

          {view === "preview" && captured ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={captured.url}
              alt="Captured photo preview"
              className="mx-auto aspect-square w-full max-w-sm rounded-xl object-cover"
            />
          ) : null}

          {view !== "choose" ? (
            <DialogFooter>
              {view === "camera" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    stopCamera();
                    setView("choose");
                  }}
                >
                  <ChevronLeftIcon className="size-4" />
                  Back
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      clearCaptured();
                      openCamera();
                    }}
                  >
                    <RotateCcwIcon className="size-4" />
                    Retake
                  </Button>
                  <Button type="button" onClick={confirmCapture}>
                    Use photo
                  </Button>
                </>
              )}
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
