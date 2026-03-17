'use client'

import { useState } from 'react'
import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/cn'
import { Save, RefreshCw, CheckCircle, XCircle, Plug } from 'lucide-react'
import toast from 'react-hot-toast'

interface IntegrationConfig {
  id: string
  name: string
  description: string
  logoText: string
  logoColor: string
  webhookUrl: string
  enabled: boolean
  lastSync?: string
}

const INITIAL_CONFIGS: IntegrationConfig[] = [
  {
    id: 'wildberries',
    name: 'Wildberries',
    description: 'Синхронизация заказов и остатков с WB. Получение уведомлений о новых заказах.',
    logoText: 'WB',
    logoColor: 'bg-purple-600',
    webhookUrl: '',
    enabled: false,
    lastSync: undefined,
  },
  {
    id: 'ozon',
    name: 'Ozon',
    description: 'Интеграция с маркетплейсом Ozon: заказы, остатки, обновление статусов.',
    logoText: 'OZ',
    logoColor: 'bg-blue-500',
    webhookUrl: '',
    enabled: false,
    lastSync: undefined,
  },
  {
    id: '1c',
    name: '1С:Предприятие',
    description: 'Обмен данными с 1С: товары, заказы, движения. Синхронизация в реальном времени.',
    logoText: '1С',
    logoColor: 'bg-orange-500',
    webhookUrl: '',
    enabled: false,
    lastSync: undefined,
  },
  {
    id: 'cdek',
    name: 'СДЭК',
    description: 'Отслеживание доставки, создание накладных, печать этикеток.',
    logoText: 'СД',
    logoColor: 'bg-green-600',
    webhookUrl: '',
    enabled: false,
    lastSync: undefined,
  },
]

function IntegrationCard({
  config,
  onChange,
}: {
  config: IntegrationConfig
  onChange: (id: string, patch: Partial<IntegrationConfig>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [urlDraft, setUrlDraft] = useState(config.webhookUrl)

  const handleSave = () => {
    onChange(config.id, { webhookUrl: urlDraft, enabled: urlDraft.length > 0 })
    setEditing(false)
    toast.success(`${config.name}: настройки сохранены`)
  }

  const handleTest = () => {
    if (!config.webhookUrl) {
      toast.error('Укажите Webhook URL')
      return
    }
    // Simulate test
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: `Тест ${config.name}...`,
        success: `${config.name}: соединение успешно`,
        error: `${config.name}: ошибка соединения`,
      }
    )
    onChange(config.id, { lastSync: new Date().toISOString() })
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0',
              config.logoColor
            )}
          >
            {config.logoText}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-neutral-900">{config.name}</h3>
              {config.enabled ? (
                <Badge variant="active"><CheckCircle className="h-3 w-3 mr-1" />Включено</Badge>
              ) : (
                <Badge variant="cancelled"><XCircle className="h-3 w-3 mr-1" />Отключено</Badge>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">{config.description}</p>
          </div>
        </div>
      </div>

      {config.lastSync && (
        <p className="text-xs text-neutral-400">
          Последняя синхронизация: {new Date(config.lastSync).toLocaleString('ru-RU')}
        </p>
      )}

      {editing ? (
        <div className="space-y-3">
          <Input
            label="Webhook URL"
            placeholder="https://your-server.com/webhook/..."
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>
              <Save className="h-3.5 w-3.5 mr-1" /> Сохранить
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { setEditing(false); setUrlDraft(config.webhookUrl) }}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Настроить
          </Button>
          {config.enabled && (
            <Button size="sm" variant="secondary" onClick={handleTest}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Тест
            </Button>
          )}
          {config.enabled && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onChange(config.id, { enabled: false, webhookUrl: '' })}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Отключить
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

export default function IntegrationsPage() {
  const [configs, setConfigs] = useState<IntegrationConfig[]>(INITIAL_CONFIGS)

  const handleChange = (id: string, patch: Partial<IntegrationConfig>) => {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    )
  }

  const activeCount = configs.filter((c) => c.enabled).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Plug className="h-6 w-6 text-primary-500" />
            Интеграции
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {activeCount > 0 ? `${activeCount} активных интеграций` : 'Подключение внешних систем'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {configs.map((config) => (
          <IntegrationCard
            key={config.id}
            config={config}
            onChange={handleChange}
          />
        ))}
      </div>

      <Card className="p-4 bg-neutral-50 border-neutral-200">
        <p className="text-sm text-neutral-600">
          <span className="font-semibold">API документация:</span>{' '}
          Для настройки интеграций используйте Webhook URL вашей системы.
          Все события отправляются в формате JSON через POST-запросы.
          Поддерживаемые события: <code className="font-mono-sku text-xs bg-neutral-200 px-1 rounded">order.created</code>,{' '}
          <code className="font-mono-sku text-xs bg-neutral-200 px-1 rounded">order.shipped</code>,{' '}
          <code className="font-mono-sku text-xs bg-neutral-200 px-1 rounded">inventory.moved</code>,{' '}
          <code className="font-mono-sku text-xs bg-neutral-200 px-1 rounded">task.completed</code>
        </p>
      </Card>
    </div>
  )
}
