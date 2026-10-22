// Обращение к Gemini API и строгая проверка ответа. Выполняется только на сервере.

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    product_name: { type: 'STRING', nullable: true },
    brand: { type: 'STRING', nullable: true },
    package_size: { type: 'STRING', nullable: true },
    shelf_price: { type: 'NUMBER', nullable: true },
    currency: { type: 'STRING', enum: ['KZT'] },
    price_unit: { type: 'STRING', nullable: true },
    catalog_id: { type: 'STRING', nullable: true },
    confidence: { type: 'NUMBER' },
    needs_confirmation: { type: 'BOOLEAN' },
    message: { type: 'STRING', nullable: true },
  },
  required: [
    'product_name',
    'brand',
    'package_size',
    'shelf_price',
    'currency',
    'price_unit',
    'catalog_id',
    'confidence',
    'needs_confirmation',
    'message',
  ],
  propertyOrdering: [
    'product_name',
    'brand',
    'package_size',
    'shelf_price',
    'currency',
    'price_unit',
    'catalog_id',
    'confidence',
    'needs_confirmation',
    'message',
  ],
};

function buildPrompt(products, lang = 'ru') {
  const catalog = products.map((p) => `- ${p.id}: ${p.name} (${p.unit})`).join('\n');
  return `Ты помогаешь инспектору мониторинга цен в Казахстане. На фотографии — продовольственный товар вместе с его ценником.
Проанализируй изображение целиком и верни JSON строго по схеме.

Поля:
- product_name — название товара по-русски, как на упаковке или ценнике (например «Рис круглозёрный»); null, если товар не определить.
- brand — бренд/производитель, если он виден; иначе null.
- package_size — фасовка с единицей измерения («450 г», «1 кг», «0,9 л», «900 мл», «10 шт»). Ищи её и на ценнике, и на этикетке/упаковке самого товара (для жидкостей — объём в л или мл). null, только если нигде не читается.
- shelf_price — цена на ценнике, относящемся именно к этому товару, числом в тенге (без пробелов и символа ₸). Если есть старая и акционная цена — бери действующую (акционную) и укажи это в message.
- currency — всегда "KZT".
- price_unit — за какую единицу указана цена, если это явно написано на ценнике («кг», «л», «шт.», «упаковка», «100 г»); если цена просто за товар/упаковку и единица не указана — null.
- catalog_id — id подходящей позиции из справочника ниже, если товар явно к ней относится; иначе null.
- confidence — уверенность распознавания пары «товар + цена» от 0 до 1.
- needs_confirmation — true, если что-либо распознано неуверенно и человеку нужно проверить данные.
- message — короткое пояснение для инспектора, если есть проблема; иначе null. ${lang === 'kk' ? 'Пиши message на казахском языке (қазақ тілінде).' : 'Пиши message на русском языке.'}

Строгие правила:
1. Никогда не придумывай цену. Если цифры на ценнике нечитаемы, размыты или обрезаны — shelf_price = null, needs_confirmation = true, в message объясни причину.
2. Не подставляй цену из справочника — справочник дан только для выбора catalog_id.
3. Не бери цену с соседнего ценника, если нет уверенности, что он относится к этому товару.
4. Если в кадре несколько товаров и ценников и соответствие определить нельзя — shelf_price = null, needs_confirmation = true, в message попроси сделать снимок одного товара с его ценником (по-русски это звучит так: «На фото несколько товаров и ценников. Сделайте снимок одного товара с его ценником»).
5. Если на фото нет товара или ценника — укажи это в message, needs_confirmation = true.
6. Если confidence < 0.7 — needs_confirmation = true.

Справочник (id: название (единица)):
${catalog}`;
}

export class GeminiError extends Error {
  constructor(code, status, detail) {
    super(code);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

// Приводим ответ модели к ожидаемой структуре; всё, что не проходит проверку, считается ошибкой формата.
export function validateRecognition(raw, products) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new GeminiError('bad_response', 502, 'Ответ не является объектом');
  }
  let price = raw.shelf_price;
  if (typeof price === 'string') price = Number(price.replace(/\s/g, '').replace(',', '.'));
  if (price !== null && price !== undefined && (typeof price !== 'number' || !Number.isFinite(price))) {
    throw new GeminiError('bad_response', 502, 'shelf_price не число');
  }
  if (typeof price === 'number' && price <= 0) price = null;

