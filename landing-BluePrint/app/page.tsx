"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BarChart3,
  Package,
  Smartphone,
  Zap,
  QrCode,
  Globe,
  ChevronDown,
  Check,
  ArrowRight,
  Star,
  Shield,
  Clock,
  TrendingUp,
  Cpu,
  Menu,
  X,
  Boxes,
  Truck,
  ShoppingCart,
  Building2,
  Activity,
  AlertTriangle,
  Users,
  Scan,
  Brain,
  Phone,
  Mail,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Lock,
  Database,
  Navigation,
  Target,
  Map,
  Plus,
  Minus,
  Play,
  Layers,
  LayoutGrid,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

interface FAQItem {
  q: string;
  a: string;
}

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────
const FEATURES = [
  {
    icon: Package,
    title: "Управление запасами",
    desc: "Полный учёт товаров в реальном времени. Остатки, перемещения, инвентаризация FIFO/LIFO прямо из браузера или телефона.",
    color: "blue",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    border: "hover:border-blue-500/30",
  },
  {
    icon: Navigation,
    title: "Сборка заказов",
    desc: "Оптимальные маршруты комплектации сокращают время сборки на 40%. Поддержка волновой и пакетной сборки.",
    color: "violet",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-400",
    border: "hover:border-violet-500/30",
  },
  {
    icon: Scan,
    title: "Мобильное сканирование",
    desc: "Работа через смартфон или ТСД со встроенным сканером. iOS и Android приложения с офлайн-режимом.",
    color: "cyan",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-400",
    border: "hover:border-cyan-500/30",
  },
  {
    icon: BarChart3,
    title: "Аналитика склада",
    desc: "Дашборд KPI сотрудников, скорость обработки, загруженность зон. Данные обновляются в реальном времени.",
    color: "amber",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    border: "hover:border-amber-500/30",
  },
  {
    icon: QrCode,
    title: "Штрихкоды и этикетки",
    desc: "Поддержка EAN-13, QR, DataMatrix, SSCC. Печать этикеток, генерация ШК для новых товаров прямо из системы.",
    color: "green",
    iconBg: "bg-green-500/10",
    iconColor: "text-green-400",
    border: "hover:border-green-500/30",
  },
  {
    icon: Globe,
    title: "Интеграции",
    desc: "Wildberries, Ozon, Яндекс.Маркет, Amazon, 1С, SAP, Bitrix24 и Shopify. Синхронизация остатков в реальном времени.",
    color: "rose",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-400",
    border: "hover:border-rose-500/30",
  },
];

const HOW_IT_WORKS = [
  {
    num: "01",
    icon: LayoutGrid,
    title: "Регистрация",
    sub: "День 1 · 15 минут",
    desc: "Создайте аккаунт и внесите данные о складе: адрес, размеры, количество зон. Никаких установок.",
  },
  {
    num: "02",
    icon: Map,
    title: "Настройка зон",
    sub: "День 1 · 1-2 часа",
    desc: "Настройте зоны, стеллажи и ячейки под структуру вашего склада. Загрузите товарный справочник.",
  },
  {
    num: "03",
    icon: Zap,
    title: "Запуск",
    sub: "День 1 · вечер",
    desc: "Обучите сотрудников за 30 минут. Начинайте приёмку и сборку заказов в тот же день.",
  },
  {
    num: "04",
    icon: TrendingUp,
    title: "Масштабирование",
    sub: "День 2+",
    desc: "Подключайте новые склады, интеграции с маркетплейсами и AI-возможности по мере роста бизнеса.",
  },
];

const INNOVATIONS = [
  { icon: Brain, label: "AI-оптимизация размещения товаров" },
  { icon: Navigation, label: "Автомаршрутизация сборки" },
  { icon: Map, label: "Цифровая карта склада" },
  { icon: Activity, label: "Аналитика в реальном времени" },
  { icon: Smartphone, label: "Mobile-first управление" },
];

const USE_CASES = [
  {
    icon: ShoppingCart,
    title: "E-commerce склады",
    audience: "Интернет-магазины",
    benefit: "Обрабатывайте тысячи заказов без ошибок пересортицы",
    color: "blue",
    bg: "from-blue-500/10 to-blue-600/5",
    border: "border-blue-500/20",
  },
  {
    icon: Boxes,
    title: "Маркетплейс-селлеры",
    audience: "WB, Ozon, Яндекс.Маркет",
    benefit: "Единый учёт товаров на всех площадках одновременно",
    color: "violet",
    bg: "from-violet-500/10 to-violet-600/5",
    border: "border-violet-500/20",
  },
  {
    icon: Truck,
    title: "3PL логистика",
    audience: "Логистические компании",
    benefit: "Обслуживайте нескольких клиентов в одной системе",
    color: "cyan",
    bg: "from-cyan-500/10 to-cyan-600/5",
    border: "border-cyan-500/20",
  },
  {
    icon: Building2,
    title: "Розничные сети",
    audience: "Магазины и сети",
    benefit: "Синхронизация остатков склад ↔ магазины в реальном времени",
    color: "amber",
    bg: "from-amber-500/10 to-amber-600/5",
    border: "border-amber-500/20",
  },
];

