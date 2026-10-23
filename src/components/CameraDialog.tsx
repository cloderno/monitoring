import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, FolderOpen, SwitchCamera, X } from 'lucide-react';
import { useI18n, type MessageKey } from '../i18n';
import { PrimaryButton } from './PrimaryButton';

interface Props {
  onCapture: (file: File) => void;
  onClose: () => void;
  /** Камера недоступна — открыть обычный выбор файла */
  onPickFile: () => void;
}

/** На компьютере input capture игнорируется и открывается проводник, поэтому камера включается напрямую */
export const canUseWebcam = () => {
  // На смартфонах, планшетах и в Android-приложении системная камера через input удобнее.
  // Сенсорный экран ноутбука сюда не относится, поэтому смотрим на тип устройства, а не на указатель.
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  const ua = nav.userAgent;
  const iPadOS = /Macintosh/.test(ua) && nav.maxTouchPoints > 1;
  const mobile = nav.userAgentData?.mobile ?? (/Android|iPhone|iPad|iPod|Mobile|wv\)/i.test(ua) || iPadOS);
  return !mobile && !iPadOS && !/Android|wv\)/i.test(ua);
};

const errorKey = (err: unknown): MessageKey => {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'camera.denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'camera.notFound';
  if (name === 'NotReadableError') return 'camera.busy';
  return 'camera.error';
};

export function CameraDialog({ onCapture, onClose, onPickFile }: Props) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    setReady(false);
    setError(null);
    // Без HTTPS (например, по адресу http://192.168…) браузер не даёт доступ к камере
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(window.isSecureContext ? 'camera.error' : 'camera.insecure');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      .then(async (s) => {
        if (cancelled) {
          s.getTracks().forEach((tr) => tr.stop());
          return;
        }
        stream = s;
        const video = videoRef.current;
        if (video) {
          video.srcObject = s;
          await video.play().catch(() => undefined);
        }
        // Названия камер доступны только после разрешения
        const list = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
        if (!cancelled) setDevices(list);
      })
      .catch((err) => {
        if (!cancelled) setError(errorKey(err));
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [deviceId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  };

  const switchCamera = () => {
    if (devices.length < 2) return;
    const current = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0]?.getSettings().deviceId;
    const idx = devices.findIndex((d) => d.deviceId === current);
    setDeviceId(devices[(idx + 1) % devices.length].deviceId);
  };

  const shell = document.querySelector('.app-shell') ?? document.body;

  return createPortal(
    <div className="camera" role="dialog" aria-modal="true" aria-label={t('camera.title')}>
      <div className="camera__top">
        <button type="button" className="camera__icon-btn" onClick={onClose} aria-label={t('common.close')}>
          <X size={22} />
        </button>
        <span className="camera__title">{t('camera.title')}</span>
        {devices.length > 1 && !error ? (
          <button type="button" className="camera__icon-btn" onClick={switchCamera} aria-label={t('camera.switch')}>
            <SwitchCamera size={22} />
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      <div className="camera__view">
        {error ? (
          <div className="camera__error">
            <Camera size={36} />
            <p>{t(error)}</p>
            <PrimaryButton variant="secondary" icon={<FolderOpen size={18} />} onClick={onPickFile}>
              {t('camera.fromFile')}
            </PrimaryButton>
          </div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted onLoadedData={() => setReady(true)} />
            {!ready && <span className="spinner camera__spinner" />}
          </>
        )}
      </div>

      {!error && (
        <div className="camera__bottom">
          <button type="button" className="camera__shutter" onClick={shoot} disabled={!ready} aria-label={t('camera.shoot')} />
        </div>
      )}
    </div>,
    shell,
  );
}
