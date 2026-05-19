import { useState } from 'react'
import './App.css'

type ScenarioId = 'desktop-form' | 'mobile-help' | 'fraud-guard' | 'family-mode'
type RiskLevel = 'low' | 'medium' | 'high'
type Decision = 'allow' | 'require_confirmation' | 'deny'
type DeviceType = 'desktop' | 'mobile'
type EntryMode = 'always_on' | 'trigger'
type RedactionLevel = 'none' | 'partial' | 'strict'
type SensitiveEntity = 'id_number' | 'phone' | 'otp' | 'payment' | 'address' | 'medical' | 'unknown'
type EdgeEventType = 'screen_changed' | 'notification' | 'incoming_call' | 'sms_like' | 'user_trigger' | 'risk_keyword'
type EdgeEventSource = 'accessibility' | 'notification_listener' | 'user_button' | 'openclaw' | 'manual_demo'
type RoutingMode = 'local_only' | 'cloud_planner' | 'ask_user' | 'stop'
type Complexity = 'simple' | 'moderate' | 'complex'
type ExecutionSurface = 'android' | 'desktop' | 'cloud_tool' | 'user_only'

type DetectedElement = {
  label: string
  kind: string
  value?: string
  sensitive?: boolean
}

type EdgeEvent = {
  event_type: EdgeEventType
  source: EdgeEventSource
  timestamp: string
  confidence: number
  raw_data_scope: 'on_device_only'
}

type ScreenObservation = {
  device_type: DeviceType
  screenshot_ref: string
  visible_text: string[]
  detected_elements: DetectedElement[]
  privacy_flags: string[]
  task_goal: string
  redaction_level: RedactionLevel
  sensitive_entities: SensitiveEntity[]
  cloud_safe: boolean
}

type RoutingDecision = {
  mode: RoutingMode
  reason: string
  privacy_blocked: boolean
  complexity: Complexity
}

type NextAction = {
  action_type: 'click' | 'type_text' | 'scroll' | 'ask_user' | 'explain' | 'confirm' | 'stop'
  target: string
  arguments: Record<string, string | number>
  reason: string
  risk_level: RiskLevel
  requires_confirmation: boolean
  execution_surface: ExecutionSurface
  confirmation_text: string
  allowed_tool: string
}

type GuardDecision = {
  decision: Decision
  risk_level: RiskLevel
  reason: string
  safe_alternative: string
  policy_tags: string[]
  requires_human: boolean
}

type CloudPayload = {
  observation_id: string
  device_type: DeviceType
  task_goal: string
  visible_text: string[]
  privacy_flags: string[]
  sensitive_entities: SensitiveEntity[]
  redacted_elements: DetectedElement[]
  available_tools: string[]
}

type Scenario = {
  id: ScenarioId
  title: string
  subtitle: string
  userGoal: string
  device: DeviceType
  impact: string
  edgeEvent: EdgeEvent
  observation: ScreenObservation
  routing: RoutingDecision
  action: NextAction
  guard: GuardDecision
  familySummary: string
  screen: {
    appTitle: string
    alert?: string
    fields: { label: string; value: string; status?: 'ok' | 'empty' | 'sensitive' }[]
    buttons: { label: string; intent?: 'safe' | 'warn' | 'danger' }[]
    notes: string[]
  }
}

const availableTools = ['observe_screen', 'click', 'type_text', 'scroll', 'ask_user', 'summarize_for_family', 'stop']

