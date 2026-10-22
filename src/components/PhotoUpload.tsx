import { useRef, useState, type ChangeEvent } from 'react';
import { Camera, ImagePlus, RefreshCw, ScanLine, X } from 'lucide-react';
import type { DraftPhoto } from '../store/DraftContext';
import { validatePhoto } from '../utils/image';
import { PrimaryButton } from './PrimaryButton';
import { StatusMessage } from './StatusMessage';

interface Props {
  photo: DraftPhoto | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

/** Одна фотография, на которой одновременно виден товар и его ценник */
export function PhotoUpload({ photo, onChange, disabled }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageBroken, setImageBroken] = useState(false);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // позволяет выбрать тот же файл повторно
    if (!file) return;
    const problem = validatePhoto(file);
    setError(problem);
    setImageBroken(false);
    if (!problem) onChange(file);
  };

  return (
    <section className="card appear" style={{ animationDelay: '60ms' }}>
      <div className="card__header">
        <span className="card__icon">
          <ScanLine size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card__step">Шаг 2</div>
          <h2 className="card__title">Фото товара вместе с ценником</h2>
        </div>
      </div>

      {photo ? (
        <div className="photo-preview appear">
          {imageBroken ? (
            <div className="map__fallback" style={{ background: '#eef2f8' }}>
              <b>{photo.file.name}</b>
              <span>Предпросмотр этого формата недоступен в браузере, но фото будет отправлено на распознавание.</span>
            </div>
          ) : (
            <img src={photo.url} alt="Фото товара с ценником" onError={() => setImageBroken(true)} />
          )}
          {!disabled && (
            <button className="photo-preview__remove" aria-label="Удалить фото" onClick={() => onChange(null)}>
              <X size={20} />
            </button>
          )}
        </div>
      ) : (
        <div className="photo-drop">
          <span className="photo-drop__icon">
            <Camera size={28} />
          </span>
          <b style={{ color: 'var(--color-text)' }}>Фото ещё не выбрано</b>
          <span style={{ fontSize: 13 }}>Сделайте снимок или выберите его из галереи</span>
        </div>
      )}

      <div className="photo-actions">
        <PrimaryButton
          variant={photo ? 'secondary' : 'primary'}
          icon={photo ? <RefreshCw size={18} /> : <Camera size={18} />}
          onClick={() => cameraRef.current?.click()}
          disabled={disabled}
        >
          {photo ? 'Переснять' : 'Сделать фото'}
        </PrimaryButton>
        <PrimaryButton
          variant="secondary"
          icon={<ImagePlus size={18} />}
          onClick={() => galleryRef.current?.click()}
          disabled={disabled}
        >
          {photo ? 'Заменить' : 'Из галереи'}
        </PrimaryButton>
      </div>

      {/* capture открывает камеру на смартфоне; где не поддерживается — обычный выбор файла */}
      <input ref={cameraRef} className="visually-hidden" type="file" accept={ACCEPT} capture="environment" onChange={handleFile} tabIndex={-1} />
      <input ref={galleryRef} className="visually-hidden" type="file" accept={ACCEPT} onChange={handleFile} tabIndex={-1} />

      <div style={{ marginTop: 12 }}>
        {error ? (
          <StatusMessage tone="error">{error}</StatusMessage>
        ) : (
          <p className="small">
            Постарайтесь, чтобы товар и его ценник полностью попадали в кадр. Цена должна быть хорошо видна.
          </p>
        )}
      </div>
    </section>
  );
}