const INTEGRATIONS = [
  { name: "Wildberries", abbr: "WB", color: "bg-purple-600" },
  { name: "Ozon", abbr: "OZ", color: "bg-blue-600" },
  { name: "Яндекс.Маркет", abbr: "ЯМ", color: "bg-yellow-500" },
  { name: "Amazon", abbr: "AM", color: "bg-orange-500" },
  { name: "1С", abbr: "1С", color: "bg-red-600" },
  { name: "SAP", abbr: "SA", color: "bg-blue-700" },
  { name: "Bitrix24", abbr: "BX", color: "bg-red-500" },
  { name: "Shopify", abbr: "SH", color: "bg-green-600" },
];

const PRICING: PricingTier[] = [
  {
    name: "Старт",
    price: "3 900",
    period: "₽/мес",
    description: "Для небольших складов и стартапов",
    features: [
      "До 2 пользователей",
      "1 склад",
      "Управление запасами",
      "Приёмка и отгрузка",
      "Базовая аналитика",
      "Email поддержка",
    ],
    cta: "Начать бесплатно",
  },
  {
    name: "Рост",
    price: "11 900",
    period: "₽/мес",
    description: "Для e-commerce и маркетплейс-продавцов",
    features: [
      "До 10 пользователей",
      "3 склада",
      "Мобильное приложение",
      "Аналитика в реальном времени",
      "Интеграции с маркетплейсами",
      "Оптимизация маршрутов сборки",
      "Приоритетная поддержка",
    ],
    cta: "Начать бесплатно",
    popular: true,
  },
  {
    name: "Бизнес",
    price: "31 900",
    period: "₽/мес",
    description: "Для крупных складов и 3PL компаний",
    features: [
      "Неограниченные пользователи",
      "До 10 складов",
      "AI-оптимизация размещения",
      "Автомаршрутизация сборки",
      "Все интеграции + API",
      "Цифровая карта склада",
      "Персональный менеджер",
    ],
    cta: "Связаться с нами",
  },
  {
    name: "Предприятие",
    price: "По запросу",
    period: "",
    description: "Для корпораций и сетей складов",
    features: [
      "Неограниченные склады",
      "Выделенный сервер",
      "SLA 99.9% uptime",
      "Кастомные интеграции",
      "Обучение и онбординг",
      "Поддержка 24/7",
      "Данные на серверах РФ",
    ],
    cta: "Запросить демо",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Склад-Софт сократила время сборки заказов на 45%. Теперь обрабатываем вдвое больше заказов с той же командой. Внедрение заняло один рабочий день.",
    name: "Иван Петров",
    role: "CEO",
    company: "MegaShop",
    initials: "ИП",
    stars: 5,
    color: "from-blue-600 to-violet-600",
  },
  {
    quote:
      "Запустили склад за 6 часов. Интерфейс настолько понятный, что сотрудники разобрались сами. Интеграция с Wildberries работает идеально.",
    name: "Алексей Смирнов",
    role: "Директор по логистике",
    company: "LogiPro",
    initials: "АС",
    stars: 5,
    color: "from-violet-600 to-cyan-600",
  },
  {
    quote:
      "Перешли с 1С — разница колоссальная. Ошибки при инвентаризации упали с 8% до нуля. Аналитика в реальном времени — это просто другой уровень.",
    name: "Мария Козлова",
    role: "Операционный директор",
    company: "TechStore",
    initials: "МК",
    stars: 5,
    color: "from-cyan-600 to-blue-600",
  },
];

// ─── Social proof toast messages ─────────────────────────────
const TOAST_MSGS = [
  { city: "Москва", co: "ООО Логистик Плюс", action: "начал тестирование" },
  { city: "Санкт-Петербург", co: "МегаСклад", action: "оставил заявку на демо" },
  { city: "Казань", co: "Сельхозснаб", action: "запустил первый склад" },
  { city: "Новосибирск", co: "TechStore", action: "оставил заявку" },
  { city: "Екатеринбург", co: "ИП Широков", action: "начал тестирование" },
  { city: "Краснодар", co: "ООО РосТрейд", action: "подключил склад" },
  { city: "Ростов-на-Дону", co: "СтройМаркет", action: "оставил заявку на демо" },
  { city: "Самара", co: "Фармлогист", action: "запустил первый склад" },
];

// ─── Stats ticker items ───────────────────────────────────────
const TICKER_ITEMS = [
  "⚡  500+ складов по всей России",
  "📦  Среднее время запуска — 1 день",
  "✅  99.8% точность учёта",
  "🚀  +40% скорость сборки заказов",
  "🔒  Данные на серверах РФ · 152-ФЗ",
  "📱  iOS и Android приложение",
  "🔗  Интеграция с WB и Ozon за 10 минут",
  "💰  14 дней бесплатно — без карты",
  "🏆  Рейтинг 4.9 / 5 по отзывам клиентов",
  "📊  Аналитика в реальном времени",
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Сколько времени занимает внедрение?",
    a: "Базовая конфигурация склада занимает 1-2 часа. В первый день вы настраиваете зоны, стеллажи, добавляете товары и начинаете работу. Никаких консультантов и многомесячных проектов. Среднее время запуска по нашим клиентам — 6 часов.",
  },
  {
    q: "Можно ли перенести данные из Excel или 1С?",
    a: "Да. Мы предоставляем инструменты импорта для Excel, CSV и 1С. Команда поддержки помогает с переносом данных бесплатно на тарифах «Рост» и выше. Обычно перенос занимает 2-4 часа.",
  },
  {
    q: "Работает ли система на мобильных устройствах?",
    a: "Полностью. Мобильное приложение для iOS и Android доступно с тарифа «Рост». Поддерживаются камера смартфона для сканирования и профессиональные ТСД (терминалы сбора данных Zebra, Honeywell, Urovo).",
  },
  {
    q: "Какие маркетплейсы и системы поддерживаются?",
    a: "Wildberries, Ozon, Яндекс.Маркет, Amazon, AliExpress. ERP: 1С, SAP. CRM: Bitrix24. Платформы: Shopify, 1С-Битрикс. Постоянно добавляем новые интеграции по запросам клиентов.",
  },
  {
    q: "Насколько безопасны данные склада?",
    a: "Данные шифруются по AES-256 при передаче и хранении. Серверы в сертифицированных дата-центрах на территории России (соответствие 152-ФЗ). Ежедневное резервное копирование с хранением 90 дней.",
  },
  {
    q: "Есть ли бесплатный тестовый период?",
    a: "Да — 14 дней бесплатно, без ограничений функционала, без привязки карты. После пробного периода выберите тариф или наш менеджер поможет подобрать подходящий план. Никаких скрытых платежей.",
  },
];