const scenarios: Scenario[] = [
  {
    id: 'desktop-form',
    title: '桌面表单助手',
    subtitle: '识别字段、解释下一步，并在提交前停住确认',
    userGoal: '帮我完成社区补贴申请表，但不要直接提交。',
    device: 'desktop',
    impact: '降低复杂政务/福利表单的门槛，帮助低数字技能用户独立完成申请。',
    edgeEvent: {
      event_type: 'screen_changed',
      source: 'openclaw',
      timestamp: '2026-05-19T09:12:08+08:00',
      confidence: 0.91,
      raw_data_scope: 'on_device_only',
    },
    observation: {
      device_type: 'desktop',
      screenshot_ref: 'desktop-benefit-form',
      visible_text: ['Community Benefit Form', 'Full name', 'Phone number', 'Monthly income', 'Submit application'],
      detected_elements: [
        { label: 'Full name', kind: 'input', value: 'Lin Chen' },
        { label: 'Phone number', kind: 'input', value: '[REDACTED_PHONE]', sensitive: true },
        { label: 'Monthly income', kind: 'input', value: 'missing' },
        { label: 'Submit application', kind: 'button' },
      ],
      privacy_flags: ['phone_number'],
      task_goal: 'Complete missing fields and stop before submission.',
      redaction_level: 'partial',
      sensitive_entities: ['phone'],
      cloud_safe: true,
    },
    routing: {
      mode: 'ask_user',
      reason: '只缺月收入字段，可本地澄清；提交动作属于高风险，暂不上云执行。',
      privacy_blocked: false,
      complexity: 'moderate',
    },
    action: {
      action_type: 'ask_user',
      target: 'Monthly income field',
      arguments: { question: '请输入月收入金额，我会填写字段，但不会提交表单。' },
      reason: '表单只缺少月收入。提交按钮是高风险动作，必须确认后才能继续。',
      risk_level: 'medium',
      requires_confirmation: false,
      execution_surface: 'desktop',
      confirmation_text: '我可以继续填写字段，但提交前会再次确认。',
      allowed_tool: 'ask_user',
    },
    guard: {
      decision: 'require_confirmation',
      risk_level: 'high',
      reason: '提交申请会把个人信息发送给外部系统。',
      safe_alternative: '先保存草稿或让用户确认所有字段。',
      policy_tags: ['form_submission', 'personal_data'],
      requires_human: true,
    },
    familySummary: '用户正在填写社区补贴申请表。手机号已脱敏。当前缺少月收入字段，系统尚未提交。',
    screen: {
      appTitle: 'Community Benefit Form',
      fields: [
        { label: 'Full name', value: 'Lin Chen', status: 'ok' },
        { label: 'Phone number', value: '***-***-2840', status: 'sensitive' },
        { label: 'Monthly income', value: 'Needs user input', status: 'empty' },
      ],
      buttons: [{ label: 'Save draft', intent: 'safe' }, { label: 'Submit application', intent: 'danger' }],
      notes: ['Submit sends personal data.', 'AccessPilot stops before irreversible actions.'],
    },
  },
  {
    id: 'mobile-help',
    title: '手机截图导航助手',
    subtitle: '从截图理解当前页面，给出安全的下一步',
    userGoal: '我想把字号调大，但不知道现在这个页面该点哪里。',
    device: 'mobile',
    impact: '让手机设置、医疗挂号、交通购票等流程变得可解释，减少远程求助成本。',
    edgeEvent: {
      event_type: 'user_trigger',
      source: 'user_button',
      timestamp: '2026-05-19T09:13:22+08:00',
      confidence: 1,
      raw_data_scope: 'on_device_only',
    },
    observation: {
      device_type: 'mobile',
      screenshot_ref: 'mobile-settings-display',
      visible_text: ['Settings', 'Display', 'Text size', 'Brightness', 'Accessibility'],
      detected_elements: [
        { label: 'Display', kind: 'list_item' },
        { label: 'Text size', kind: 'list_item' },
        { label: 'Accessibility', kind: 'list_item' },
      ],
      privacy_flags: [],
      task_goal: 'Increase text size from current settings screen.',
      redaction_level: 'none',
      sensitive_entities: [],
      cloud_safe: true,
    },
    routing: {
      mode: 'local_only',
      reason: '目标 UI 元素清晰、风险低，可由端侧直接给出下一步建议。',
      privacy_blocked: false,
      complexity: 'simple',
    },
    action: {
      action_type: 'click',
      target: 'Text size list item',
      arguments: { x: 184, y: 342 },
      reason: '当前截图中已经看到 Text size 选项，点击它是到达字号调节页面的安全下一步。',
      risk_level: 'low',
      requires_confirmation: false,
      execution_surface: 'android',
      confirmation_text: '这是低风险设置导航动作，可以继续。',
      allowed_tool: 'click',
    },
    guard: {
      decision: 'allow',
      risk_level: 'low',
      reason: '打开设置页中的字号选项是可逆、低风险操作。',
      safe_alternative: '如果目标不清晰，先要求用户发送更完整截图。',
      policy_tags: ['local_navigation', 'reversible_action'],
      requires_human: false,
    },
    familySummary: '用户在手机设置中寻找字号调节。建议点击 Text size。没有敏感信息。',
    screen: {
      appTitle: 'Settings',
      fields: [
        { label: 'Display', value: 'Opened', status: 'ok' },
        { label: 'Text size', value: 'Visible option', status: 'ok' },
        { label: 'Brightness', value: 'Not needed', status: 'ok' },
      ],
      buttons: [{ label: 'Text size', intent: 'safe' }, { label: 'Accessibility', intent: 'safe' }],
      notes: ['Low risk action.', 'Handled locally before cloud escalation.'],
    },
  },
  {
    id: 'fraud-guard',
    title: '防诈骗 / 高风险守卫',
    subtitle: '识别验证码、付款、授权等风险动作并阻断',
    userGoal: '这个页面让我输入短信验证码继续，我该不该输？',
    device: 'mobile',
    impact: '帮助用户在关键时刻停下来，减少验证码诈骗、恶意授权和误付款。',
    edgeEvent: {
      event_type: 'risk_keyword',
      source: 'accessibility',
      timestamp: '2026-05-19T09:14:44+08:00',
      confidence: 0.96,
      raw_data_scope: 'on_device_only',
    },
    observation: {
      device_type: 'mobile',
      screenshot_ref: 'otp-payment-warning',
      visible_text: ['Security verification', 'Enter SMS code', 'Authorize payment', 'Continue'],
      detected_elements: [
        { label: 'SMS code', kind: 'input', value: '[REDACTED_OTP]', sensitive: true },
        { label: 'Authorize payment', kind: 'button' },
        { label: 'Continue', kind: 'button' },
      ],
      privacy_flags: ['sms_code', 'payment_authorization'],
      task_goal: 'Decide whether entering the SMS code is safe.',
      redaction_level: 'strict',
      sensitive_entities: ['otp', 'payment'],
      cloud_safe: true,
    },
    routing: {
      mode: 'stop',
      reason: '验证码与付款授权同时出现，端侧即可判定为高风险，不需要云端规划执行。',
      privacy_blocked: false,
      complexity: 'moderate',
    },
    action: {
      action_type: 'stop',
      target: 'SMS code input',
      arguments: { message: '不要输入验证码。先确认页面来源和付款对象。' },
      reason: '验证码和付款授权同时出现，属于高风险动作。',
      risk_level: 'high',
      requires_confirmation: true,
      execution_surface: 'user_only',
      confirmation_text: '这是高风险操作。请先联系家人或官方客服核实。',
      allowed_tool: 'stop',
    },
    guard: {
      decision: 'deny',
      risk_level: 'high',
      reason: '输入短信验证码可能授权付款或账户操作，不能由 Agent 执行或鼓励继续。',
      safe_alternative: '联系官方客服或家人核实，不在当前页面输入验证码。',
      policy_tags: ['otp', 'payment', 'fraud_risk'],
      requires_human: true,
    },
    familySummary: '用户遇到短信验证码和付款授权页面。AccessPilot 已阻止继续操作，建议核实来源。',
    screen: {
      appTitle: 'Security verification',
      alert: 'High risk: SMS code + payment authorization',
      fields: [
        { label: 'SMS code', value: 'Do not enter', status: 'sensitive' },
        { label: 'Payment authorization', value: 'Detected', status: 'sensitive' },
      ],
      buttons: [{ label: 'Continue', intent: 'danger' }, { label: 'Call family', intent: 'safe' }],
      notes: ['Agent denies risky execution.', 'Safe alternative: verify source first.'],
    },
  },
  {
    id: 'family-mode',
    title: '家人远程协助模式',
    subtitle: '生成脱敏摘要，避免把完整截图和隐私直接转发',
    userGoal: '我想把现在遇到的问题发给女儿，但不想把身份证和手机号发出去。',
    device: 'desktop',
    impact: '让家庭远程协助更安全，保护身份证、手机号、验证码等敏感信息。',
    edgeEvent: {
      event_type: 'user_trigger',
      source: 'user_button',
      timestamp: '2026-05-19T09:15:40+08:00',
      confidence: 1,
      raw_data_scope: 'on_device_only',
    },
    observation: {
      device_type: 'desktop',
      screenshot_ref: 'insurance-claim-page',
      visible_text: ['Insurance claim', 'ID number', 'Phone number', 'Upload document', 'Review claim'],
      detected_elements: [
        { label: 'ID number', kind: 'input', value: '[REDACTED_ID_NUMBER]', sensitive: true },
        { label: 'Phone number', kind: 'input', value: '[REDACTED_PHONE]', sensitive: true },
        { label: 'Upload document', kind: 'button' },
      ],
      privacy_flags: ['id_number', 'phone_number'],
      task_goal: 'Share a safe summary with a family member.',
      redaction_level: 'strict',
      sensitive_entities: ['id_number', 'phone'],
      cloud_safe: true,
    },
    routing: {
      mode: 'cloud_planner',
      reason: '用户需要生成可给家人看的摘要，云端只接收脱敏结构化观察以组织语言。',
      privacy_blocked: false,
      complexity: 'complex',
    },
    action: {
      action_type: 'explain',
      target: 'Family summary',
      arguments: { channel: 'copyable_summary' },
      reason: '用户需要远程协助，但页面包含身份证和手机号，应只生成脱敏状态摘要。',
      risk_level: 'medium',
      requires_confirmation: false,
      execution_surface: 'cloud_tool',
      confirmation_text: '将只生成脱敏摘要，不上传原始截图。',
      allowed_tool: 'summarize_for_family',
    },
    guard: {
      decision: 'allow',
      risk_level: 'medium',
      reason: '分享的是脱敏摘要，不包含完整截图或原始敏感字段。',
      safe_alternative: '如果需要发送截图，应先自动打码。',
      policy_tags: ['redacted_summary', 'family_assist'],
      requires_human: false,
    },
    familySummary: '我正在填写保险理赔页面。身份证号和手机号已脱敏。当前需要确认是否上传证明材料，尚未提交理赔。',
    screen: {
      appTitle: 'Insurance claim',
      fields: [
        { label: 'ID number', value: '*** ****** **** 9082', status: 'sensitive' },
        { label: 'Phone number', value: '***-***-1942', status: 'sensitive' },
        { label: 'Document upload', value: 'Waiting', status: 'empty' },
      ],
      buttons: [{ label: 'Upload document', intent: 'warn' }, { label: 'Review claim', intent: 'warn' }],
      notes: ['Sensitive fields are redacted.', 'Family mode shares state, not raw screenshots.'],
    },
  },
]

