import { useMemo, useState } from 'react'
import './App.css'

type ScenarioId = 'desktop-form' | 'mobile-help' | 'fraud-guard' | 'family-mode'
type RiskLevel = 'low' | 'medium' | 'high'
type Decision = 'allow' | 'require_confirmation' | 'deny'
type DeviceType = 'desktop' | 'mobile'

type DetectedElement = {
  label: string
  kind: string
  value?: string
  sensitive?: boolean
}

type ScreenObservation = {
  device_type: DeviceType
  screenshot_ref: string
  visible_text: string[]
  detected_elements: DetectedElement[]
  privacy_flags: string[]
  task_goal: string
}

type NextAction = {
  action_type: 'click' | 'type_text' | 'scroll' | 'ask_user' | 'explain' | 'confirm' | 'stop'
  target: string
  arguments: Record<string, string | number>
  reason: string
  risk_level: RiskLevel
  requires_confirmation: boolean
}

type GuardDecision = {
  decision: Decision
  risk_level: RiskLevel
  reason: string
  safe_alternative: string
}

type Scenario = {
  id: ScenarioId
  title: string
  subtitle: string
  userGoal: string
  device: DeviceType
  impact: string
  observation: ScreenObservation
  action: NextAction
  guard: GuardDecision
  familySummary: string
  openClawTool: string
  screen: {
    appTitle: string
    alert?: string
    fields: { label: string; value: string; status?: 'ok' | 'empty' | 'sensitive' }[]
    buttons: { label: string; intent?: 'safe' | 'warn' | 'danger' }[]
    notes: string[]
  }
}

