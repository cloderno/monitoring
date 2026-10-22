import { useEffect, useRef, useState } from 'react';
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
import { recognizePhoto } from '../services/geminiService';
import { useI18n } from '../i18n';
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
  | { kind: 'error'; err: unknown }
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
  const { t } = useI18n();
  const [cls, label] = isTest
    ? ['test', t('insp.geoTest')]
    : status === 'ready'
      ? ['ready', 'GPS']
      : status === 'loading'
        ? ['loading', t('insp.geoSearch')]
        : status === 'error'
          ? ['error', t('insp.geoNone')]
          : ['idle', t('insp.geoNone')];
  return (
    <span className="badge badge--neutral" title={t('insp.geoAria')}>
      <span className={`geo-dot geo-dot--${cls}`} /> {label}
    </span>
  );
}

export function InspectionPage() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { session, logout } = useAuth();
  const { geo, photo, setPhotoFile, setPending } = useDraft();
  const { products, error: catalogError, retry: retryCatalog } = useCatalog();
  const [phase, setPhase] = useState<Phase>({ kind: 'form' });
  const thumbnailRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const location = geo.location;
  const canAnalyze = Boolean(photo && location && products.length);
  const canEnterManually = Boolean(location && products.length);

  // Сменили фото — миниатюра от прошлого снимка больше не подходит
  useEffect(() => {
    thumbnailRef.current = null;
  }, [photo]);

  /** Готовит результат и открывает его. В историю он попадёт только по кнопке «Сохранить результат» */
  const finish = async (fields: ProductFields, confidence: number | null, manual: boolean) => {
    // При ручном вводе фото не распознавалось — миниатюру для истории делаем здесь
    if (!thumbnailRef.current && photo) {
      try {
        thumbnailRef.current = (await preparePhoto(photo.file, photo.url)).thumbnail;
      } catch {
        // результат сохранится без миниатюры
      }
    }
    const inspection = buildInspection({
      fields,
      catalog: products,
      location,
      confidence,
      manual,
      photo: thumbnailRef.current,
    });
    setPending(inspection);
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
      const result = await recognizePhoto(session.token, prepared, lang, controller.signal);
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
      if (describeError(err).code === 'unauthorized') {
        logout();
        return;
      }
      // Храним саму ошибку — текст берётся при отрисовке и переводится при смене языка
      setPhase({ kind: 'error', err });
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
  const errorInfo = phase.kind === 'error' ? describeError(phase.err) : null;

  return (
    <>
      <AppHeader
        title={t('insp.title')}
        subtitle={t('insp.subtitle')}
        backTo="/"
        right={<GeoIndicator status={geo.status} isTest={geo.isTest} />}
      />

      <div className="screen__body page-enter">
        <LocationCard geo={geo} />
        <PhotoUpload photo={photo} onChange={setPhotoFile} disabled={busy} />

        {catalogError && (
          <StatusMessage
            tone="error"
            title={t('insp.catalogError')}
            actions={
              <PrimaryButton size="sm" variant="secondary" onClick={retryCatalog}>
                {t('common.retry')}
              </PrimaryButton>
            }
          >
            {t('insp.catalogErrorText')}
          </StatusMessage>
        )}

        {photo && !location && (
          <StatusMessage
            tone="warning"
            title={t('insp.needLocation')}
            actions={
              <>
                {!geo.testMode && (
                  <PrimaryButton size="sm" variant="secondary" icon={<Crosshair size={16} />} onClick={geo.requestGps}>
                    {t('insp.detect')}
                  </PrimaryButton>
                )}
                <PrimaryButton size="sm" variant="secondary" icon={<FlaskConical size={16} />} onClick={() => geo.setTestMode(true)}>
                  {t('insp.testGeo')}
                </PrimaryButton>
              </>
            }
          >
            {t('insp.needLocationText')}
          </StatusMessage>
        )}

        {errorInfo && (
          <StatusMessage
            tone="error"
            title={errorInfo.title}
            actions={
              <>
                <PrimaryButton size="sm" variant="secondary" icon={<RotateCcw size={16} />} onClick={analyze} disabled={!canAnalyze}>
                  {t('common.retry')}
                </PrimaryButton>
              </>
            }
          >
            {errorInfo.text}
          </StatusMessage>
        )}
      </div>

      <div className="screen__footer">
        <PrimaryButton size="lg" block icon={<Sparkles size={20} />} disabled={!canAnalyze} loading={busy} onClick={analyze}>
          {t('insp.analyze')}
        </PrimaryButton>
        <PrimaryButton variant="ghost" block icon={<PencilLine size={18} />} disabled={!canEnterManually || busy} onClick={openManual}>
          {t('insp.manual')}
        </PrimaryButton>
        {!photo && <p className="small" style={{ textAlign: 'center' }}>{t('insp.addPhotoFirst')}</p>}
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
            <span className="spinner" /> {t('insp.analyzing')}
          </div>
          <p className="muted">{t('insp.analyzingText')}</p>
          <PrimaryButton variant="secondary" onClick={cancelAnalysis} style={{ minWidth: 180, marginTop: 8 }}>
            {t('common.cancel')}
          </PrimaryButton>
        </div>
      )}

      {phase.kind === 'confirm' && (
        <ManualConfirmSheet
          title={phase.recognized ? t('insp.checkData') : t('insp.manualTitle')}
          initial={phase.fields}
          catalog={products}
          notice={
            phase.recognized ? (
              <StatusMessage tone="warning" title={t('insp.needConfirm')}>
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {phase.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </StatusMessage>
            ) : (
              <StatusMessage tone="info">
                {t('insp.manualInfo')}
              </StatusMessage>
            )
          }
          submitLabel={t('insp.confirmSubmit')}
          onSubmit={(fields) => finish(fields, phase.confidence, true)}
          onCancel={() => setPhase({ kind: 'form' })}
          extraActions={
            <PrimaryButton variant="ghost" block icon={<Camera size={18} />} onClick={retake}>
              {t('insp.retake')}
            </PrimaryButton>
          }
        />
      )}
    </>
  );
}