const riskCopy: Record<RiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const decisionCopy: Record<Decision, string> = {
  allow: 'Allow',
  require_confirmation: 'Needs confirmation',
  deny: 'Deny',
}

const routeCopy: Record<RoutingMode, string> = {
  local_only: 'Local only',
  cloud_planner: 'Cloud planner',
  ask_user: 'Ask user',
  stop: 'Stop',
}

const entryModeCopy: Record<EntryMode, { title: string; description: string }> = {
  always_on: {
    title: 'Always On Sentinel',
    description: '事件驱动哨兵：页面变化、验证码、付款、通知等触发后轻量提醒，不连续录屏。',
  },
  trigger: {
    title: 'Trigger Assistant',
    description: '用户主动触发：点击悬浮按钮、通知或语音入口后，再调用本地能力或云端规划。',
  },
}

function buildCloudPayload(scenario: Scenario): CloudPayload {
  return {
    observation_id: scenario.observation.screenshot_ref,
    device_type: scenario.observation.device_type,
    task_goal: scenario.observation.task_goal,
    visible_text: scenario.observation.visible_text,
    privacy_flags: scenario.observation.privacy_flags,
    sensitive_entities: scenario.observation.sensitive_entities,
    redacted_elements: scenario.observation.detected_elements,
    available_tools: availableTools,
  }
}