const scenarios: Scenario[] = [
  {
    id: 'desktop-form',
    title: '桌面表单助手',
    subtitle: '识别字段、解释下一步，并在提交前停住确认',
    userGoal: '帮我完成社区补贴申请表，但不要直接提交。',
    device: 'desktop',
    impact: '降低复杂政务/福利表单的门槛，帮助低数字技能用户独立完成申请。',
    observation: {
      device_type: 'desktop',
      screenshot_ref: 'desktop-benefit-form',
      visible_text: ['Community Benefit Form', 'Full name', 'Phone number', 'Monthly income', 'Submit application'],
      detected_elements: [
        { label: 'Full name', kind: 'input', value: 'Lin Chen' },
        { label: 'Phone number', kind: 'input', value: '***-***-2840', sensitive: true },
        { label: 'Monthly income', kind: 'input', value: 'missing' },
        { label: 'Submit application', kind: 'button' },
      ],
      privacy_flags: ['phone_number'],
      task_goal: 'Complete missing fields and stop before submission.',
    },
    action: {
      action_type: 'ask_user',
      target: 'Monthly income field',
      arguments: { question: '请输入月收入金额，我会填写字段，但不会提交表单。' },
      reason: '表单只缺少月收入。提交按钮是高风险动作，必须确认后才能继续。',
      risk_level: 'medium',
      requires_confirmation: false,
    },
    guard: {
      decision: 'require_confirmation',
      risk_level: 'high',
      reason: '提交申请会把个人信息发送给外部系统。',
      safe_alternative: '先保存草稿或让用户确认所有字段。',
    },
    familySummary: '用户正在填写社区补贴申请表。手机号已脱敏。当前缺少月收入字段，系统尚未提交。',
    openClawTool: 'ask_user',
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
    },
    action: {
      action_type: 'click',
      target: 'Text size list item',
      arguments: { x: 184, y: 342 },
      reason: '当前截图中已经看到 Text size 选项，点击它是到达字号调节页面的安全下一步。',
      risk_level: 'low',
      requires_confirmation: false,
    },
    guard: {
      decision: 'allow',
      risk_level: 'low',
      reason: '打开设置页中的字号选项是可逆、低风险操作。',
      safe_alternative: '如果目标不清晰，先要求用户发送更完整截图。',
    },
    familySummary: '用户在手机设置中寻找字号调节。建议点击 Text size。没有敏感信息。',
    openClawTool: 'click',
    screen: {
      appTitle: 'Settings',
      fields: [
        { label: 'Display', value: 'Opened', status: 'ok' },
        { label: 'Text size', value: 'Visible option', status: 'ok' },
        { label: 'Brightness', value: 'Not needed', status: 'ok' },
      ],
      buttons: [{ label: 'Text size', intent: 'safe' }, { label: 'Accessibility', intent: 'safe' }],
      notes: ['Low risk action.', 'Can be handled on-device before cloud escalation.'],
    },
  },
  {
    id: 'fraud-guard',
    title: '防诈骗 / 高风险守卫',
    subtitle: '识别验证码、付款、授权等风险动作并阻断',
    userGoal: '这个页面让我输入短信验证码继续，我该不该输？',
    device: 'mobile',
    impact: '帮助用户在关键时刻停下来，减少验证码诈骗、恶意授权和误付款。',
    observation: {
      device_type: 'mobile',
      screenshot_ref: 'otp-payment-warning',
      visible_text: ['Security verification', 'Enter SMS code', 'Authorize payment', 'Continue'],
      detected_elements: [
        { label: 'SMS code', kind: 'input', sensitive: true },
        { label: 'Authorize payment', kind: 'button' },
        { label: 'Continue', kind: 'button' },
      ],
      privacy_flags: ['sms_code', 'payment_authorization'],
      task_goal: 'Decide whether entering the SMS code is safe.',
    },
    action: {
      action_type: 'stop',
      target: 'SMS code input',
      arguments: { message: '不要输入验证码。先确认页面来源和付款对象。' },
      reason: '验证码和付款授权同时出现，属于高风险动作。',
      risk_level: 'high',
      requires_confirmation: true,
    },
    guard: {
      decision: 'deny',
      risk_level: 'high',
      reason: '输入短信验证码可能授权付款或账户操作，不能由 Agent 执行或鼓励继续。',
      safe_alternative: '联系官方客服或家人核实，不在当前页面输入验证码。',
    },
    familySummary: '用户遇到短信验证码和付款授权页面。AccessPilot 已阻止继续操作，建议核实来源。',
    openClawTool: 'stop',
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
    observation: {
      device_type: 'desktop',
      screenshot_ref: 'insurance-claim-page',
      visible_text: ['Insurance claim', 'ID number', 'Phone number', 'Upload document', 'Review claim'],
      detected_elements: [
        { label: 'ID number', kind: 'input', value: '*** ****** **** 9082', sensitive: true },
        { label: 'Phone number', kind: 'input', value: '***-***-1942', sensitive: true },
        { label: 'Upload document', kind: 'button' },
      ],
      privacy_flags: ['id_number', 'phone_number'],
      task_goal: 'Share a safe summary with a family member.',
    },
    action: {
      action_type: 'explain',
      target: 'Family summary',
      arguments: { channel: 'copyable_summary' },
      reason: '用户需要远程协助，但页面包含身份证和手机号，应只生成脱敏状态摘要。',
      risk_level: 'medium',
      requires_confirmation: false,
    },
    guard: {
      decision: 'allow',
      risk_level: 'medium',
      reason: '分享的是脱敏摘要，不包含完整截图或原始敏感字段。',
      safe_alternative: '如果需要发送截图，应先自动打码。',
    },
    familySummary: '我正在填写保险理赔页面。身份证号和手机号已脱敏。当前需要确认是否上传证明材料，尚未提交理赔。',
    openClawTool: 'summarize_for_family',
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

function App() {
  const [activeId, setActiveId] = useState<ScenarioId>('desktop-form')
  const [step, setStep] = useState(2)
  const activeScenario = scenarios.find((scenario) => scenario.id === activeId) ?? scenarios[0]

  const timeline = useMemo(
    () => [
      { label: 'Edge observe', value: 'Gemma edge model summarizes screen and redacts sensitive fields.' },
      { label: 'Cloud plan', value: 'Gemma planner chooses one next action with risk-aware reasoning.' },
      { label: 'Guard', value: `Safety layer returns ${decisionCopy[activeScenario.guard.decision]}.` },
      { label: 'OpenClaw', value: `Allowed tool: ${activeScenario.openClawTool}.` },
    ],
    [activeScenario],
  )

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Gemma competition prototype</p>
          <h1>AccessPilot</h1>
          <p className="intro">
            A hybrid edge-cloud GUI agent for people who need help reading screens, avoiding risky actions, and asking for
            safe remote assistance.
          </p>
        </div>
        <div className="architecture-strip" aria-label="Architecture">
          <span>Gemma Edge</span>
          <span>Cloud Planner</span>
          <span>OpenClaw Gateway</span>
          <span>Safety Guard</span>
        </div>
      </header>

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
            <h2>Observe → Plan → Guard → Act</h2>
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
              <span>NextAction</span>
              <code>{activeScenario.action.action_type}</code>
            </div>
            <p>{activeScenario.action.reason}</p>
            <dl>
              <div>
                <dt>Target</dt>
                <dd>{activeScenario.action.target}</dd>
              </div>
              <div>
                <dt>Risk</dt>
                <dd>{riskCopy[activeScenario.action.risk_level]}</dd>
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

      <section className="bottom-grid">
        <div className="summary-card">
          <p className="eyebrow">User goal</p>
          <p>{activeScenario.userGoal}</p>
        </div>
        <div className="summary-card">
          <p className="eyebrow">Privacy-safe family summary</p>
          <p>{activeScenario.familySummary}</p>
        </div>
        <div className="summary-card">
          <p className="eyebrow">Detected sensitive fields</p>
          <p>
            {activeScenario.observation.privacy_flags.length > 0
              ? activeScenario.observation.privacy_flags.join(', ')
              : 'No sensitive fields detected'}
          </p>
        </div>
      </section>
    </main>
  )
}

export default App