  let confidence = Number(raw.confidence);
  if (!Number.isFinite(confidence)) confidence = 0;
  confidence = Math.min(1, Math.max(0, confidence));

  const catalogId = str(raw.catalog_id);
  const result = {
    product_name: str(raw.product_name),
    brand: str(raw.brand),
    package_size: str(raw.package_size),
    shelf_price: typeof price === 'number' ? Math.round(price * 100) / 100 : null,
    currency: 'KZT',
    price_unit: str(raw.price_unit),
    catalog_id: catalogId && products.some((p) => p.id === catalogId) ? catalogId : null,
    confidence,
    needs_confirmation: raw.needs_confirmation === true,
    message: str(raw.message),
  };
  if (result.shelf_price === null || result.product_name === null || result.confidence < 0.7) {
    result.needs_confirmation = true;
  }
  return result;
}

async function callModel({ apiKey, model, mimeType, base64, products, thinkingLevel, lang, timeoutMs }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ inline_data: { mime_type: mimeType, data: base64 } }, { text: buildPrompt(products, lang) }],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          // Для чтения ценника глубокие рассуждения не нужны — низкий уровень заметно ускоряет ответ
          ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
        },
      }),
    });
  } catch (err) {
    throw new GeminiError(err?.name === 'TimeoutError' ? 'timeout' : 'unavailable', 504, String(err));
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    if (response.status === 429) throw new GeminiError('rate_limited', 429, text);
    if (response.status === 400 && /API key/i.test(text)) throw new GeminiError('not_configured', 503, text);
    if (response.status === 401 || response.status === 403) throw new GeminiError('not_configured', 503, text);
    if (response.status === 404) throw new GeminiError('model_unavailable', 503, text);
    if (response.status === 400 && /thinking/i.test(text)) throw new GeminiError('model_unavailable', 503, text);
    if (response.status === 400) throw new GeminiError('bad_image', 400, text);
    // 500/503 — перегрузка или временный сбой на стороне Google
    if (response.status >= 500) throw new GeminiError('overloaded', 503, `${response.status} ${text}`);
    throw new GeminiError('unavailable', 502, `${response.status} ${text}`);
  }

  const data = await response.json().catch(() => null);
  const candidate = data?.candidates?.[0];
  if (!candidate) {
    // Например, изображение заблокировано фильтрами безопасности
    throw new GeminiError('bad_response', 502, JSON.stringify(data?.promptFeedback ?? data));
  }
  const text = (candidate.content?.parts ?? []).map((p) => p.text ?? '').join('');
  let parsed;
  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    throw new GeminiError('bad_response', 502, `Некорректный JSON: ${text.slice(0, 300)}`);
  }
  return validateRecognition(parsed, products);
}

// Временные сбои, при которых имеет смысл повторить запрос или попробовать другую модель
const RETRYABLE = new Set(['overloaded', 'rate_limited', 'timeout', 'unavailable', 'model_unavailable']);
const TOTAL_BUDGET_MS = 100_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Распознаёт фото: основная модель (до 2 попыток при перегрузке), затем запасные модели по очереди.
 * Общее время ограничено, чтобы пользователь не ждал бесконечно.
 */
export async function recognizeImage({ model, fallbackModels = [], ...params }) {
  const plan = [model, model, ...fallbackModels.filter((m) => m && m !== model)];
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError;
  for (let i = 0; i < plan.length; i++) {
    const remaining = deadline - Date.now();
    if (remaining < 5_000) break;
    // Повтор той же модели имеет смысл только при перегрузке; при 404 сразу переходим к запасной
    if (i === 1 && lastError?.code !== 'overloaded') continue;
    if (i === 1) await sleep(1_500);
    try {
      const result = await callModel({ ...params, model: plan[i], timeoutMs: Math.min(45_000, remaining) });
      if (i === 1) console.warn(`[gemini] ${plan[i]}: ответ получен со второй попытки`);
      if (i > 1) console.warn(`[gemini] ответ получен от запасной модели ${plan[i]}`);
      return result;
    } catch (err) {
      if (!(err instanceof GeminiError) || !RETRYABLE.has(err.code)) throw err;
      console.warn(`[gemini] ${plan[i]}: ${err.code}, пробуем дальше`);
      lastError = err;
    }
  }
  throw lastError ?? new GeminiError('unavailable', 502, 'Нет доступных моделей');
}