function shouldEscalateToCloud(scenario: Scenario) {
  return scenario.routing.mode === 'cloud_planner' && scenario.observation.cloud_safe && !scenario.routing.privacy_blocked
}

function App() {
  const [activeId, setActiveId] = useState<ScenarioId>('desktop-form')
  const [step, setStep] = useState(2)
  const [entryMode, setEntryMode] = useState<EntryMode>('always_on')
  const activeScenario = scenarios.find((scenario) => scenario.id === activeId) ?? scenarios[0]
  const cloudPayload = shouldEscalateToCloud(activeScenario) ? buildCloudPayload(activeScenario) : null

  const timeline = [
    {
      label: 'Edge event',
      value: `${activeScenario.edgeEvent.event_type} from ${activeScenario.edgeEvent.source}. Raw data stays on device.`,
    },
    {
      label: 'Privacy firewall',
      value: `${activeScenario.observation.redaction_level} redaction, cloud_safe=${String(
        activeScenario.observation.cloud_safe,
      )}.`,
    },
    {
      label: 'Route',
      value: `${routeCopy[activeScenario.routing.mode]} because ${activeScenario.routing.reason}`,
    },
    { label: 'Guarded action', value: `Safety layer returns ${decisionCopy[activeScenario.guard.decision]}.` },
  ]

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Gemma competition prototype</p>
          <h1>AccessPilot</h1>
          <p className="intro">
            A hybrid edge-cloud GUI agent for older adults: raw screens stay on device, cloud planning receives only a
            redacted observation, and risky actions require a safety decision.
          </p>
        </div>
        <div className="architecture-strip" aria-label="Architecture">
          <span>Android Edge</span>
          <span>Desktop OpenClaw</span>
          <span>Cloud Planner</span>
          <span>Safety Guard</span>
        </div>
      </header>

      <section className="entry-mode-card" aria-label="Edge entry mode">
        <div>
          <p className="eyebrow">Edge entry mode</p>
          <h2>{entryModeCopy[entryMode].title}</h2>
          <p>{entryModeCopy[entryMode].description}</p>
        </div>
        <div className="mode-toggle">
          <button
            className={entryMode === 'always_on' ? 'active' : ''}
            onClick={() => setEntryMode('always_on')}
            type="button"
          >
            Always On
          </button>
          <button
            className={entryMode === 'trigger' ? 'active' : ''}
            onClick={() => setEntryMode('trigger')}
            type="button"
          >
            Trigger
          </button>
        </div>
      </section>

      <section className="workspace">
        <aside className="scenario-panel" aria-label="Demo scenarios">
          <div className="panel-heading">
            <p className="eyebrow">Demo loops</p>
            <h2>4 stable paths</h2>
          </div>
          <div className="scenario-list">
            {scenarios.map((scenario) => (
              <button
                className={`scenario-button ${scenario.id === activeId ? 'active' : ''}`}
                key={scenario.id}
                onClick={() => {
                  setActiveId(scenario.id)
                  setStep(2)
                }}
                type="button"
              >
                <span>{scenario.title}</span>
                <small>{scenario.subtitle}</small>
              </button>
            ))}
          </div>

          <div className="impact-card">
            <p className="eyebrow">Real-world impact</p>
            <p>{activeScenario.impact}</p>
          </div>

          <section className="edge-event-card">
            <p className="eyebrow">EdgeEvent</p>
            <dl>
              <div>
                <dt>Type</dt>
                <dd>{activeScenario.edgeEvent.event_type}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{activeScenario.edgeEvent.source}</dd>
              </div>
              <div>
                <dt>Scope</dt>
                <dd>{activeScenario.edgeEvent.raw_data_scope}</dd>
              </div>
            </dl>
          </section>
        </aside>

        <section className="demo-stage" aria-label="Screen simulation">
          <div className="stage-header">
            <div>
              <p className="eyebrow">{activeScenario.device === 'desktop' ? 'Desktop' : 'Mobile'} screen</p>
              <h2>{activeScenario.title}</h2>
            </div>
            <div className={`risk-pill ${activeScenario.action.risk_level}`}>{riskCopy[activeScenario.action.risk_level]} risk</div>
          </div>

          <div className={`device-frame ${activeScenario.device}`}>
            <div className="device-toolbar">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
              <strong>{activeScenario.screen.appTitle}</strong>
            </div>
            {activeScenario.screen.alert && <div className="screen-alert">{activeScenario.screen.alert}</div>}
            <div className="screen-content">
              {activeScenario.screen.fields.map((field) => (
                <div className={`screen-field ${field.status ?? 'ok'}`} key={field.label}>
                  <span>{field.label}</span>
                  <strong>{field.value}</strong>
                </div>
              ))}
              <div className="screen-buttons">
                {activeScenario.screen.buttons.map((button) => (
                  <button className={`mock-button ${button.intent ?? 'safe'}`} key={button.label} type="button">
                    {button.label}
                  </button>
                ))}
              </div>
              <ul className="screen-notes">
                {activeScenario.screen.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="control-row">
            <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))}>
              Previous
            </button>
            <div className="step-dots" aria-label="Agent step">
              {timeline.map((item, index) => (
                <span className={index <= step ? 'done' : ''} key={item.label}></span>
              ))}
            </div>
            <button type="button" onClick={() => setStep((current) => Math.min(timeline.length - 1, current + 1))}>
              Next
            </button>
          </div>
        </section>

        <aside className="agent-panel" aria-label="Agent reasoning and action">
          <div className="panel-heading">
            <p className="eyebrow">Agent loop</p>
            <h2>Event → Firewall → Route → Guard</h2>
          </div>

          <div className="timeline">
            {timeline.map((item, index) => (
              <div className={`timeline-item ${index <= step ? 'visible' : ''}`} key={item.label}>
                <span>{index + 1}</span>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <section className="json-card">
            <div className="card-title">
              <span>RoutingDecision</span>
              <code>{routeCopy[activeScenario.routing.mode]}</code>
            </div>
            <p>{activeScenario.routing.reason}</p>
            <dl>
              <div>
                <dt>Complexity</dt>
                <dd>{activeScenario.routing.complexity}</dd>
              </div>
              <div>
                <dt>Privacy</dt>
                <dd>{activeScenario.routing.privacy_blocked ? 'Blocked' : 'Allowed'}</dd>
              </div>
            </dl>
          </section>

          <section className="json-card">
            <div className="card-title">
              <span>NextAction</span>
              <code>{activeScenario.action.action_type}</code>
            </div>
            <p>{activeScenario.action.reason}</p>
            <dl>
              <div>
                <dt>Tool</dt>
                <dd>{activeScenario.action.allowed_tool}</dd>
              </div>
              <div>
                <dt>Surface</dt>
                <dd>{activeScenario.action.execution_surface}</dd>
              </div>
              <div>
                <dt>Confirm</dt>
                <dd>{activeScenario.action.requires_confirmation ? 'Required' : 'Not required'}</dd>
              </div>
            </dl>
          </section>

          <section className={`guard-card ${activeScenario.guard.decision}`}>
            <div className="card-title">
              <span>GuardDecision</span>
              <code>{decisionCopy[activeScenario.guard.decision]}</code>
            </div>
            <p>{activeScenario.guard.reason}</p>
            <small>{activeScenario.guard.safe_alternative}</small>
          </section>
        </aside>
      </section>

      <section className="privacy-firewall" aria-label="Privacy firewall">
        <div className="panel-heading">
          <p className="eyebrow">Privacy firewall</p>
          <h2>Raw screen never goes to cloud</h2>
        </div>
        <div className="firewall-flow">
          <div>
            <strong>Raw screen</strong>
            <span>On-device only</span>
            <p>{activeScenario.observation.screenshot_ref}</p>
          </div>
          <div>
            <strong>Redacted observation</strong>
            <span>{activeScenario.observation.redaction_level} redaction</span>
            <p>{activeScenario.observation.privacy_flags.length ? activeScenario.observation.privacy_flags.join(', ') : 'No sensitive fields'}</p>
          </div>
          <div>
            <strong>Cloud payload</strong>
            <span>{cloudPayload ? 'sent to planner' : 'not sent'}</span>
            <p>
              {cloudPayload
                ? `${cloudPayload.redacted_elements.length} UI elements, no raw screenshot`
                : activeScenario.routing.mode === 'cloud_planner'
                  ? 'Cloud call blocked by privacy firewall'
                  : 'No cloud call for this route'}
            </p>
          </div>
          <div>
            <strong>Guarded action</strong>
            <span>{decisionCopy[activeScenario.guard.decision]}</span>
            <p>{activeScenario.action.allowed_tool}</p>
          </div>
        </div>
      </section>

      <section className="bottom-grid">
        <div className="summary-card">
          <p className="eyebrow">Cloud actually receives</p>
          <p>
            {cloudPayload
              ? `${cloudPayload.visible_text.join(' / ')}${
                  cloudPayload.privacy_flags.length
                    ? `; redacted: ${cloudPayload.privacy_flags.join(', ')}`
                    : '; no redaction needed'
                }`
              : `Nothing. Routing mode is ${routeCopy[activeScenario.routing.mode]}.`}
          </p>
        </div>
        <div className="summary-card">
          <p className="eyebrow">Privacy-safe family summary</p>
          <p>{activeScenario.familySummary}</p>
        </div>
        <div className="summary-card">
          <p className="eyebrow">Confirmation text</p>
          <p>{activeScenario.action.confirmation_text}</p>
        </div>
      </section>
    </main>
  )
}

export default App
