# Design brief - face-ai v2 frontend

Paste the block below into a new project in our team's design workspace. The org's design system is already configured and will be applied automatically - the brief does not name tokens by hex or font family on purpose.

---

<context>
We are redesigning the frontend of a webcam-based age verification web app. The current build uses a "terminal cyber" aesthetic (cyan accents, monospaced uppercase everywhere) that does NOT fit the institutional, trustworthy tone we want for an identity flow.

For functional reference, the existing codebase lives at:
https://github.com/diegoloretti/face-ai-v2

Read these paths for the real flow, copy, and state machine:
- apps/web/src/pages/Consent.tsx
- apps/web/src/pages/Instructions.tsx
- apps/web/src/pages/Camera.tsx
- apps/web/src/pages/Result.tsx
- apps/web/src/pages/DeclarationRequired.tsx
- apps/web/src/pages/ThankYou.tsx
- apps/web/src/pages/PrivacyPolicy.tsx
- apps/web/src/components/CameraView.tsx
- apps/web/src/components/BlinkChallenge.tsx
- apps/web/src/components/StatusBadge.tsx
- apps/web/src/components/ApprovalBanner.tsx

Reuse the Portuguese (PT-BR) copy as supplied below. Do not translate, do not paraphrase.

Replace the visual design entirely. Use this org's configured design system for ALL color, typography, spacing, and component primitives. Do not invent tokens, do not propose alternative palettes, do not request a brand variant. The system is already correct.

Implementation target downstream: React 19 + Tailwind v4 + TypeScript. Output should be handoff-ready to a coding agent that will write the React components.
</context>

<atmosphere>
Apple Health meets Plaid meets Stripe Identity. The user is being asked to put their face on a camera to confirm their age - they need to feel safe, in control, and like this is a routine institutional flow, not a sci-fi experiment.

Tone qualities:
- Generous whitespace, not dense.
- Calm copy hierarchy: one clear primary action per screen.
- Animation only where it teaches (camera positioning, blink countdown, capture transition).
- Zero "futuristic" tropes: no scan-lines, no neon glow, no glitch effects, no orbital particle motion, no gradient meshes.
- Outcomes (approved, denied, declaration) feel routine and matter-of-fact, not celebratory or alarming.
</atmosphere>

<brand_logo_slot>
Every screen reserves a logo placeholder at the top. The real client logo will replace it later, so reserve the slot precisely.