// ─────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCounter(target: number, duration = 2000, started = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - prog, 3);
      setCount(Math.floor(eased * target));
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  return count;
}

// ─────────────────────────────────────────────
// TYPEWRITER WORDS
// ─────────────────────────────────────────────
const TW_WORDS = [
  "e-commerce складов",
  "маркетплейс-продавцов",
  "3PL компаний",
  "интернет-магазинов",
  "складов малого бизнеса",
];

function TypewriterWords() {
  const [wi, setWi] = useState(0);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"typing" | "waiting" | "deleting">("typing");

  useEffect(() => {
    const word = TW_WORDS[wi];
    let t: ReturnType<typeof setTimeout>;

    if (mode === "typing") {
      t = setTimeout(() => {
        const next = word.slice(0, text.length + 1);
        setText(next);
        if (next.length === word.length) setMode("waiting");
      }, 72);
    } else if (mode === "waiting") {
      t = setTimeout(() => setMode("deleting"), 2200);
    } else {
      t = setTimeout(() => {
        const next = word.slice(0, text.length - 1);
        setText(next);
        if (next.length === 0) {
          setWi((i) => (i + 1) % TW_WORDS.length);
          setMode("typing");
        }
      }, 38);
    }
    return () => clearTimeout(t);
  }, [text, mode, wi]);

  return (
    <span className="text-blue-400 font-semibold whitespace-nowrap">
      {text || "\u00A0"}
      <span className="tw-cursor" />
    </span>
  );
}

// ─────────────────────────────────────────────
// STATS TICKER BAND
// ─────────────────────────────────────────────
function StatsTicker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="border-y border-white/[0.05] bg-gradient-to-r from-blue-950/20 via-[#060b18] to-violet-950/10 overflow-hidden py-3 select-none">
      <div className="ticker-inner">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-2 text-[11px] text-white/38 whitespace-nowrap px-7 font-medium tracking-wide"
          >
            {item}
            <span className="text-blue-500/30 text-base leading-none">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SOCIAL PROOF TOAST
// ─────────────────────────────────────────────
function SocialProofToast() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const idxRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const show = () => {
      setLeaving(false);
      setVisible(true);
      timerRef.current = setTimeout(() => {
        setLeaving(true);
        timerRef.current = setTimeout(() => {
          setVisible(false);
          idxRef.current = (idxRef.current + 1) % TOAST_MSGS.length;
          timerRef.current = setTimeout(show, 7000);
        }, 420);
      }, 4200);
    };
    timerRef.current = setTimeout(show, 6500);
    return () => clearTimeout(timerRef.current);
  }, []);

  if (!visible) return null;
  const msg = TOAST_MSGS[idxRef.current];

  return (
    <div
      className={`fixed bottom-5 right-5 z-[60] pointer-events-none ${
        leaving ? "toast-out" : "toast-in"
      }`}
    >
      <div className="flex items-center gap-3 bg-[#0d1627]/96 backdrop-blur-2xl border border-white/[0.10] rounded-2xl px-4 py-3 shadow-2xl shadow-black/60 max-w-[290px]">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-black text-white shadow-lg shadow-blue-500/20">
            {msg.co[0]}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0d1627]" />
        </div>
        {/* Text */}
        <div className="min-w-0">
          <p className="text-white text-xs font-bold truncate leading-tight">
            {msg.co}
          </p>
          <p className="text-white/55 text-[10px] leading-snug">
            {msg.city} · {msg.action}
          </p>
          <p className="text-white/28 text-[10px] mt-0.5">только что</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION WRAPPER (scroll reveal)
