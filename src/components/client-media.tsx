"use client";
/* eslint-disable @next/next/no-img-element -- Private signed R2 URLs bypass the image optimizer. */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { MEDIA_LIMITS, MEDIA_TYPES } from "@/lib/media-constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Item = {
  id: string;
  filename: string;
  mediaType: "IMAGE" | "VIDEO";
  caption: string | null;
  createdAt: string;
  mediaDate: string | null;
  url?: string;
  missing?: boolean;
};

async function json<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Media request failed.");
  return body as T;
}

function putDirect(
  url: string,
  file: File,
  mimeType: string,
  progress: (value: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", mimeType);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        progress(Math.round((100 * event.loaded) / event.total));
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(
            new Error(
              request.status === 403
                ? "Upload authorization expired. Select the file again."
                : "Upload to storage failed. Try again.",
            ),
          );
    request.onerror = () =>
      reject(
        new Error(
          "Upload to storage failed. Check your connection and try again.",
        ),
      );
    request.send(file);
  });
}

export function ClientMedia({
  clientId,
  date,
  timezone = "UTC",
  title = "Media",
}: {
  clientId: string;
  date?: string;
  timezone?: string;
  title?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [mediaDate, setMediaDate] = useState(
    date ?? formatInTimeZone(new Date(), timezone, "yyyy-MM-dd"),
  );
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const records = await json<Item[]>(
        `/api/media?clientId=${encodeURIComponent(clientId)}${date ? `&date=${encodeURIComponent(date)}` : ""}`,
      );
      const withUrls = await Promise.all(
        records.map(async (record) => {
          try {
            const result = await json<{ url: string }>(
              `/api/media/${record.id}/view`,
            );
            return { ...record, url: result.url };
          } catch {
            return { ...record, missing: true };
          }
        }),
      );
      setItems(withUrls);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load media.",
      );
    } finally {
      setLoading(false);
    }
  }, [clientId, date]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file || busy) return;
    const mimeType =
      file.type ||
      (
        {
          mov: "video/quicktime",
          mp4: "video/mp4",
          webm: "video/webm",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
        } as Record<string, string>
      )[file.name.split(".").pop()?.toLowerCase() ?? ""];
    const spec = MEDIA_TYPES[mimeType as keyof typeof MEDIA_TYPES];
    if (!spec) {
      setMessage("Choose a JPEG, PNG, WebP, MP4, MOV, or WebM file.");
      return;
    }
    if (file.size > MEDIA_LIMITS[spec.type]) {
      setMessage("File is too large.");
      return;
    }
    setBusy(true);
    setProgress(0);
    setMessage("Uploading...");
    try {
      const start = await json<{ uploadUrl: string; ticket: string }>(
        "/api/media/init",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            filename: file.name,
            mimeType,
            mediaType: spec.type,
            byteSize: file.size,
            caption,
            mediaDate,
          }),
        },
      );
      await putDirect(start.uploadUrl, file, mimeType, setProgress);
      await json("/api/media/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: start.ticket }),
      });
      setFile(null);
      setCaption("");
      setMessage("Upload complete.");
      await refresh();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy || !window.confirm("Delete this media?")) return;
    setBusy(true);
    setMessage("");
    try {
      await json(`/api/media/${id}`, { method: "DELETE" });
      setItems((current) => current.filter((item) => item.id !== id));
      router.refresh();
      setMessage("Media deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={upload} className="space-y-3">
          <p className="text-sm font-medium">Add photo or video</p>
          <div className="space-y-1">
            <Label htmlFor={`media-file-${clientId}`}>
              Photo or short video
            </Label>
            <Input
              id={`media-file-${clientId}`}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.mov"
              disabled={busy}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setMessage("");
              }}
            />
          </div>
          {file ? (
            <p className="text-muted-foreground text-sm">
              Selected: {file.name}
            </p>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor={`media-date-${clientId}`}>Associated date</Label>
            <Input
              id={`media-date-${clientId}`}
              type="date"
              value={mediaDate}
              required
              disabled={busy}
              onChange={(event) => setMediaDate(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`media-caption-${clientId}`}>
              Caption (optional)
            </Label>
            <Input
              id={`media-caption-${clientId}`}
              value={caption}
              maxLength={MEDIA_LIMITS.caption}
              disabled={busy}
              onChange={(event) => setCaption(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={!file || busy}>
            {busy ? `Uploading ${progress}%` : "Upload media"}
          </Button>
          {message ? (
            <p role="status" className="text-sm">
              {message}
            </p>
          ) : null}
        </form>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading media...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No media uploaded yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="space-y-2 rounded-md border p-3">
                {item.url && item.mediaType === "IMAGE" ? (
                  <img
                    src={item.url}
                    alt={item.caption || item.filename}
                    className="max-h-60 w-full rounded object-contain"
                  />
                ) : null}
                {item.url && item.mediaType === "VIDEO" ? (
                  <video
                    src={item.url}
                    controls
                    preload="metadata"
                    className="max-h-60 w-full rounded"
                  />
                ) : null}
                {item.missing ? (
                  <p className="text-sm">Media unavailable.</p>
                ) : null}
                <p className="text-sm font-medium break-words">
                  {item.caption || item.filename}
                </p>
                <p className="text-muted-foreground text-xs">
                  {item.mediaDate
                    ? item.mediaDate.slice(0, 10)
                    : new Intl.DateTimeFormat("en-US", {
                        timeZone: timezone,
                      }).format(new Date(item.createdAt))}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void remove(item.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
