import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Crosshair, FlaskConical, PencilLine, RotateCcw, Sparkles } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { LocationCard } from '../components/LocationCard';
import { ManualConfirmSheet } from '../components/ManualConfirmSheet';
import { PhotoUpload } from '../components/PhotoUpload';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { useCatalog } from '../hooks/useCatalog';
import { useAuth } from '../store/AuthContext';
import { useDraft } from '../store/DraftContext';
import { useHistory } from '../store/HistoryContext';
import { recognizePhoto } from '../services/geminiService';
import { describeError } from '../utils/errorMessages';
import { preparePhoto } from '../utils/image';
import {
  buildInspection,
  confirmationReasons,
  fieldsFromRecognition,
  type ProductFields,
} from '../utils/inspection';

type Phase =
  | { kind: 'form' }
  | { kind: 'analyzing' }
  | { kind: 'error'; code: string; title: string; text: string }
  | { kind: 'confirm'; fields: ProductFields; reasons: string[]; confidence: number | null; recognized: boolean };

const EMPTY_FIELDS: ProductFields = {
  productId: null,
  productName: null,
  brand: null,
  packageSize: null,
  shelfPrice: null,
  priceUnit: null,
};

function GeoIndicator({ status, isTest }: { status: string; isTest: boolean }) {
  const [cls, label] = isTest
    ? ['test', 'Тест']
    : status === 'ready'
      ? ['ready', 'GPS']
      : status === 'loading'
        ? ['loading', 'Поиск']
        : status === 'error'
          ? ['error', 'Нет GPS']
          : ['idle', 'Нет GPS'];
  return (
    <span className="badge badge--neutral" title="Статус геолокации">
      <span className={`geo-dot geo-dot--${cls}`} /> {label}
    </span>
  );
}