Slot specification:
- Named slot attribute: `data-slot="brand-logo"` on the wrapping element so engineers can target it.
- Aspect ratio: 3:1.
- Minimum size: 120px wide on desktop, 88px wide on mobile.
- Placeholder visual: a light neutral rounded rectangle (use the system's neutral surface token), with the text "LOGO" centered, set in a small label-weight type. Do not put any other content in the placeholder.
- Position: top-left on desktop (32px from top/left), top-center on mobile (16px from top, horizontal center).
- The Camera screen places the logo above the camera frame, not over it.
</brand_logo_slot>

<flow>
A single linear flow with two branches at the end. Seven screens total.

1. Consent (entry).
2. Instructions (after the user accepts in Consent).
3. Camera with embedded BlinkChallenge overlay (after Continue in Instructions).
4. After capture, the server returns one of three decisions:
   - `aprovado` → Result (approved branch).
   - `negado` → Result (denied branch).
   - `requer_declaracao` → DeclarationRequired. If user confirms: Result (approved with declaration). If user refuses: ThankYou (declaration_refused).
5. Initial refusal in Consent → ThankYou (initial_refusal).
6. PrivacyPolicy is reachable from Consent only. It is not part of the primary flow.
</flow>

<screens>

### 1. Consent
Purpose: get explicit consent before opening the webcam.

Copy (PT-BR, do not change):
- H1: "Verificação de idade"
- Subtitle: "Use sua câmera para confirmar que você atende ao requisito de idade."
- Privacy reassurance paragraph: "Sua câmera será usada apenas para estimar sua faixa etária. Nenhuma foto é armazenada. Você pode recusar ou ler nossa política de privacidade antes de continuar."
- Primary action button: "Aceitar e continuar"
- Secondary action button: "Recusar"
- Inline link inside the privacy paragraph: "política de privacidade" (opens screen 7).

Layout:
- Desktop: vertically centered, content column max-width 480px.
- Mobile: same content, primary button is full-width with safe-area bottom padding.

States: idle only.

### 2. Instructions
Purpose: tell the user what to do before the camera opens.

Copy (PT-BR, do not change):
- H1: "Antes de começar"
- Checklist (5 items):
  1. Garanta boa iluminação no ambiente.
  2. Mantenha o rosto centralizado no oval.
  3. Esteja sozinho na frente da câmera.
  4. Remova óculos escuros, máscaras ou chapéus.
  5. Você será solicitado a piscar duas vezes para confirmar sua presença.
- Primary action: "Continuar"
- Back link: "Voltar"

Layout:
- Desktop: content column max-width 560px, checklist left-aligned with a subtle leading glyph per item from the system's icon set.
- Mobile: same checklist, comfortable 48px row height, primary button full-width pinned near bottom safe area.

States: idle only.

### 3. Camera (hero screen, the most important one)
Purpose: show live webcam, guide the user through positioning, run a 2-blink liveness challenge, then capture.

Visual structure:
- Logo slot at top (top-left desktop, top-center mobile).
- A camera frame: rounded rectangle (border-radius 24px), 480 x 360 on desktop, full-width with a 4:3 aspect ratio on mobile. The mirrored webcam video fills the frame. A soft inner shadow at the top.
- An elliptical face guide centered inside the camera frame: subtle semi-transparent stroke (use the system's muted accent), 35% horizontal radius, 45% vertical radius, rendered as SVG inside the frame.
- Directly below the frame: a single primary status message (it changes with state, see below).
- Below the status: the blink counter component when the challenge is active.
- A primary action button "Tirar foto" that appears only when the blink challenge completes.

States (design ALL of these, not only the happy path):
- `permission_pending`: subtle skeleton inside the camera frame; status text: "Aguardando permissão da câmera..."
- `camera_error`: a non-aggressive warning badge near the frame ("Não conseguimos acessar a câmera"), with a "Tentar de novo" button.
- `calibrating`: status: "Calibrando, olhe pra câmera com os olhos abertos..." with a subtle 1-2s indeterminate progress ring around the face oval.
- `blink_active`: status: "Pisque duas vezes para confirmar." Below: a blink counter that reads "0 / 2", then "1 / 2", then "2 / 2".
- `blink_timeout`: warning status: "Tempo esgotado. Posicione-se novamente." with a "Tentar de novo" button.
- `blink_complete`: success status: "Presença confirmada. Centralize seu rosto e tire a foto." The "Tirar foto" button appears with a gentle entrance.
- `capturing`: the "Tirar foto" button is disabled with label "Analisando..." Inside the camera frame, a subtle non-blocking shimmer indicates work in progress.

Animation cues (purposeful, not decorative):
- Status message transitions between states: opacity fade plus 4px slide (200ms ease-out).
- Blink counter increment: a soft visual pulse on the new count (no sound), 150ms.
- "Tirar foto" entrance: opacity 0 to 1 plus 8px slide up (240ms ease-out).
- Capturing shimmer: a 1.5s subtle loop across the camera frame.

Layout:
- Desktop: camera frame 480x360 centered, status + counter + button stacked below the frame with 16px gaps, page padding 32px.
- Mobile: camera frame full-width minus 16px side padding, 4:3 ratio (about 360x270 on a 390px viewport). The "Tirar foto" button, when visible, is pinned to the bottom safe area with full width.

### 4. Result (approved or denied branch)
Purpose: communicate the decision and let the user download a session record or retry.

Copy (PT-BR, branch by the `decisao` value):
- `aprovado`: H1 "Verificação aprovada", supporting line: "Você está liberado."
- `aprovado_com_declaracao`: H1 "Verificação aprovada com declaração", supporting line: "Obrigado por confirmar."
- `negado`: H1 "Verificação não aprovada", with the matching reason line:
  - `faixa_etaria_minor` → "Faixa etária estimada abaixo do permitido."
  - `liveness_fail` → "Não conseguimos confirmar sua presença."
  - `antispoof_fail` → "Detectamos uso de foto ou tela."

Common to all branches:
- A small text line under the H1: "Faixa etária: [value]" where [value] is the returned range (e.g. "22-30").
- Primary action: "Baixar comprovante"
- Secondary action: "Nova verificação" with a circular-arrow leading glyph.

Visual cues:
- Approved branches: a single-line confirmation glyph (not a filled green checkmark, no celebration). Tint the headline with a warm but restrained accent from the system.
- Denied branch: a neutral glyph (not a red X, not an alarm icon). The tone is matter-of-fact, not punitive.
- Both branches share the same layout. Only the glyph, headline copy, and tonal accent shift.

Layout:
- Desktop: vertical center, max-width 480px.
- Mobile: same content, buttons stacked full-width.

States: idle only on this screen.

### 5. DeclarationRequired (middle branch)
Purpose: collect an explicit legal declaration when the model's age estimate is in the 16-21 range.

Copy (PT-BR, do not change):
- H1: "Verificação adicional"
- Body paragraph: "Nosso sistema estimou sua idade na faixa 16-21 anos. Para prosseguir, você precisa declarar explicitamente que é maior de 18 anos."
- Checkbox label: "Declaro, sob as penas da lei, que tenho 18 anos ou mais e estou apto a acessar este conteúdo."
- Primary action: "Confirmar declaração" (disabled until the checkbox is checked).
- Secondary action: "Não declarar"

States:
- `idle`: checkbox unchecked, primary action disabled.
- `checked`: checkbox checked, primary action enabled.
- `submitting`: primary action shows "Confirmando..." with an inline spinner; both buttons disabled.

Layout:
- Desktop: content column max-width 480px, centered.
- Mobile: checkbox row has a 44px minimum height, buttons stacked full-width.

### 6. ThankYou
Purpose: graceful exit when the user opted out, either initially or after refusing the declaration.

Copy (PT-BR, branch by `reason`):
- `initial_refusal`: H1 "Obrigado pela visita.", body: "Você optou por não realizar a verificação. Pode fechar esta janela."
- `declaration_refused`: H1 "Obrigado pela visita.", body: "Declaração não confirmada. Você pode fechar esta janela."

Layout: centered, calm, no actions on the screen. Logo slot still present at the top.

States: idle only.

### 7. PrivacyPolicy
Purpose: detailed privacy disclosure, reached from Consent.

Copy (PT-BR, use the existing sections from the codebase):
- H1: "Política de privacidade"
- A soft warning callout banner at the top: "PLACEHOLDER - aguardando revisão final do DPO." Style it as a calm advisory (soft amber, low-contrast border), not an aggressive red alert.
- Section "Dados coletados": "Sua imagem capturada pela câmera é processada em memória para estimar sua faixa etária. A imagem não é armazenada nem transmitida."
- Section "Finalidade": "Verificar se você atende aos requisitos de idade para acesso a produtos restritos a maiores de 18 anos."
- Section "Retenção": "Metadados da verificação (sem imagem) são armazenados por até 90 dias."
- Section "Seus direitos": "Você pode solicitar acesso, correção ou exclusão dos seus dados via o DPO da BAT (contato a ser confirmado)."
- Back link at the top-left: "Voltar"

Layout:
- Desktop: max-width 720px, comfortable readable line length (about 70 characters).
- Mobile: full-width with 24px side padding, body type 16px minimum.

</screens>

<responsive_strategy>
Two breakpoints. Treat mobile as primary, scale up to desktop.

- Mobile: viewport < 768px.
- Desktop: viewport >= 768px.

| Element | Mobile | Desktop |
| --- | --- | --- |
| Logo position | Top center, 16px from top | Top-left, 32px from top and left |
| Page max-width | 100% with 16-24px side padding | 480-560px centered; 720px for PrivacyPolicy |
| Primary action button | Full-width, 48px min height | Auto width, 40px min height |
| Camera frame | Full-width minus 16px side padding, 4:3 ratio | 480x360 fixed |
| "Tirar foto" button | Pinned to bottom safe area when visible | Inline below the camera frame |
| Body type | 16px minimum, do not go below | 15-16px |
| Vertical rhythm | 24px between content blocks | 32px between content blocks |
| Touch targets | 44x44px minimum | 32x32px minimum |

Respect iOS and Android safe areas via `env(safe-area-inset-*)`. Buttons that pin to the bottom on mobile must account for the home indicator on iOS.
</responsive_strategy>

<dos_and_donts>
DO:
- Use the org's configured design system tokens for ALL color, typography, spacing, and component primitives.
- Keep all copy in Portuguese exactly as supplied above.
- Treat the Camera screen as the hero: it gets the most design attention.
- Use animation to teach (blink counter increment, capture transition, status message change) - never to decorate.
- Make denied and refused outcomes feel routine, not alarming or punitive.
- Reserve the `data-slot="brand-logo"` placeholder on every screen.
- Design every Camera state explicitly, not only the happy path.

DON'T:
- Don't use cyberpunk, terminal, or monospace-heavy aesthetics. This is institutional.
- Don't add green checkmarks or red X icons - too clichéd for an identity flow.
- Don't surface the AI or ML provenance of the decision (no "AI" badges, no "machine learning" labels, no robot icons).
- Don't add purely decorative animation: no floating particles, no gradient meshes, no orbital motion, no scan lines.
- Don't drop in lorem ipsum or invented copy - all copy is real and final.
- Don't render the logo as a hardcoded image; reserve the named slot.
- Don't propose alternative color palettes or typography. The system is the system.
</dos_and_donts>

<deliverables>
- All 7 screens designed for both mobile (375px reference) and desktop (1280px reference).
- For the Camera screen, all 7 states explicitly designed (`permission_pending`, `camera_error`, `calibrating`, `blink_active`, `blink_timeout`, `blink_complete`, `capturing`).
- Each screen has the `data-slot="brand-logo"` placeholder.
- The output is exportable as standalone HTML and handoff-ready to a coding agent for implementation in a React 19 + Tailwind v4 + TypeScript codebase.
</deliverables>

---

## How to use this brief

1. Open a new project in our team's design workspace. The org's design system applies automatically.
2. Paste the block above (everything between the two `---` lines, both included) as the first message.
3. Let the first generation come back, then refine with inline comments and direct edits per state.
4. When the design is locked, export the handoff bundle and pass it to your coding agent with: "implement these screens in apps/web/src/pages and components, preserving the existing routing in App.tsx".

## Credit-saving notes

- This is a single-shot brief. Don't ask the workspace to propose color or typography variants - the system locks those.
- If any state of the Camera screen feels off, use inline comments on that state only. Don't regenerate the whole flow.
- The PrivacyPolicy copy will likely get a real update from the DPO. The placeholder banner stays until then.