// ─────────────────────────────────────────────
function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, inView } = useInView();
  return (
    <section id={id} className={className}>
      <div
        ref={ref}
        className={`reveal stagger ${inView ? "in-view" : ""}`}
        style={{ transition: "opacity 0.8s ease, transform 0.8s ease" }}
      >
        {children}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// SECTION LABEL
// ─────────────────────────────────────────────
function SectionBadge({ text }: { text: string }) {
  return <div className="section-badge mb-5 w-fit">{text}</div>;
}

// ─────────────────────────────────────────────
// DASHBOARD MOCKUP (Hero visual)
// ─────────────────────────────────────────────
function DashboardMockup() {
  const zones = [
    { name: "A1", fill: 85 },
    { name: "A2", fill: 62 },
    { name: "B1", fill: 91 },
    { name: "B2", fill: 34 },
    { name: "C1", fill: 78 },
    { name: "C2", fill: 55 },
    { name: "D1", fill: 23 },
    { name: "D2", fill: 70 },
  ];
  const orders = [
    { id: "#4521", items: "12 шт", done: true },
    { id: "#4520", items: "3 шт", done: false },
    { id: "#4519", items: "7 шт", done: true },
  ];
  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute inset-0 rounded-3xl blur-3xl opacity-25 bg-gradient-to-br from-blue-600 via-violet-600 to-cyan-600 scale-90" />
      <div className="relative rounded-2xl border border-white/10 bg-[#090f20]/95 backdrop-blur-xl overflow-hidden shadow-2xl blue-glow">
        {/* Titlebar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-gradient-to-r from-blue-500/5 to-violet-500/5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="live-ring absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="text-[11px] text-white/60 font-medium tracking-wide">
              Склад-Софт · Live
            </span>
          </div>
          <span className="text-[10px] text-white/30 tabular-nums">
            13:47:23
          </span>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
          {[
            { label: "Заказов", val: "1 284", sub: "+18% сег.", c: "text-blue-400" },
            { label: "В работе", val: "247", sub: "активных", c: "text-amber-400" },
            { label: "KPI", val: "94%", sub: "+6% нед.", c: "text-emerald-400" },
          ].map((s, i) => (
            <div key={i} className="p-3">
              <div className="text-[10px] text-white/40 mb-1">{s.label}</div>
              <div className="text-base font-bold text-white leading-none counter-num">
                {s.val}
              </div>
              <div className={`text-[10px] mt-1 ${s.c}`}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Zone heatmap */}
        <div className="px-3 py-2.5 border-t border-white/[0.06]">
          <div className="text-[9px] text-white/35 mb-2 uppercase tracking-widest">
            Загруженность зон
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {zones.map((z) => (
              <div
                key={z.name}
                className="bg-white/[0.02] rounded-lg p-2 border border-white/[0.05]"
              >
                <div className="text-[9px] font-semibold text-white/50 mb-1.5">
                  {z.name}
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${z.fill > 80
                        ? "bg-red-400"
                        : z.fill > 60
                          ? "bg-amber-400"
                          : "bg-blue-400"
                      }`}
                    style={{ width: `${z.fill}%` }}
                  />
                </div>
                <div className="text-[9px] text-white/25 mt-1">{z.fill}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="px-3 pb-3 border-t border-white/[0.06]">
          <div className="text-[9px] text-white/35 pt-2.5 mb-2 uppercase tracking-widest">
            Последние заказы
          </div>
          <div className="space-y-1.5">
            {orders.map((o) => (
              <div
                key={o.id}
                className="flex items-center gap-2 text-[10px] px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
              >
                <span className="text-white/70 font-medium w-11">{o.id}</span>
                <span className="text-white/40 flex-1">{o.items}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${o.done
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-blue-500/10 text-blue-400"
                    }`}
                >
                  {o.done ? "Готов" : "Сборка"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer bar */}
        <div className="px-3 py-2 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-white/25" />
            <span className="text-[9px] text-white/30">12 онлайн</span>
          </div>
          <span className="text-[9px] text-emerald-400/60">
            ↑ Обновлено только что
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: "Функции", href: "#features" },
    { label: "Как работает", href: "#how" },
    { label: "Инновации", href: "#innovations" },
    { label: "Цены", href: "#pricing" },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled
          ? "bg-[#060b18]/90 backdrop-blur-2xl border-b border-white/[0.06] shadow-2xl shadow-black/30"
          : ""
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-black text-white text-lg tracking-tight">
              Склад<span className="text-blue-400">-Софт</span>
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-white/55 hover:text-white transition-colors duration-150 font-medium"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="#pricing"
              className="text-sm text-white/50 hover:text-white transition-colors font-medium"
            >
              Войти
            </a>
            <a
              href="#cta"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-px"
            >
              Начать бесплатно
            </a>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 -mr-2 text-white/60 hover:text-white"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden bg-[#090f20]/98 border-t border-white/[0.06] px-4 pt-3 pb-5 space-y-1">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-white/[0.04] text-sm font-medium transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#cta"
            onClick={() => setOpen(false)}
            className="block text-center mt-3 px-4 py-3 rounded-xl bg-blue-600 text-sm font-bold text-white"
          >
            Начать бесплатно — бесплатно 14 дней
          </a>
        </div>
      )}
    </header>
  );
}

