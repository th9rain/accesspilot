# AccessPilot

> 中文说明在下方：[中文 README](#中文说明)

AccessPilot is a Gemma competition prototype for a hybrid edge-cloud GUI agent.

It is designed for older adults, visually impaired users, and people who need help understanding complex digital interfaces. The prototype demonstrates how Gemma-style edge models, a cloud planner, an OpenClaw-style tool gateway, and a safety guard can work together to read screens, plan safe next actions, and stop before high-risk operations.

## Demo Loops

- Desktop form assistant: explains form fields, asks for missing information, and stops before submission.
- Mobile screenshot navigator: reads a phone settings screen and recommends a safe next tap.
- Fraud and high-risk guard: blocks SMS code, payment, authorization, and other risky actions.
- Family assistance mode: creates a privacy-safe summary instead of sending raw screenshots.

## Architecture Shown in the Prototype

- Edge layer: Always On event sentinel, Trigger assistant, screen observation, privacy redaction, low-latency routing.
- Privacy firewall: raw screens stay on device; cloud receives only redacted `ScreenObservation` payloads.
- Cloud layer: multi-step planning and action selection from redacted structured context.
- OpenClaw layer: allowlisted GUI/tool actions such as `click`, `type_text`, `ask_user`, and `summarize_for_family`.
- Safety layer: `allow`, `require_confirmation`, and `deny` decisions for risky actions.

The current implementation is a deterministic front-end prototype. It is intentionally model-agnostic so the demo remains stable while the model backend is swapped in later.

In other words: this version does **not** call a real Gemma model yet. It demonstrates the intended product loop, interfaces, safety policy, and demo story with deterministic scenario data.

## Run Locally

```bash
npm install
npm run dev
```

Then open the local Vite URL.

## Build

```bash
npm run build
```

## Implementation Notes

The key interfaces are represented in `src/App.tsx`:

- `EdgeEvent`
- `ScreenObservation`
- `RoutingDecision`
- `NextAction`
- `GuardDecision`

To connect a real backend later:

1. Replace the static `scenarios` data with an API call to an edge observation service.
2. Send the observation to a Gemma cloud planner.
3. Route the planner output through a safety guard.
4. Execute only allowlisted OpenClaw tools.
5. Persist task state without storing raw sensitive screenshots.

## Safety Defaults

- No real payment.
- No real form submission.
- No destructive action.
- High-risk actions require confirmation or are denied.
- Family summaries are redacted and do not include raw screenshots.

---

# 中文说明

AccessPilot 是一个面向 Gemma 开发者比赛的“端云结合 GUI Agent”原型。

它服务的对象是老年人、视障用户、低数字技能用户，以及需要帮助家人远程处理手机/电脑页面的人。核心目标是把“我看不懂这个页面 / 不知道下一步点哪里 / 怕误操作或被骗”变成一个可控、安全、可解释的 Agent 流程。

## 这个项目是什么

AccessPilot 演示的是一个跨设备 GUI 助手：

- 它可以“观察”桌面或手机界面；
- 识别页面里的字段、按钮、风险提示和敏感信息；
- 给出下一步建议；
- 对低风险动作给出可执行动作；
- 对高风险动作先拦截、解释，再要求确认或拒绝；
- 可以生成脱敏后的家人求助摘要，而不是直接转发完整截图。

这个方向适合展示 Gemma 系列模型的几个能力：

- 端侧模型：本地截图理解、低延迟摘要、隐私脱敏；
- 云侧模型：复杂规划、多步推理、工具选择；
- function calling：输出结构化动作；
- GUI / screen understanding：理解屏幕和 UI 元素；
- safety guard：高风险动作确认和阻断；
- OpenClaw-style gateway：承接本地 GUI 工具和动作执行。

## 当前实现状态

当前版本是一个**确定性前端演示原型**。

也就是说：目前还没有真正接入 Gemma 模型，也没有真正接入 OpenClaw。

现在代码里使用的是静态 demo 场景数据，用来稳定展示完整产品闭环：

1. 端侧观察屏幕；
2. 云侧规划下一步；
3. 安全守卫判断风险；
4. OpenClaw 风格的工具层执行或阻断；
5. 输出给用户或家人的安全摘要。

这样做的目的不是假装模型已经接好了，而是先把比赛 demo 的产品形态、接口、交互和安全策略跑通。后续可以把静态数据替换成真实模型和工具调用。

## 已实现的 4 条 Demo Loop

### 1. 桌面表单助手

Agent 识别网页表单字段，发现缺失信息，向用户提问，并在提交前停住。

适合展示：

- 表单理解；
- 字段识别；
- 缺失信息澄清；
- 提交前确认。

### 2. 手机截图导航助手

Agent 阅读手机设置页面截图，判断用户想调大字号时应该点击哪个选项。

适合展示：

- 手机端截图理解；
- UI 元素定位；
- 低风险下一步动作建议。

### 3. 防诈骗 / 高风险操作守卫

当页面要求输入短信验证码、授权付款或继续高风险操作时，Agent 会阻断并解释风险。

适合展示：

- 风险识别；
- 高风险动作拒绝；
- 安全替代建议。

### 4. 家人远程协助模式

Agent 把当前页面状态转成脱敏摘要，避免把身份证号、手机号、验证码等敏感信息直接发给家人。

适合展示：

- 隐私脱敏；
- 远程协助；
- 敏感信息最小化分享。

## 架构映射

当前前端原型里展示了这几层：

- `Gemma Edge`
  - `Always On` 事件驱动哨兵；
  - `Trigger` 用户主动触发助手；
  - 端侧观察、截图摘要、隐私脱敏、低延迟路由。

- `Privacy Firewall`
  - 原始截图和完整 OCR 留在端侧；
  - 身份证、手机号、验证码、付款信息先在端侧脱敏；
  - 云端只接收 `cloud_safe=true` 的结构化 `ScreenObservation`。

- `Cloud Planner`
  - 只基于脱敏观察做多步规划、下一步动作选择、复杂任务处理。

- `OpenClaw Gateway`
  - 承接 allowlist 工具动作，例如 `click`、`type_text`、`ask_user`、`summarize_for_family`。

- `Safety Guard`
  - 对动作做 `allow`、`require_confirmation`、`deny` 判断。

## 核心接口

核心接口写在 `src/App.tsx`：

- `EdgeEvent`
  - 端侧触发事件；
  - 事件类型；
  - 来源；
  - 置信度；
  - 原始数据只在端侧处理。

- `ScreenObservation`
  - 当前屏幕观察结果；
  - 设备类型；
  - 可见文字；
  - 检测到的 UI 元素；
  - 隐私标记；
  - 用户目标；
  - 脱敏级别；
  - 敏感实体类型；
  - 是否允许上云。

- `RoutingDecision`
  - 本地处理、云端规划、询问用户或停止；
  - 是否因为隐私阻断；
  - 任务复杂度。

- `NextAction`
  - 下一步动作；
  - 动作目标；
  - 参数；
  - 原因；
  - 风险等级；
  - 是否需要确认。

- `GuardDecision`
  - 是否允许执行；
  - 风险等级；
  - 阻断原因；
  - 安全替代方案。

## 后续如何接入真实模型

后续接真实 Gemma / OpenClaw 时，可以按这个顺序替换：

1. Android 端先接入事件采集，例如 AccessibilityService、通知监听、用户主动触发入口；
2. 端侧模型生成 `ScreenObservation` 并完成隐私脱敏；
3. 本地 router 生成 `RoutingDecision`，简单任务本地处理，复杂任务升级云端；
4. 云侧 Gemma planner 只根据脱敏 observation 生成 `NextAction`；
5. Safety guard 对 `NextAction` 生成 `GuardDecision`；
6. 只有 `allow` 的动作进入 OpenClaw 工具网关；
7. 高风险动作进入确认流程；
8. 状态存储只保存脱敏摘要，不保存原始敏感截图。

## 本地运行

```bash
npm install
npm run dev
```

然后打开 Vite 输出的本地地址。

## 构建

```bash
npm run build
```

## 安全默认值

当前原型默认：

- 不执行真实付款；
- 不执行真实表单提交；
- 不执行删除或破坏性动作；
- 高风险动作必须确认或直接拒绝；
- 家人模式只分享脱敏摘要，不分享原始截图。
