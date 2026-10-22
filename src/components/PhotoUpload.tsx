import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, ImagePlus, Plus, RefreshCw, ScanLine, X } from 'lucide-react';
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
/** Дополнительные фото — пока демонстрация: на распознавание уходит только основное (первое) фото */
const MAX_EXTRA = 5;

interface ExtraPhoto {
  id: string;
  url: string;
}

const newPhotoId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

/** Основная фотография товара с ценником (её распознаём) и дополнительные снимки (пока только показываются) */
export function PhotoUpload({ photo, onChange, disabled }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const extraRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageBroken, setImageBroken] = useState(false);
  const [extras, setExtras] = useState<ExtraPhoto[]>([]);
  const extrasRef = useRef(extras);
  extrasRef.current = extras;

  // Нет основного фото (удалено или проверка сохранена) — убираем и дополнительные
  useEffect(() => {
    if (photo || extrasRef.current.length === 0) return;
    extrasRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    setExtras([]);
  }, [photo]);

  useEffect(() => () => extrasRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const addExtras = (files: File[]) => {
    const free = MAX_EXTRA - extrasRef.current.length;
    const accepted = files.filter((f) => !validatePhoto(f)).slice(0, Math.max(0, free));
    if (files.length > accepted.length) {
      setError(`Можно добавить не больше ${MAX_EXTRA} дополнительных фото в формате JPEG, PNG, WebP или HEIC.`);
    }
    if (accepted.length) {
      setExtras((list) => [...list, ...accepted.map((f) => ({ id: newPhotoId(), url: URL.createObjectURL(f) }))]);
    }
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const [file, ...rest] = Array.from(e.target.files ?? []);
    e.target.value = ''; // позволяет выбрать тот же файл повторно
    if (!file) return;
    const problem = validatePhoto(file);
    setError(problem);
    setImageBroken(false);
    if (problem) return;
    onChange(file);
    // Выбрали несколько из галереи: первое — основное, остальные — дополнительные
    if (rest.length) addExtras(rest);
  };

  const handleExtra = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    setError(null);
    addExtras(files);
  };

  const removeExtra = (id: string) => {
    const gone = extrasRef.current.find((p) => p.id === id);
    if (gone) URL.revokeObjectURL(gone.url);
    setExtras((list) => list.filter((p) => p.id !== id));
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
          <span className="photo-preview__badge">Основное фото</span>
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

      {photo && (
        <div className="photo-strip">
          <div className="photo-thumb photo-thumb--main" title="Основное фото — по нему выполняется распознавание">
            {!imageBroken && <img src={photo.url} alt="" />}
            <span className="photo-thumb__label">1</span>
          </div>
          {extras.map((p, idx) => (
            <div key={p.id} className="photo-thumb">
              <img src={p.url} alt={`Дополнительное фото ${idx + 1}`} />
              <span className="photo-thumb__label">{idx + 2}</span>
              {!disabled && (
                <button type="button" className="photo-thumb__remove" aria-label="Удалить фото" onClick={() => removeExtra(p.id)}>
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {extras.length < MAX_EXTRA && (
            <button
              type="button"
              className="photo-thumb photo-thumb--add"
              onClick={() => extraRef.current?.click()}
              disabled={disabled}
              aria-label="Добавить ещё фото"
            >
              <Plus size={22} />
              <span>Ещё фото</span>
            </button>
          )}
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
      <input ref={galleryRef} className="visually-hidden" type="file" accept={ACCEPT} multiple onChange={handleFile} tabIndex={-1} />
      <input ref={extraRef} className="visually-hidden" type="file" accept={ACCEPT} multiple onChange={handleExtra} tabIndex={-1} />

      <div style={{ marginTop: 12 }}>
        {error ? (
          <StatusMessage tone="error">{error}</StatusMessage>
        ) : (
          <p className="small">
            Постарайтесь, чтобы товар и его ценник полностью попадали в кадр. Цена должна быть хорошо видна.
            {photo && ' Цена распознаётся по основному (первому) фото.'}
          </p>
        )}
      </div>
    </section>
  );
}