// ─────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────
function HeroSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative min-h-[100svh] flex items-center pt-24 pb-20 overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 grid-pattern" />

      {/* Orbs */}
      <div className="absolute top-16 left-[20%] w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-[10%] w-[400px] h-[400px] rounded-full bg-violet-600/8 blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-64 h-64 rounded-full bg-cyan-500/5 blur-2xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-[1fr_460px] xl:grid-cols-[1fr_520px] gap-12 lg:gap-16 items-center">
          {/* LEFT */}
          <div
            className={`transition-all duration-1000 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
          >
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 mb-7 px-3.5 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5">
              <span className="relative flex h-2 w-2">
                <span className="live-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-xs text-emerald-400 font-semibold">
                Доверяют 500+ складов по всей России
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display font-black text-[clamp(2.4rem,5.5vw,4.5rem)] leading-[1.04] tracking-tight text-white mb-6">
              Управление{" "}
              <span className="gradient-text-blue">складом,</span>
              <br />
              которое работает{" "}
              <span className="relative">
                <span className="gradient-text">с первого дня.</span>
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  viewBox="0 0 300 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 6C60 2 120 1 180 3C220 4.5 260 6 299 4"
                    stroke="url(#ul)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="ul" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#60a5fa" />
                      <stop offset="0.5" stopColor="#a78bfa" />
                      <stop offset="1" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>

            {/* Sub */}
            <p className="text-base sm:text-lg text-white/55 leading-relaxed mb-9 max-w-[520px]">
              Запустите склад за{" "}
              <strong className="text-white font-semibold">1 день</strong>{" "}
              вместо 6–12 месяцев внедрения. Система для{" "}
              <TypewriterWords />
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-10">
              <a
                href="#cta"
                className="btn-pulse group relative inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5"
              >
                Начать бесплатно
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-white/75 hover:text-white font-bold text-sm transition-all duration-200"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Смотреть демо
              </a>
            </div>

            {/* Trust chips */}
            <div className="flex flex-wrap gap-5">
              {[
                { icon: Shield, text: "14 дней бесплатно" },
                { icon: Clock, text: "Запуск за 1 день" },
                { icon: Lock, text: "Данные в России" },
                { icon: Zap, text: "Без установки" },
              ].map((t) => (
                <div key={t.text} className="flex items-center gap-1.5">
                  <t.icon className="w-3.5 h-3.5 text-blue-400/60" />
                  <span className="text-xs text-white/38">{t.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Dashboard */}
          <div
            className={`relative transition-all duration-1000 delay-200 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
          >
            <DashboardMockup />

            {/* Floating badge 1 */}
            <div className="absolute -left-6 top-1/3 hidden lg:flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#0a1128] border border-white/10 shadow-2xl float">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-none">
                  +40%
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  Скорость сборки
                </div>
              </div>
            </div>

            {/* Floating badge 2 */}
            <div className="absolute -right-6 bottom-1/4 hidden lg:flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#0a1128] border border-white/10 shadow-2xl float-delayed">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-none">
                  99.8%
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  Точность учёта
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// PROBLEM
// ─────────────────────────────────────────────
function ProblemSection() {
  const { ref, inView } = useInView();
  const c1 = useCounter(23, 1800, inView);
  const c2 = useCounter(47, 1800, inView);
  const c3 = useCounter(12, 1800, inView);

  return (
    <section id="problem" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 dot-pattern opacity-30" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-16">
          <SectionBadge text="Проблема" />
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
            Ваш склад теряет деньги{" "}
            <span className="gradient-text">каждый день</span>
          </h2>
          <p className="mt-4 text-white/50 max-w-xl mx-auto text-base sm:text-lg">
            Большинство складов работают в Excel, 1С или устаревших системах.
            Это стоит вам времени и денег.
          </p>
        </div>

        {/* Pain cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-16">
          {[
            {
              icon: AlertTriangle,
              title: "Ошибки в Excel и 1С",
              desc: "Ручной учёт приводит к пересортице, потере товаров и многочасовым инвентаризациям. Каждая ошибка — это деньги.",
              color: "text-red-400",
              bg: "bg-red-500/5",
              border: "border-red-500/15",
            },
            {
              icon: Boxes,
              title: "Товары теряются",
              desc: "Без системы адресного хранения невозможно быстро найти нужный товар. Сотрудники тратят часы на поиски.",
              color: "text-amber-400",
              bg: "bg-amber-500/5",
              border: "border-amber-500/15",
            },
            {
              icon: Smartphone,
              title: "Нет мобильного доступа",
              desc: "Ваши сотрудники привязаны к стационарным компьютерам. Передвижение по складу с ноутбуком — не вариант.",
              color: "text-orange-400",
              bg: "bg-orange-500/5",
              border: "border-orange-500/15",
            },
          ].map((card, i) => (
            <div
              key={i}
              className={`glass rounded-2xl p-6 border ${card.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
            >
              <div
                className={`w-11 h-11 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center mb-4`}
              >
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-2">
                {card.title}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div
          ref={ref}
          className="grid md:grid-cols-3 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.06]"
        >
          {[
            {
              val: c1,
              suffix: "%",
              label: "Ошибок при инвентаризации",
              sub: "В среднем при ручном учёте",
            },
            {
              val: c2,
              suffix: "k$",
              label: "Средние потери в год",
              sub: "Из-за ошибок учёта и пересортицы",
            },
            {
              val: c3,
              suffix: " мес",
              label: "Внедрение корпоративной WMS",
              sub: "Вместо 1 дня в Склад-Софт",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-[#0a1128] px-8 py-10 text-center"
            >
              <div className={`font-display font-black text-5xl lg:text-6xl counter-num mb-2 transition-all duration-500 ${inView ? "text-white counter-glow" : "text-white/20"}`}>
                {s.val}
                <span className="gradient-text-blue">{s.suffix}</span>
              </div>
              <div className="font-display font-bold text-white text-lg mb-1">
                {s.label}
              </div>
              <div className="text-white/40 text-sm">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FEATURES
// ─────────────────────────────────────────────
function FeaturesSection() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    if (gridRef.current) obs.observe(gridRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <Section id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <SectionBadge text="Функции" />
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
            Всё что нужно современному{" "}
            <span className="gradient-text">складу</span>
          </h2>
          <p className="mt-4 text-white/50 max-w-xl mx-auto text-base sm:text-lg">
            Полный набор инструментов для управления складом в одной системе.
            Никаких дополнительных модулей.
          </p>
        </div>

        <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className={`feature-card ${visible ? "fc-visible" : ""} glass rounded-2xl p-6 border border-white/[0.06] ${f.border} hover:-translate-y-1 hover:shadow-2xl group cursor-default`}
            >
              <div
                className={`w-11 h-11 rounded-xl ${f.iconBg} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}
              >
                <f.icon className={`w-5 h-5 ${f.iconColor}`} />
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-2">
                {f.title}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────
// HOW IT WORKS
// ─────────────────────────────────────────────
function HowItWorksSection() {
  return (
    <Section id="how" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <SectionBadge text="Как это работает" />
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
            Запуск за{" "}
            <span className="gradient-text-blue">один рабочий день</span>
          </h2>
          <p className="mt-4 text-white/50 max-w-lg mx-auto">
            Пока корпоративные системы внедряются месяцами, вы уже работаете.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-[52px] left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="relative text-center group">
                {/* Number circle */}
                <div className="relative inline-flex items-center justify-center w-[72px] h-[72px] mb-6">
                  <div className="absolute inset-0 rounded-full bg-blue-600/10 border border-blue-500/20 group-hover:border-blue-500/50 transition-colors" />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/5 to-violet-500/5" />
                  <step.icon className="w-6 h-6 text-blue-400 relative z-10" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-[10px] font-black text-white">
                    {i + 1}
                  </div>
                </div>

                <div className="text-[11px] font-semibold text-blue-400/70 uppercase tracking-widest mb-2">
                  {step.sub}
                </div>
                <h3 className="font-display font-bold text-xl text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-white/45 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-14">
          <a
            href="#cta"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/25 hover:-translate-y-0.5"
          >
            Запустить склад сегодня
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────
// INNOVATIONS
// ─────────────────────────────────────────────
function InnovationSection() {
  return (
    <section id="innovations" className="py-24 relative overflow-hidden">
      {/* Dark gradient bg */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-[#060b18] to-violet-950/20" />
      <div className="absolute inset-0 dot-pattern opacity-20" />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 section-badge mb-5">
            <Sparkles className="w-3 h-3" />
            Инновации
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-5">
            Powered by{" "}
            <span className="gradient-text">Artificial Intelligence</span>
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            Склад-Софт — не просто система учёта. Это интеллектуальная
            платформа, которая оптимизирует процессы склада с помощью AI,
            сокращая издержки и повышая точность до 99.8%.
          </p>
        </div>

        {/* Innovation pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-20">
          {INNOVATIONS.map((item, i) => (
            <div key={i} className="innovation-pill">
              <item.icon className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-sm font-semibold text-white/80">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Innovation cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: Brain,
              title: "AI-оптимизация размещения",
              desc: "Алгоритм машинного обучения анализирует историю заказов и автоматически предлагает оптимальные ячейки для каждого товара, сокращая путь сборщика.",
              tag: "AI · ML",
              color: "violet",
              iconBg: "bg-violet-500/10",
              iconColor: "text-violet-400",
            },
            {
              icon: Navigation,
              title: "Автомаршрутизация сборки",
              desc: "Система строит кратчайший маршрут для сборки каждого заказа или пакета заказов. Экономит до 40% времени сборщиков.",
              tag: "Routing",
              color: "blue",
              iconBg: "bg-blue-500/10",
              iconColor: "text-blue-400",
            },
            {
              icon: Map,
              title: "Цифровая карта склада",
              desc: "Интерактивная 2D-карта склада в реальном времени. Видите загрузку каждой зоны, местонахождение сотрудников и движение товаров.",
              tag: "Visualisation",
              color: "cyan",
              iconBg: "bg-cyan-500/10",
              iconColor: "text-cyan-400",
            },
            {
              icon: Activity,
              title: "Аналитика в реальном времени",
              desc: "Дашборд обновляется каждые несколько секунд. KPI сотрудников, скорость обработки, SLA по отгрузке — всё в одном экране.",
              tag: "Real-time",
              color: "emerald",
              iconBg: "bg-emerald-500/10",
              iconColor: "text-emerald-400",
            },
            {
              icon: Smartphone,
              title: "Mobile-first управление",
              desc: "Система изначально проектировалась для работы на мобильных устройствах. Не адаптация десктопа — настоящий мобильный опыт.",
              tag: "Mobile",
              color: "amber",
              iconBg: "bg-amber-500/10",
              iconColor: "text-amber-400",
            },
            {
              icon: Cpu,
              title: "Предиктивная аналитика",
              desc: "AI предсказывает потребность в пополнении запасов, сезонные пики и узкие места в складских процессах до того, как они станут проблемой.",
              tag: "Predictive AI",
              color: "rose",
              iconBg: "bg-rose-500/10",
              iconColor: "text-rose-400",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-6 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}
                >
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
                  {card.tag}
                </span>
              </div>
              <h3 className="font-display font-bold text-white text-lg mb-2">
                {card.title}
              </h3>
              <p className="text-white/45 text-sm leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// USE CASES
// ─────────────────────────────────────────────
function UseCasesSection() {
  return (
    <Section id="usecases" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <SectionBadge text="Кому подходит" />
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
            Решение для любого{" "}
            <span className="gradient-text">склада</span>
          </h2>
          <p className="mt-4 text-white/50 max-w-lg mx-auto">
            Склад-Софт адаптируется под задачи бизнеса любого масштаба.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {USE_CASES.map((uc, i) => (
            <div
              key={i}
              className={`relative glass rounded-2xl p-7 border ${uc.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group overflow-hidden`}
            >
              {/* Gradient blob */}
              <div
                className={`absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br ${uc.bg} blur-2xl opacity-70 pointer-events-none`}
              />
              <div className="relative">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${uc.bg} border ${uc.border} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                >
                  <uc.icon className="w-6 h-6 text-white/80" />
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-1">
                  {uc.audience}
                </div>
                <h3 className="font-display font-black text-2xl text-white mb-3">
                  {uc.title}
                </h3>
                <p className="text-white/55 text-base leading-relaxed mb-5">
                  {uc.benefit}
                </p>
                <a
                  href="#cta"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Узнать подробнее
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────
// INTEGRATIONS
// ─────────────────────────────────────────────
function IntegrationsSection() {
  // Double for seamless loop
  const row = [...INTEGRATIONS, ...INTEGRATIONS];

  return (
    <Section id="integrations" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/8 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <SectionBadge text="Интеграции" />
            <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
              Подключается к{" "}
              <span className="gradient-text">вашей экосистеме</span>
            </h2>
            <p className="mt-4 text-white/50 max-w-lg mx-auto">
              Синхронизация с маркетплейсами, ERP и CRM за несколько минут.
              Никакого программирования.
            </p>
          </div>
        </div>

        {/* Marquee row */}
        <div className="overflow-hidden mb-5">
          <div className="marquee-inner gap-4 px-4">
            {row.map((int, i) => (
              <div
                key={i}
                className="integration-card glass rounded-2xl p-5 border border-white/[0.06] text-center cursor-default shrink-0 w-36 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl mx-2"
              >
                <div
                  className={`w-12 h-12 ${int.color} rounded-xl mx-auto mb-3 flex items-center justify-center shadow-lg`}
                >
                  <span className="text-white font-black text-sm">{int.abbr}</span>
                </div>
                <div className="text-xs font-semibold text-white/65 leading-tight">
                  {int.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-white/30 text-sm mt-4">
          И ещё 50+ интеграций · REST API для любых систем
        </p>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────────
function PricingSection() {
  return (
    <Section id="pricing" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 dot-pattern opacity-20" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <SectionBadge text="Цены" />
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
            Прозрачные цены.{" "}
            <span className="gradient-text">Без сюрпризов.</span>
          </h2>
          <p className="mt-4 text-white/50 max-w-lg mx-auto">
            Начните бесплатно. Масштабируйтесь по мере роста. Отмена в любой
            момент.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
          {PRICING.map((tier, i) => {
            const inner = (
              <div
                className={`relative p-6 transition-all duration-300 hover:-translate-y-1 ${
                  tier.popular
                    ? "grad-border-inner rounded-[17px]"
                    : "glass rounded-2xl border border-white/[0.07] hover:border-white/[0.14] hover:shadow-2xl"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-black shadow-lg shadow-blue-600/30">
                      <Star className="w-3 h-3 fill-current" />
                      Популярный
                    </span>
                  </div>
                )}
                <div className="mb-5 mt-1">
                  <div className="font-display font-black text-lg text-white mb-1">{tier.name}</div>
                  <p className="text-white/45 text-xs leading-relaxed">{tier.description}</p>
                </div>
                <div className="mb-6">
                  <span className="font-display font-black text-4xl text-white counter-num">{tier.price}</span>
                  {tier.period && <span className="text-white/40 text-sm ml-1">{tier.period}</span>}
                </div>
                <ul className="space-y-2.5 mb-7">
                  {tier.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${tier.popular ? "text-blue-400" : "text-white/35"}`} />
                      <span className="text-white/65 text-sm">{feat}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#cta"
                  className={`block text-center px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                    tier.popular
                      ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-600/25 hover:-translate-y-px"
                      : "bg-white/[0.06] text-white/80 hover:bg-white/[0.10] hover:text-white border border-white/10"
                  }`}
                >
                  {tier.cta}
                </a>
              </div>
            );
            return tier.popular ? (
              <div key={i} className="grad-border-wrap relative">{inner}</div>
            ) : (
              <div key={i}>{inner}</div>
            );
          })}
        </div>

        <p className="text-center mt-8 text-white/30 text-sm">
          Все тарифы включают 14-дневный бесплатный период · Без кредитной карты
        </p>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────
// TESTIMONIALS
// ─────────────────────────────────────────────
function TestimonialsSection() {
  return (
    <Section id="testimonials" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <SectionBadge text="Клиенты" />
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
            Что говорят{" "}
            <span className="gradient-text">наши клиенты</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-7 border border-white/[0.07] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-white/[0.14] flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-5">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-white/65 text-sm leading-relaxed flex-1 mb-6">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center shrink-0 text-xs font-black text-white`}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="font-display font-bold text-white text-sm">
                    {t.name}
                  </div>
                  <div className="text-white/40 text-xs">
                    {t.role} · {t.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────
function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Section id="faq" className="py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <SectionBadge text="FAQ" />
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
            Частые <span className="gradient-text">вопросы</span>
          </h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className={`glass rounded-2xl border transition-all duration-200 ${open === i ? "border-blue-500/25" : "border-white/[0.06]"
                }`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
              >
                <span
                  className={`font-display font-bold text-base transition-colors ${open === i ? "text-white" : "text-white/75"
                    }`}
                >
                  {item.q}
                </span>
                <span
                  className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${open === i
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-white/[0.05] text-white/40"
                    }`}
                >
                  {open === i ? (
                    <Minus className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                </span>
              </button>

              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-white/50 text-sm leading-relaxed">
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────
// CTA SECTION
// ─────────────────────────────────────────────
// ─── Lead form state type ───────────────────────────────────
type FormState = "idle" | "loading" | "success" | "duplicate" | "error";

function CTASection() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [status, setStatus] = useState<FormState>("idle");
  const [errMsg, setErrMsg] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrMsg("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "cta" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrMsg(data.error || "Ошибка отправки");
        setStatus("error");
        return;
      }

      setStatus(data.duplicate ? "duplicate" : "success");
    } catch {
      setErrMsg("Нет соединения. Попробуйте позже.");
      setStatus("error");
    }
  };

  const inputCls =
    "w-full px-4 py-3.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.07] transition-all";

  return (
    <section id="cta" className="py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-violet-950/20 to-[#060b18]" />
      <div className="absolute inset-0 grid-pattern opacity-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-3xl pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 section-badge mb-7">
          <Zap className="w-3 h-3" />
          Начните уже сегодня
        </div>

        <h2 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-white leading-[1.06] tracking-tight mb-5">
          Готовы трансформировать{" "}
          <span className="gradient-text">свой склад?</span>
        </h2>

        <p className="text-white/55 text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          Оставьте заявку — мы свяжемся в течение 24 часов, расскажем о&nbsp;системе
          и&nbsp;запустим бесплатный тестовый период прямо на&nbsp;вашем складе.
        </p>

        {/* ── Success ── */}
        {(status === "success" || status === "duplicate") && (
          <div className="flex flex-col items-center gap-3 mb-8 px-8 py-8 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 max-w-lg mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <p className="text-emerald-300 font-bold text-lg">
              {status === "duplicate"
                ? "Вы уже в списке ожидания!"
                : "Заявка принята — отличный выбор!"}
            </p>
            <p className="text-white/45 text-sm">
              {status === "duplicate"
                ? "Ваш email уже зарегистрирован. Мы скоро свяжемся с вами."
                : "Наш менеджер напишет вам в течение 24 часов и организует демо-сессию."}
            </p>
          </div>
        )}

        {/* ── Form ── */}
        {status !== "success" && status !== "duplicate" && (
          <form
            onSubmit={handleSubmit}
            className="glass rounded-2xl border border-white/[0.08] p-6 sm:p-8 max-w-lg mx-auto mb-8 text-left"
          >
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-1.5 uppercase tracking-wider">
                  Имя
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Иван Петров"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-1.5 uppercase tracking-wider">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={set("email")}
                  placeholder="ivan@company.ru"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-1.5 uppercase tracking-wider">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+7 (999) 123-45-67"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-1.5 uppercase tracking-wider">
                  Компания
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={set("company")}
                  placeholder="ООО Склад+"
                  className={inputCls}
                />
              </div>
            </div>

            {status === "error" && (
              <p className="text-red-400 text-xs mb-4 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {errMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black text-sm transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {status === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Отправляем...
                </span>
              ) : (
                "Записаться на бесплатное демо →"
              )}
            </button>

            <p className="text-center text-white/25 text-xs mt-3">
              Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности
            </p>
          </form>
        )}

        {/* Sub-trust */}
        <div className="flex flex-wrap justify-center gap-6">
          {[
            { icon: Shield, text: "14 дней бесплатно" },
            { icon: Lock, text: "Без кредитной карты" },
            { icon: Zap, text: "Запуск за 1 день" },
          ].map((t) => (
            <div key={t.text} className="flex items-center gap-1.5">
              <t.icon className="w-3.5 h-3.5 text-white/30" />
              <span className="text-sm text-white/35">{t.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#040810]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <Boxes className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-black text-white text-lg">
                Склад<span className="text-blue-400">-Софт</span>
              </span>
            </div>
            <p className="text-white/38 text-sm leading-relaxed max-w-[200px]">
              Облачная система управления складом нового поколения.
            </p>
          </div>

          {/* Product */}
          <div>
            <div className="text-white/25 text-xs font-bold uppercase tracking-widest mb-4">
              Продукт
            </div>
            <ul className="space-y-2.5">
              {[
                "Функции",
                "Интеграции",
                "Цены",
                "Безопасность",
                "API документация",
              ].map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-white/45 hover:text-white/80 text-sm transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <div className="text-white/25 text-xs font-bold uppercase tracking-widest mb-4">
              Компания
            </div>
            <ul className="space-y-2.5">
              {["О нас", "Блог", "Партнёрам", "Вакансии", "Пресс-центр"].map(
                (l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-white/45 hover:text-white/80 text-sm transition-colors"
                    >
                      {l}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div className="text-white/25 text-xs font-bold uppercase tracking-widest mb-4">
              Контакты
            </div>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:hello@sklad-soft.ru"
                  className="flex items-center gap-2 text-white/45 hover:text-white/80 text-sm transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  kap.moral22@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+74951234567"
                  className="flex items-center gap-2 text-white/45 hover:text-white/80 text-sm transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  +7 (920) 832 - 52 - 54
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/25 text-xs">
            © 2025 Склад-Софт. Все права защищены.
          </p>
          <div className="flex items-center gap-5">
            {["Конфиденциальность", "Условия использования", "Cookies"].map(
              (l) => (
                <a
                  key={l}
                  href="#"
                  className="text-white/25 hover:text-white/50 text-xs transition-colors"
                >
                  {l}
                </a>
              )
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────
export default function WMSLanding() {
  return (
    <main className="overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <StatsTicker />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <InnovationSection />
      <UseCasesSection />
      <IntegrationsSection />
      <PricingSection />
      {/* <TestimonialsSection /> */}
      <FAQSection />
      <CTASection />
      <Footer />
      <SocialProofToast />
    </main>
  );
}