export function InspectionPage() {
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const { add } = useHistory();
  const { geo, photo, setPhotoFile } = useDraft();
  const { products, error: catalogError, retry: retryCatalog } = useCatalog();
  const [phase, setPhase] = useState<Phase>({ kind: 'form' });
  const thumbnailRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const location = geo.location;
  const canAnalyze = Boolean(photo && location && products.length);

  const finish = (fields: ProductFields, confidence: number | null, manual: boolean) => {
    const inspection = buildInspection({
      fields,
      catalog: products,
      location,
      confidence,
      manual,
      photo: thumbnailRef.current,
    });
    add(inspection);
    navigate(`/inspection/result/${inspection.id}`, { replace: true });
    setPhotoFile(null);
  };

  const analyze = async () => {
    if (!photo || !location || !session) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ kind: 'analyzing' });
    try {
      const prepared = await preparePhoto(photo.file, photo.url);
      thumbnailRef.current = prepared.thumbnail;
      const result = await recognizePhoto(session.token, prepared, controller.signal);
      if (controller.signal.aborted) return;
      const { fields, match } = fieldsFromRecognition(result, products);
      const reasons = confirmationReasons(result, fields, products, match?.confidence ?? null);
      if (reasons.length === 0) {
        finish(fields, result.confidence, false);
      } else {
        setPhase({ kind: 'confirm', fields, reasons, confidence: result.confidence, recognized: true });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const d = describeError(err);
      if (d.code === 'unauthorized') {
        logout();
        return;
      }
      setPhase({ kind: 'error', ...d });
    }
  };

  const cancelAnalysis = () => {
    abortRef.current?.abort();
    setPhase({ kind: 'form' });
  };

  const openManual = () =>
    setPhase({
      kind: 'confirm',
      fields: EMPTY_FIELDS,
      reasons: [],
      confidence: null,
      recognized: false,
    });

  const retake = () => {
    setPhotoFile(null);
    setPhase({ kind: 'form' });
  };

  const busy = phase.kind === 'analyzing';

  return (
    <>
      <AppHeader
        title="Новая проверка"
        subtitle="Сделайте фотографию товара и ценника"
        backTo="/"
        right={<GeoIndicator status={geo.status} isTest={geo.isTest} />}
      />

      <div className="screen__body page-enter">
        <LocationCard geo={geo} />
        <PhotoUpload photo={photo} onChange={setPhotoFile} disabled={busy} />

        {catalogError && (
          <StatusMessage
            tone="error"
            title="Каталог цен не загрузился"
            actions={
              <PrimaryButton size="sm" variant="secondary" onClick={retryCatalog}>
                Повторить
              </PrimaryButton>
            }
          >
            Без каталога сравнение цен невозможно.
          </StatusMessage>
        )}

        {photo && !location && (
          <StatusMessage
            tone="warning"
            title="Нужно местоположение"
            actions={
              <>
                {!geo.testMode && (
                  <PrimaryButton size="sm" variant="secondary" icon={<Crosshair size={16} />} onClick={geo.requestGps}>
                    Определить
                  </PrimaryButton>
                )}
                <PrimaryButton size="sm" variant="secondary" icon={<FlaskConical size={16} />} onClick={() => geo.setTestMode(true)}>
                  Тестовая геолокация
                </PrimaryButton>
              </>
            }
          >
            Каждая проверка фиксируется с координатами. Разрешите доступ к геолокации или включите тестовый режим.
          </StatusMessage>
        )}

        {phase.kind === 'error' && (
          <StatusMessage
            tone="error"
            title={phase.title}
            actions={
              <>
                <PrimaryButton size="sm" variant="secondary" icon={<RotateCcw size={16} />} onClick={analyze} disabled={!canAnalyze}>
                  Повторить
                </PrimaryButton>
                <PrimaryButton size="sm" variant="secondary" icon={<PencilLine size={16} />} onClick={openManual} disabled={!location}>
                  Ввести вручную
                </PrimaryButton>
              </>
            }
          >
            {phase.text}
          </StatusMessage>
        )}
      </div>

      <div className="screen__footer">
        <PrimaryButton size="lg" block icon={<Sparkles size={20} />} disabled={!canAnalyze} loading={busy} onClick={analyze}>
          Распознать и проверить цену
        </PrimaryButton>
        {!photo && <p className="small" style={{ textAlign: 'center' }}>Сначала добавьте фотографию товара с ценником</p>}
      </div>

      {phase.kind === 'analyzing' && (
        <div className="analyzing" role="status" aria-live="polite">
          {photo && (
            <div className="analyzing__thumb">
              <img src={photo.url} alt="" />
              <div className="analyzing__scan" />
            </div>
          )}
          <div className="analyzing__title">
            <span className="spinner" /> Анализируем фотографию…
          </div>
          <p className="muted">Определяем товар и цену на ценнике. Это может занять несколько секунд.</p>
          <PrimaryButton variant="secondary" onClick={cancelAnalysis} style={{ minWidth: 180, marginTop: 8 }}>
            Отменить
          </PrimaryButton>
        </div>
      )}

      {phase.kind === 'confirm' && (
        <ManualConfirmSheet
          title={phase.recognized ? 'Проверьте данные' : 'Ввод данных вручную'}
          initial={phase.fields}
          catalog={products}
          notice={
            phase.recognized ? (
              <StatusMessage tone="warning" title="Нужно подтверждение">
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {phase.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </StatusMessage>
            ) : (
              <StatusMessage tone="info">
                Введите данные с ценника самостоятельно. Результат будет отмечен как введённый вручную.
              </StatusMessage>
            )
          }
          submitLabel="Подтвердить и проверить"
          onSubmit={(fields) => finish(fields, phase.confidence, true)}
          onCancel={() => setPhase({ kind: 'form' })}
          extraActions={
            <PrimaryButton variant="ghost" block icon={<Camera size={18} />} onClick={retake}>
              Переснять фото
            </PrimaryButton>
          }
        />
      )}
    </>
  );
}
