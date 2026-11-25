/**
 * Hiroshi, rendered directly on the GPU with GPUIX.
 *
 * It demonstrates a transparent titlebar, traffic lights in the sidebar,
 * graphite surfaces, composer chips, and a workspace footer. Threads, sends,
 * and chrome controls are interactive. Desktop work belongs to the engine;
 * browser previews and tests use the isolated demo fixture.
 *
 * Run on desktop: bun run dev
 * Run in a browser: bun run web:dev
 * Slow CPU: THROTTLE=utility bun run dev
 */

import { FilesSurface, ReviewSurface, BrowserSurface, WorkspaceCommitModal } from './src/components/WorkspaceSurfaces'
import { EditorWorkspace } from './src/components/EditorWorkspace'
import { DockWorkspace } from './src/components/DockWorkspace'
import { ProviderSettings } from './src/components/ProviderSettings'
import { ProjectMenu, ProjectSwitcher } from './src/components/ProjectSwitcher'
import { CatalogPicker } from './src/components/CatalogPicker'
import { DraftRecovery } from './src/components/DraftRecovery'
import { CliConversationStatus, cliNeedsFresh } from './src/components/CliConversation'
import { NetworkSettings } from './src/components/NetworkSettings'
import { UsageSettings } from './src/components/UsageSettings'
import { SkillsSettings } from './src/components/SkillsSettings'
import { engineTranscript } from './src/engine/transcript'
import { EngineUsage, ComposerDelivery } from './src/components/EngineCockpit'
import { cockpit } from './src/engine/cockpit'
import { launchLink, parseShellLink } from './src/shell/links'
import { readWindowState, saveWindowState, readProjectSelection, saveProjectSelection } from './src/shell/state'
import { trackWindow, nextNativeLink } from './src/shell/geometry'
import { packagedBuild } from './src/shell/runtime'
import { CheckpointHistory } from './src/components/CheckpointHistory'
import { ToolActivity } from './src/components/ToolActivity'
import { ContextHistory } from './src/components/ContextHistory'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AnimatePresence,
  applyMacCpuThrottleFromEnv,
  Button,
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  motion,
  render,
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  useGpuix,
  useWindowInsets,
  useWindowSize,
  type Props,
  type PublicInstance,
  type StyleDesc,
} from '@gpuix/react'
import { SafeMdxRenderer } from 'safe-mdx'
import { mdxParse } from 'safe-mdx/parse'
import type { Root } from 'mdast'
import { useEngine, type EngineHandle } from './src/engine/use-engine'
import type { Snapshot as EngineSnapshot } from './src/engine/reducer'
import type { DeliveryMode, Run as EngineRun, Session as EngineSession } from './engine/src/protocol'
import iconCompose from './assets/icons/compose.svg' with { type: 'text' }
import iconSearch from './assets/icons/search.svg' with { type: 'text' }
import iconSidebar from './assets/icons/panel-left.svg' with { type: 'text' }
import iconPanelRight from './assets/icons/panel-right.svg' with { type: 'text' }
import iconArrowLeft from './assets/icons/arrow-left.svg' with { type: 'text' }
import iconArrowRight from './assets/icons/arrow-right.svg' with { type: 'text' }
import iconFolder from './assets/icons/folder.svg' with { type: 'text' }
import iconSettings from './assets/icons/settings.svg' with { type: 'text' }
import iconGitBranch from './assets/icons/git-branch.svg' with { type: 'text' }
import iconLaptop from './assets/icons/laptop.svg' with { type: 'text' }
import iconLockOpen from './assets/icons/lock-open.svg' with { type: 'text' }
import iconLock from './assets/icons/lock.svg' with { type: 'text' }
import iconList from './assets/icons/list.svg' with { type: 'text' }
import iconZap from './assets/icons/zap.svg' with { type: 'text' }
import iconPencil from './assets/icons/pencil.svg' with { type: 'text' }
import iconChevronDown from './assets/icons/chevron-down.svg' with { type: 'text' }
import iconChevronRight from './assets/icons/chevron-right.svg' with { type: 'text' }
import iconListFilter from './assets/icons/list-filter.svg' with { type: 'text' }
import iconSparkle from './assets/icons/sparkle.svg' with { type: 'text' }
import iconWrench from './assets/icons/wrench.svg' with { type: 'text' }
import iconSend from './assets/icons/arrow-up.svg' with { type: 'text' }
import iconCopy from './assets/icons/copy.svg' with { type: 'text' }
import iconCheck from './assets/icons/check.svg' with { type: 'text' }
import iconRetry from './assets/icons/rotate-ccw.svg' with { type: 'text' }
import iconThumbsUp from './assets/icons/thumbs-up.svg' with { type: 'text' }
import iconThumbsDown from './assets/icons/thumbs-down.svg' with { type: 'text' }
import iconShare from './assets/icons/share.svg' with { type: 'text' }
import iconMore from './assets/icons/ellipsis.svg' with { type: 'text' }
import iconWindowMinimize from './assets/icons/window-minimize.svg' with { type: 'text' }
import iconWindowMaximize from './assets/icons/window-maximize.svg' with { type: 'text' }
import iconWindowRestore from './assets/icons/window-restore.svg' with { type: 'text' }
import iconWindowClose from './assets/icons/window-close.svg' with { type: 'text' }
import iconContrast from './assets/icons/contrast.svg' with { type: 'text' }
import iconBlocks from './assets/icons/blocks.svg' with { type: 'text' }
import iconCube from './assets/icons/cube.svg' with { type: 'text' }
import iconActivity from './assets/icons/activity.svg' with { type: 'text' }
import iconServer from './assets/icons/server.svg' with { type: 'text' }
import iconTrash from './assets/icons/trash.svg' with { type: 'text' }
import iconTerminal from './assets/icons/terminal.svg' with { type: 'text' }
import iconGlobe from './assets/icons/globe.svg' with { type: 'text' }
import iconFileDiff from './assets/icons/file-diff.svg' with { type: 'text' }
import iconPlus from './assets/icons/plus.svg' with { type: 'text' }
import iconInbox from './assets/icons/inbox.svg' with { type: 'text' }
import iconInfo from './assets/icons/info.svg' with { type: 'text' }
import {
  endWindowDrag,
  handleTitlebarMouseDown,
  isWindowMaximized,
  startWindowDrag,
  toggleWindowZoom,
  updateWindowDrag,
} from './src/window-drag'

const iconArrowUpRight =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 11.5L11.5 4.5M11.5 4.5H6.5M11.5 4.5V9.5"/></svg>'
const iconXai =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="5.5"/><line x1="4" y1="12" x2="12" y2="4"/></svg>'

const C = {
  canvas: '#1A1A1A',
  sidebar: '#181818',
  raised: '#232323',
  composer: '#212121',
  overlay: '#E6EAF20D',
  overlayStrong: '#E6EAF217',
  item: '#F0F0F00F',
  border: '#E6EAF212',
  borderStrong: '#E6EAF224',
  sidebarBorder: '#292929',
  text: '#E2E2E2',
  secondary: '#A3A3A3',
  tertiary: '#7D7D7D',
  ghost: '#575757',
  accent: '#E2795B',
  inverse: '#E7E9EC',
  onInverse: '#17181C',
  codeText: '#E0A882',
}

const SIDEBAR_WIDTH = 252
const TRAFFIC_LIGHT_CLEARANCE =
  typeof process !== 'undefined' && process.platform === 'darwin' ? 86 : 8
const CONTENT_MAX_WIDTH = 720
const TITLEBAR_HEIGHT = 48

const FONT_SANS = typeof window === 'undefined' ? 'Helvetica' : 'IBM Plex Sans'
const FONT_MONO = typeof window === 'undefined' ? 'Menlo' : 'Lilex'

const ICONS = {
  compose: iconCompose,
  search: iconSearch,
  sidebar: iconSidebar,
  panelRight: iconPanelRight,
  arrowLeft: iconArrowLeft,
  arrowRight: iconArrowRight,
  folder: iconFolder,
  settings: iconSettings,
  gitBranch: iconGitBranch,
  laptop: iconLaptop,
  lockOpen: iconLockOpen,
  lock: iconLock,
  list: iconList,
  zap: iconZap,
  pencil: iconPencil,
  chevronDown: iconChevronDown,
  chevronRight: iconChevronRight,
  listFilter: iconListFilter,
  sparkle: iconSparkle,
  wrench: iconWrench,
  send: iconSend,
  copy: iconCopy,
  check: iconCheck,
  retry: iconRetry,
  thumbsUp: iconThumbsUp,
  thumbsDown: iconThumbsDown,
  share: iconShare,
  more: iconMore,
  windowMinimize: iconWindowMinimize,
  windowMaximize: iconWindowMaximize,
  windowRestore: iconWindowRestore,
  windowClose: iconWindowClose,
  contrast: iconContrast,
  blocks: iconBlocks,
  cube: iconCube,
  activity: iconActivity,
  server: iconServer,
  trash: iconTrash,
  terminal: iconTerminal,
  globe: iconGlobe,
  fileDiff: iconFileDiff,
  plus: iconPlus,
  inbox: iconInbox,
  info: iconInfo,
  arrowUpRight: iconArrowUpRight,
  xai: iconXai,
} as const

type IconName = keyof typeof ICONS

function Icon({ name, size = 14, color }: { name: IconName; size?: number; color: string }) {
  return (
    <svg
      source={ICONS[name]}
      style={{ width: size, height: size, flexShrink: 0, color, pointerEvents: 'none' }}
    />
  )
}

const CHAT_THEME = {
  text: C.text,
  textMuted: C.secondary,
  textFaint: C.tertiary,
  textDim: C.secondary,
  border: C.border,
  bg: C.canvas,
  accent: C.accent,
  caret: C.accent,
  fontSans: FONT_SANS,
  codeText: C.codeText,
  codeWash: '#E6EAF214',
  metrics: {
    mdTextSize: 14,
    mdLineHeight: 22,
    mdBlockGap: 14,
    mdHeadingSizes: [20, 16, 14, 14],
    mdHeadingLineHeights: [28, 24, 22, 22],
    codeTextSize: 12.5,
    codeLineHeight: 20,
    diffLineHeight: 20,
    diffFileHeaderHeight: 34,
  },
}

type Turn =
  | { kind: 'boundary'; text: string }
  | { kind: 'user'; text: string }
  | { kind: 'fold'; duration: string }
  | { kind: 'markdown'; source: string }
  | { kind: 'code'; language: string; source: string }
  | { kind: 'diff'; patch: string }

interface Conversation {
  id: string
  title: string
  group: string
  project: string
  time: string
  turns: Turn[]
}

const MODELS = [
  { id: 'grok-4.6', label: 'Grok 4.6', group: 'xAI', icon: 'xai' as const },
  { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', group: 'DeepSeek', icon: 'sparkle' as const },
  { id: 'deepseek-v4', label: 'DeepSeek V4', group: 'DeepSeek', icon: 'sparkle' as const },
  { id: 'opus-4.6', label: 'Claude Opus 4.6', group: 'Claude', icon: 'sparkle' as const },
  { id: 'sonnet-4.6', label: 'Claude Sonnet 4.6', group: 'Claude', icon: 'sparkle' as const },
  { id: 'gpt-5.4', label: 'GPT-5.4', group: 'OpenAI', icon: 'sparkle' as const },
]

const REASONING = [
  { id: 'high', label: 'High', hint: 'Default' },
  { id: 'medium', label: 'Medium', hint: undefined },
  { id: 'low', label: 'Low', hint: undefined },
]

const ACCESS = [
  {
    id: 'ask',
    label: 'Supervised',
    description: 'Ask before commands and file changes',
    icon: 'lock' as const,
  },
  {
    id: 'edits',
    label: 'Auto-accept edits',
    description: 'Auto-approve edits, ask before other actions',
    icon: 'pencil' as const,
  },
  {
    id: 'auto',
    label: 'Auto',
    description: 'An AI reviewer approves routine actions; risky ones still ask',
    icon: 'sparkle' as const,
  },
  {
    id: 'full',
    label: 'Full access',
    description: 'Allow commands and edits without prompts',
    icon: 'lockOpen' as const,
  },
]

const PROJECTS = [
  { id: 'kale', label: 'kale' },
  { id: 'gpuix', label: 'gpuix' },
  { id: 'example-app', label: 'example-app' },
  { id: 'none', label: 'No project' },
]

const WORKSPACES = [
  { id: 'local', label: 'Local', icon: 'laptop' as const },
  { id: 'worktree', label: 'New worktree', icon: 'gitBranch' as const },
]

const BRANCHES = [
  { id: 'master', label: 'master' },
  { id: 'main', label: 'main' },
  { id: 'feat-selectors', label: 'feat/selectors' },
  { id: 'chat-example', label: 'chat-example' },
]

const OVERVIEW = `**GPUIX** is a React renderer for GPUI, Zed's GPU-accelerated UI framework. It renders native desktop interfaces through Metal, DirectX, or Vulkan. No Electron or web view.`

const ARCHITECTURE = `React sends host mutations through napi-rs. Rust keeps the retained tree and translates it into GPUI elements for each frame.`

const SELECTION = `Selection is rebuilt from the paint pass. Each string registers in document order, so a drag can cross elements.`

const SELECTION_CODE = `pub fn resolve_spans(
    elements: &[(&str, &str)],
    a: (usize, usize),
    b: (usize, usize),
) -> Vec<Span> {
    let (start, end) = if a <= b { (a, b) } else { (b, a) };
    let mut spans = Vec::new();
    for (ei, (key, text)) in elements.iter().enumerate().take(end.0 + 1).skip(start.0) {
        let from = if ei == start.0 { start.1 } else { 0 };
        let to = if ei == end.0 { end.1 } else { text.len() };
        if from < to {
            spans.push(Span { key: key.to_string(), range: from..to });
        }
    }
    spans
}`

const GUTTER = `The gutter width now follows the largest line number, so a five-digit line no longer hits the accent bar.`

const GUTTER_DIFF = [
  'diff --git a/packages/native/src/diff/mod.rs b/packages/native/src/diff/mod.rs',
  'index 8f2a1c4..d91b7e0 100644',
  '--- a/packages/native/src/diff/mod.rs',
  '+++ b/packages/native/src/diff/mod.rs',
  '@@ -78,12 +78,15 @@ impl FileDiff {',
  ' /// Width of one line-number gutter, fitted to the largest line number.',
  '-pub fn gutter_width(file: &FileDiff) -> f32 {',
  '-    GUTTER_WIDTH',
  '+pub fn gutter_width(file: &FileDiff, metrics: &Metrics) -> f32 {',
  '+    let digits = file.max_line.max(1).ilog10() + 1;',
  '+    (digits as f32 * 6.6 + 8.0 + 6.0).max(metrics.diff_gutter_width)',
  ' }',
].join('\n')

const HOT_RELOAD = `**No.** A \`.node\` cannot unload. The loop rebuilds and restarts.`

const SKILLS = `Skills are \`SKILL.md\` files. A mail-style list on the left, the body on the right.`

const WIRE_MODELS = `Default is DeepSeek V4 Flash. Keep Opus for long diffs. Hide GPT-5.4 behind the picker.`

const SDK_VS_GPUI = `GPUI is the renderer. A native SDK would still talk to it. GPUIX is the React layer on that same GPUI tree, so you keep JSX and skip a second UI stack.`

const SCRIPT_C = `scriptc is a Vercel Labs experiment. This demo has no live runtime for it. The chat still shows how a coding agent would walk that kind of patch in GPUIX.`

const MEMORY = `The chat example keeps one retained React child per turn. Pass \`itemCount\` and a window when the list grows. Native paint stays on visible rows only.`

const TURNS: Turn[] = [
  { kind: 'user', text: 'give me a quick overview' },
  { kind: 'fold', duration: 'Worked for 10 seconds' },
  { kind: 'markdown', source: OVERVIEW },
  { kind: 'user', text: 'How does React reach GPUI?' },
  { kind: 'fold', duration: 'Worked for 6 seconds' },
  { kind: 'markdown', source: ARCHITECTURE },
  { kind: 'user', text: 'How does cross-element text selection work?' },
  { kind: 'fold', duration: 'Worked for 14 seconds' },
  { kind: 'markdown', source: SELECTION },
  { kind: 'code', language: 'rust', source: SELECTION_CODE },
  { kind: 'user', text: 'Make the diff gutter width adapt to the largest line number.' },
  { kind: 'fold', duration: 'Worked for 8 seconds' },
  { kind: 'markdown', source: GUTTER },
  { kind: 'diff', patch: GUTTER_DIFF },
  { kind: 'user', text: 'Do I get hot reload when I edit the Rust side?' },
  { kind: 'fold', duration: 'Worked for 4 seconds' },
  { kind: 'markdown', source: HOT_RELOAD },
  { kind: 'user', text: 'How do skills show up in the app?' },
  { kind: 'fold', duration: 'Worked for 7 seconds' },
  { kind: 'markdown', source: SKILLS },
  { kind: 'user', text: 'Which models should I wire up?' },
  { kind: 'fold', duration: 'Worked for 5 seconds' },
  { kind: 'markdown', source: WIRE_MODELS },
]

const CONVERSATIONS: Conversation[] = [
  {
    id: 'task-new',
    title: 'New task',
    group: 'Today',
    project: 'kale',
    time: 'now',
    turns: [],
  },
  {
    id: 'c1',
    title: 'hi',
    group: 'Today',
    project: 'kale',
    time: '8m',
    turns: [{ kind: 'user', text: 'hi' }],
  },
  {
    id: 'c2',
    title: 'hi',
    group: 'This Year',
    project: 'kale',
    time: '25d',
    turns: [{ kind: 'user', text: 'hi' }],
  },
  {
    id: 'c3',
    title: 'hi',
    group: 'This Year',
    project: 'kale',
    time: '29d',
    turns: [{ kind: 'user', text: 'hi' }],
  },
]

const SAFE_MDX_STRESS = `# React-composed Markdown

This message uses **safe-mdx**, *styled spans*, ~~deleted text~~, an
\`inline code value\`, and [a link](https://github.com/holocron-hq/safe-mdx).

> The parser runs in TypeScript. Every Markdown node becomes a normal React component.
>
> GPUIX renders the resulting \`div\`, \`text\`, and \`code\` tree.

- nested **inline formatting** inside a list
- a second item with a long sentence that must wrap without leaving the transcript column
- [x] a GFM task item

| Path | Renderer | Native Markdown element | Host nodes | Scroll | When to use |
|:-----|:---------|:------------------------|-----------:|:-------|:------------|
| safe-mdx | React tree of div and text | no | many | overflow-x on this grid | Custom MDX components and React state inside a message |
| pulldown-cmark | one native markdown node | yes | one | overflow-x inside Rust | Default chat transcript. Cheapest paint. |
| grid table | one CSS grid of cells | no | one per cell | overflow-x on the flex parent | Wide comparison tables that must stay readable |

\`\`\`typescript
const tree = mdxParse(source)
return <SafeMdxRenderer markdown={source} mdast={tree} />
\`\`\`

<Callout title="Custom MDX component">
  MDX components also map to ordinary GPUIX React components.
</Callout>`

function IconButton({
  icon,
  onClick,
  dimmed,
  size = 14,
  testId,
  borderRadius = 7,
  active = false,
  tooltip,
}: {
  icon: IconName
  onClick?: () => void
  dimmed?: boolean
  size?: number
  testId?: string
  borderRadius?: number
  active?: boolean
  tooltip?: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <Button
        testId={testId}
        disabled={dimmed}
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          borderRadius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: dimmed ? 0.35 : 1,
          backgroundColor: active ? '#2B2B2F' : '#00000000',
          hover: dimmed ? undefined : { backgroundColor: active ? '#2B2B2F' : C.overlay },
          active: dimmed ? undefined : { backgroundColor: C.overlayStrong },
        }}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Icon name={icon} size={size} color={active ? C.text : C.tertiary} />
      </Button>
      {hovered && tooltip && !active && (
        <div
          style={{
            position: 'absolute',
            top: 34,
            right: 0,
            backgroundColor: '#1E1E20',
            borderWidth: 1,
            borderColor: '#38383D',
            borderRadius: 8,
            paddingTop: 5,
            paddingBottom: 5,
            paddingLeft: 10,
            paddingRight: 10,
            pointerEvents: 'none',
          }}
        >
          <text style={{ fontSize: 12.5, color: '#CCCCCC', whiteSpace: 'nowrap' }}>
            {tooltip}
          </text>
        </div>
      )}
    </div>
  )
}

function SidebarAction({
  icon,
  label,
  onClick,
  testId,
}: {
  icon: IconName
  label: string
  onClick?: () => void
  testId?: string
}) {
  return (
    <Button
      testId={testId}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 32,
        paddingLeft: 4,
        paddingRight: 4,
        borderRadius: 7,
        cursor: 'pointer',
        hover: { backgroundColor: C.item },
        active: { backgroundColor: C.overlayStrong },
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={14} color={C.secondary} />
      </div>
      <text style={{ fontSize: 13, color: C.secondary }}>{label}</text>
    </Button>
  )
}

function ConversationRow({
  conversation,
  active,
  onSelect,
  onDelete,
}: {
  conversation: Conversation
  active: boolean
  onSelect: (id: string) => void
  onDelete?: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <Button
      testId={`thread-${conversation.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 7,
        paddingBottom: 7,
        borderRadius: 7,
        cursor: 'pointer',
        backgroundColor: active ? C.item : '#00000000',
        hover: { backgroundColor: C.item },
      }}
      onClick={() => onSelect(conversation.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <text
          style={{
            fontSize: 13.5,
            lineHeight: 18,
            color: C.text,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          {conversation.title}
        </text>
        {(active || hovered) && onDelete && (
          <Button
            testId={`delete-${conversation.id}`}
            onClick={(e: any) => {
              if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
              onDelete(conversation.id)
            }}
            style={{
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            <Icon name="windowClose" size={9} color="#EF4444" />
          </Button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name="folder" size={12.5} color={C.tertiary} />
        <text
          style={{
            fontSize: 13,
            lineHeight: 15,
            color: C.tertiary,
            flexGrow: 1,
            minWidth: 0,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {conversation.project}
        </text>
        <text style={{ fontSize: 12.5, color: C.ghost, flexShrink: 0 }}>{conversation.time}</text>
      </div>
    </Button>
  )
}

function Sidebar({
  width = SIDEBAR_WIDTH,
  conversations,
  activeId,
  onSelect,
  onCollapse,
  onNewTask,
  onSearch,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onSettings,
  onFilter,
  filterActive,
  onDelete,
}: {
  width?: number
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onCollapse: () => void
  onNewTask: () => void
  onSearch: () => void
  canGoBack: boolean
  canGoForward: boolean
  onBack: () => void
  onForward: () => void
  onSettings: () => void
  onFilter: () => void
  filterActive: boolean
  onDelete?: (id: string) => void
}) {
  const groups = useMemo(() => {
    const out: { name: string; items: Conversation[] }[] = []
    for (const conversation of conversations) {
      const last = out[out.length - 1]
      if (last && last.name === conversation.group) last.items.push(conversation)
      else out.push({ name: conversation.group, items: [conversation] })
    }
    return out
  }, [conversations])

  const { renderer } = useGpuix()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width,
        flexShrink: 0,
        height: '100%',
        backgroundColor: C.sidebar,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          height: TITLEBAR_HEIGHT,
          flexShrink: 0,
        }}
      >
        <div style={{ width: TRAFFIC_LIGHT_CLEARANCE, height: '100%', flexShrink: 0 }} />
        <IconButton
          icon="sidebar"
          size={16}
          testId="sidebar-collapse"
          onClick={onCollapse}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            marginLeft: 6,
          }}
        >
          <IconButton icon="arrowLeft" dimmed={!canGoBack} testId="history-back" onClick={onBack} />
          <IconButton
            icon="arrowRight"
            dimmed={!canGoForward}
            testId="history-forward"
            onClick={onForward}
          />
        </div>
        <div
          testId="titlebar-drag-sidebar"
          style={{ flexGrow: 1, height: '100%', pointerEvents: 'auto' }}
          onMouseDown={(e: any) => handleTitlebarMouseDown(renderer, e)}
          onMouseMove={() => updateWindowDrag()}
          onMouseUp={() => endWindowDrag()}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 10, paddingRight: 10 }}>
        <SidebarAction icon="compose" label="New Task" testId="new-task" onClick={onNewTask} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          minHeight: 0,
          overflowY: 'scroll',
          paddingLeft: 10,
          paddingRight: 10,
        }}
      >
        <div style={{ paddingBottom: 6 }}>
          <SidebarAction icon="search" label="Search" testId="search" onClick={onSearch} />
        </div>
        {groups.map((group, groupIndex) => (
          <div
            key={group.name}
            style={{ display: 'flex', flexDirection: 'column', paddingBottom: 10 }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                height: 28,
                paddingLeft: 8,
                paddingRight: 8,
              }}
            >
              <text
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: C.secondary,
                  flexGrow: 1,
                  minWidth: 0,
                }}
              >
                {group.name}
              </text>
              {groupIndex === 0 && (
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Button
                    testId="thread-filter"
                    aria-label="Filter by project"
                    onClick={onFilter}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backgroundColor: filterActive ? C.overlayStrong : '#00000000',
                      hover: { backgroundColor: C.overlay },
                    }}
                  >
                    <Icon name="listFilter" size={13} color={filterActive ? C.text : C.secondary} />
                  </Button>
                  <Button
                    testId="thread-folder"
                    aria-label="Filter folder"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      hover: { backgroundColor: C.overlay },
                    }}
                  >
                    <Icon name="folder" size={13} color={C.secondary} />
                  </Button>
                </div>
              )}
            </div>
            <AnimatePresence initial={false}>
              {group.items.map((conversation) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 51 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  style={{
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <ConversationRow
                    conversation={conversation}
                    active={conversation.id === activeId}
                    onSelect={onSelect}
                    onDelete={onDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          height: 40,
          flexShrink: 0,
          paddingLeft: 10,
          paddingRight: 10,
        }}
      >
        <IconButton icon="settings" testId="settings" onClick={onSettings} />
      </div>
    </div>
  )
}

function UserTurn({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        width: '100%',
      }}
    >
      <div
        style={{
          maxWidth: 540,
          minWidth: 0,
          backgroundColor: C.raised,
          borderRadius: 12,
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 12,
          paddingRight: 12,
        }}
      >
        <text style={{ fontSize: 14, lineHeight: 20, color: C.text, minWidth: 0, maxWidth: '100%' }}>{text}</text>
      </div>
    </div>
  )
}

function WorkedFor({ duration }: { duration: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <Button
        aria-expanded={open}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          height: 24,
          width: '100%',
          cursor: 'pointer',
        }}
        onClick={() => setOpen((value) => !value)}
      >
        <div style={{ height: 1, flexGrow: 1, backgroundColor: C.border }} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
          }}
        >
          <text style={{ fontSize: 13.5, lineHeight: 18, fontWeight: 500, color: C.tertiary }}>
            {duration}
          </text>
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={11.5} color={C.tertiary} />
        </div>
        <div style={{ height: 1, flexGrow: 1, backgroundColor: C.border }} />
      </Button>
      {open && (
        <text style={{ fontSize: 13, lineHeight: 18, color: C.secondary }}>
          Demo reasoning. No model ran. The fold is here so the chrome has something to open.
        </text>
      )}
    </div>
  )
}

const ROW_INNER_STYLE = { width: CONTENT_MAX_WIDTH, maxWidth: '100%' } as const
const ROW_STYLE = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  width: '100%',
  paddingTop: 8,
  paddingBottom: 8,
  paddingLeft: 20,
  paddingRight: 20,
} as const
const ROW_STYLE_FIRST = { ...ROW_STYLE, paddingTop: 22 } as const
const ROW_STYLE_LAST = { ...ROW_STYLE, paddingBottom: 22 } as const
const ROW_STYLE_ONLY = { ...ROW_STYLE, paddingTop: 22, paddingBottom: 22 } as const

function TranscriptRow({
  children,
  first,
  last,
}: {
  children: React.ReactNode
  first?: boolean
  last?: boolean
}) {
  const style = first && last ? ROW_STYLE_ONLY : first ? ROW_STYLE_FIRST : last ? ROW_STYLE_LAST : ROW_STYLE
  return (
    <div style={style}>
      <div style={ROW_INNER_STYLE}>{children}</div>
    </div>
  )
}

const CODE_CARD_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  minWidth: 0,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: C.border,
  backgroundColor: '#FFFFFF09',
  overflow: 'hidden',
} as const
const CODE_HEADER_STYLE = {
  paddingLeft: 12,
  paddingRight: 12,
  paddingTop: 5,
  paddingBottom: 5,
  borderBottomWidth: 1,
  borderColor: C.border,
  backgroundColor: '#FFFFFF05',
} as const
const CODE_BODY_STYLE = {
  minWidth: 0,
  paddingLeft: 12,
  paddingRight: 12,
  paddingTop: 10,
  paddingBottom: 10,
} as const

/**
 * The card `<code>` used to paint for you. The native element is a bare
 * surface now, so the roundness, the fill and the language header live here,
 * in app code, where they can match the rest of the design.
 */
function CodeBlock({
  code,
  language,
  showLineNumbers,
}: {
  code: string
  language?: string
  showLineNumbers?: boolean
}) {
  return (
    <div style={CODE_CARD_STYLE}>
      {language && (
        <div style={CODE_HEADER_STYLE}>
          <text style={{ fontSize: 12, color: C.secondary }}>{language}</text>
        </div>
      )}
      <code
        code={code}
        language={language}
        showLineNumbers={showLineNumbers}
        theme={CHAT_THEME}
        style={CODE_BODY_STYLE}
      />
    </div>
  )
}

function expandTurns(count: number): Turn[] {
  if (count <= TURNS.length) return TURNS.slice(0, count)
  const out = new Array<Turn>(count)
  for (let i = 0; i < count; i++) {
    out[i] = TURNS[i % TURNS.length]!
  }
  return out
}

function seedTurnsFor(id: string, turnCount: number): Turn[] {
  if (id === 'c1') return expandTurns(turnCount)
  return CONVERSATIONS.find((conversation) => conversation.id === id)?.turns.slice() ?? []
}

function demoReply({
  text,
  modelLabel,
  mode,
}: {
  text: string
  modelLabel: string
  mode: 'build' | 'plan'
}): Turn[] {
  const quoted = text.length > 80 ? `${text.slice(0, 77)}...` : text
  const modeLine =
    mode === 'plan'
      ? 'Plan mode is on, so this is a sketch, not a patch.'
      : 'Build mode is on. This still stays in the demo.'
  return [
    { kind: 'fold', duration: 'Worked for 2 seconds' },
    {
      kind: 'markdown',
      source: `This is the GPUIX chat demo. No model ran. You wrote "${quoted}". ${modelLabel} would answer here. ${modeLine}`,
    },
  ]
}

function titleFromDraft(text: string) {
  const first = text.trim().split(/\s+/).slice(0, 6).join(' ')
  return first.length > 42 ? `${first.slice(0, 39)}...` : first
}

/** A modal card. Dialog owns Escape, the backdrop press, the Tab trap, and
 *  moving focus in on open and back out on close. */
function OverlayCard({
  title,
  open,
  onClose,
  children,
  height,
  initialFocus,
}: {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
  height?: number
  initialFocus?: React.RefObject<PublicInstance | null>
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPortal>
        <DialogBackdrop style={{ backgroundColor: '#00000066' }} />
        <DialogPopup
          initialFocus={initialFocus}
          style={{
            width: 420,
            height,
            maxWidth: '90%',
            backgroundColor: C.raised,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.borderStrong,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <DialogTitle style={{ flexGrow: 1 }}>
              <text style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{title}</text>
            </DialogTitle>
            <DialogClose
              testId="overlay-close"
              style={{
                height: 24,
                paddingLeft: 8,
                paddingRight: 8,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                hover: { backgroundColor: C.overlay },
              }}
            >
              <text style={{ fontSize: 12, color: C.secondary }}>Close</text>
            </DialogClose>
          </div>
          {children}
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}

const Transcript = memo(function Transcript({
  turns,
  includeSafeMdx = false,
  listRef,
  onRetry,
  project = 'kale',
  projectPicker,
  testId,
  showActions = true,
}: {
  turns: Turn[]
  includeSafeMdx?: boolean
  listRef?: React.Ref<PublicInstance>
  onRetry?: () => void
  project?: string
  projectPicker?: React.ReactNode
  testId?: string
  showActions?: boolean
}) {
  const empty = turns.length === 0 && !includeSafeMdx
  // Keep the native list host alive across session changes. Replacing the
  // entire host can retain cached rows in the packaged GPUIX renderer.
  return <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexGrow: empty ? 1 : 0,
          height: empty ? undefined : 0,
          opacity: empty ? 1 : 0,
          overflow: 'hidden',
          minHeight: 0,
          width: '100%',
          gap: 16,
          userSelect: 'none',
        }}
      >
        <svg
          style={{ width: 34, height: 34, color: '#E2795B' }}
          source='<svg viewBox="0 0 24 24" fill="none" stroke="#E2795B" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="3.34" y1="7" x2="20.66" y2="17"/><line x1="3.34" y1="17" x2="20.66" y2="7"/></svg>'
        />
        {projectPicker ? <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <text style={{ fontSize: 21, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', marginRight: 5 }}>What should we build in</text>
          {projectPicker}
          <text style={{ fontSize: 21, fontWeight: 500, color: C.text }}>?</text>
        </div> : <text
          style={{
            fontSize: 21,
            fontWeight: 500,
            color: C.text,
            whiteSpace: 'nowrap',
          }}
        >
          {empty ? project ? `What should we build in ${project}?` : 'What should we build?' : ''}
        </text>}
      </div>
    <virtual-list
      testId={testId}
      ref={listRef}
      overdraw={240}
      estimatedItemHeight={220}
      style={{ flexGrow: empty ? 0 : 1, height: empty ? 0 : undefined, opacity: empty ? 0 : 1, overflow: 'hidden', minHeight: 0, width: '100%' }}
    >
      {includeSafeMdx && (
        <TranscriptRow key="safemdx" first>
          <UserTurn text="Can Markdown be composed as normal React elements instead?" />
          <SafeMdxContent source={SAFE_MDX_STRESS} />
        </TranscriptRow>
      )}
      {turns.map((turn, index) => (
        <TranscriptRow
          key={index}
          first={!includeSafeMdx && index === 0}
          last={index === turns.length - 1}
        >
          {turn.kind === 'user' && <UserTurn text={turn.text} />}
          {turn.kind === 'boundary' && <text style={{ fontSize: 11, color: C.tertiary }}>{turn.text}</text>}
          {turn.kind === 'fold' && <WorkedFor duration={turn.duration} />}
          {turn.kind === 'markdown' && <SafeMdxContent source={turn.source} />}
          {turn.kind === 'code' && (
            <CodeBlock code={turn.source} language={turn.language} showLineNumbers />
          )}
          {turn.kind === 'diff' && <diff patch={turn.patch} wordDiff theme={CHAT_THEME} />}
          {showActions && index === turns.length - 1 && turn.kind !== 'user' && <ActionBar onRetry={onRetry} />}
        </TranscriptRow>
      ))}
    </virtual-list>
  </div>
})

// The native drag lives in its own module so the titlebar press handler and
// the Win32 plumbing can be tested without a real window.
export { startWindowDrag, handleTitlebarMouseDown }

function ResizeHandle({
  testId,
  isResizing,
  side = 'left',
  onMouseDown,
}: {
  testId?: string
  isResizing: boolean
  side?: 'left' | 'right'
  onMouseDown: (e: any) => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      testId={testId}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        ...(side === 'left' ? { right: 0 } : { left: 0 }),
        width: 8,
        cursor: 'col-resize',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
        backgroundColor: '#00000000',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={onMouseDown}
    >
      <div
        style={{
          width: isResizing || hovered ? 2 : 1,
          height: '100%',
          backgroundColor: isResizing ? C.accent : hovered ? C.borderStrong : C.sidebarBorder,
        }}
      />
    </div>
  )
}

function WindowControls() {
  const { renderer } = useGpuix()
  const isDarwin = typeof process !== 'undefined' && process.platform === 'darwin'
  const [hovered, setHovered] = useState<'minimize' | 'maximize' | 'close' | null>(null)
  const [maximized, setMaximized] = useState(false)
  if (isDarwin || typeof document !== 'undefined') return null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: '100%',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <Button
        testId="window-minimize"
        aria-label="Minimize"
        onClick={() => renderer?.minimizeWindow?.()}
        onMouseEnter={() => setHovered('minimize')}
        onMouseLeave={() => setHovered(null)}
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          hover: { backgroundColor: C.overlay },
          active: { backgroundColor: C.overlayStrong },
        }}
      >
        <Icon name="windowMinimize" size={13} color={C.secondary} />
      </Button>

      <Button
        testId="window-maximize"
        aria-label={maximized ? 'Restore' : 'Maximize'}
        onClick={() => {
          toggleWindowZoom(renderer)
          setMaximized(isWindowMaximized())
        }}
        onMouseEnter={() => {
          // The window can also be zoomed from the titlebar, so read the
          // state instead of trusting the last click.
          setMaximized(isWindowMaximized())
          setHovered('maximize')
        }}
        onMouseLeave={() => setHovered(null)}
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          hover: { backgroundColor: C.overlay },
          active: { backgroundColor: C.overlayStrong },
        }}
      >
        <Icon name={maximized ? 'windowRestore' : 'windowMaximize'} size={12} color={C.secondary} />
      </Button>

      <Button
        testId="window-close"
        aria-label="Close"
        onClick={() => {
          if (typeof process !== 'undefined' && process.exit) process.exit(0)
        }}
        onMouseEnter={() => setHovered('close')}
        onMouseLeave={() => setHovered(null)}
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backgroundColor: hovered === 'close' ? '#3F2427' : '#00000000',
          hover: { backgroundColor: '#3F2427' },
          active: { backgroundColor: '#582E33' },
        }}
      >
        <Icon name="windowClose" size={12} color={C.secondary} />
      </Button>

      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: 34,
            right: 0,
            backgroundColor: '#1E1E20',
            borderWidth: 1,
            borderColor: '#38383D',
            borderRadius: 8,
            paddingTop: 5,
            paddingBottom: 5,
            paddingLeft: 10,
            paddingRight: 10,
            pointerEvents: 'none',
          }}
        >
          <text style={{ fontSize: 12.5, color: '#CCCCCC', whiteSpace: 'nowrap' }}>
            {hovered === 'close'
              ? 'Close Window'
              : hovered === 'maximize'
                ? maximized
                  ? 'Restore Window'
                  : 'Maximize Window'
                : 'Minimize Window'}
          </text>
        </div>
      )}
    </div>
  )
}

function ToggleSwitch({
  checked,
  onChange,
  testId,
}: {
  checked: boolean
  onChange: (val: boolean) => void
  testId?: string
}) {
  return (
    <Button
      testId={testId}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 38,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: checked ? '#FFFFFF' : '#FFFFFF40',
        backgroundColor: '#00000000',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 3,
        paddingRight: 3,
        justifyContent: checked ? 'flex-end' : 'flex-start',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 13,
          height: 13,
          borderRadius: 6.5,
          backgroundColor: '#FFFFFF',
          pointerEvents: 'none',
        }}
      />
    </Button>
  )
}

const SETTINGS_SECTIONS = [
  { id: 'general', label: 'General', icon: 'settings' as const },
  { id: 'appearance', label: 'Appearance', icon: 'contrast' as const },
  { id: 'providers', label: 'Providers', icon: 'blocks' as const },
  { id: 'skills', label: 'Skills', icon: 'cube' as const },
  { id: 'usage', label: 'Usage', icon: 'activity' as const },
  { id: 'daemon', label: 'Daemon', icon: 'server' as const },
]

function SettingsDropdown({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (val: string) => void
}) {
  const currentLabel = options.find((o) => o.value === value)?.label ?? value
  return (
    <Button
      onClick={() => {
        const nextIdx = (options.findIndex((o) => o.value === value) + 1) % options.length
        onChange(options[nextIdx].value)
      }}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 28,
        paddingLeft: 10,
        paddingRight: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: '#262626',
        cursor: 'pointer',
        hover: { backgroundColor: C.overlayStrong },
      }}
    >
      <text style={{ fontSize: 13, color: C.text }}>{currentLabel}</text>
      <Icon name="chevronDown" size={10} color={C.tertiary} />
    </Button>
  )
}

/**
 * The daemon, as the engine reports it.
 *
 * Nothing here is simulated: the version, the pid and the database path come
 * from the running process, and "Restart" really stops it and starts it again.
 */
function DaemonPanel({
  engine,
  onRestart,
}: {
  engine?: EngineSnapshot
  onRestart?: () => void
}) {
  const status = engine?.status ?? 'off'
  const health = engine?.health ?? null
  const connected = status === 'ready' && health !== null
  const starting = status === 'starting'
  const dotColor = connected ? '#4ADE80' : starting ? '#FBBF24' : '#EF4444'
  const word = connected ? 'Running' : starting ? 'Starting' : status === 'off' ? 'Not attached' : 'Disconnected'
  const sessions = engine?.sessions.length ?? 0
  const running = (engine?.sessions ?? []).reduce((total, entry) => total + entry.running, 0)

  const facts: { label: string; value: string }[] =
    connected && health
      ? [
          { label: 'Process', value: `pid ${health.pid}` },
          { label: 'Wire', value: `protocol ${health.protocol} · engine ${health.version}` },
          { label: 'Started', value: new Date(health.startedAt).toLocaleTimeString() },
          { label: 'Sessions', value: running > 0 ? `${sessions} · ${running} running` : String(sessions) },
          ...(health.execution ? [
            { label: 'Execution limits', value: `${health.execution.limits.maxActive} active · ${health.execution.limits.maxQueued} queued maximum` },
            { label: 'RAM at connection', value: `${health.execution.freeMemoryMB} MB free · floor ${health.execution.limits.minFreeMemoryMB} MB` },
            { label: 'Commands', value: health.execution.containment === 'windows-job'
              ? `Windows job · ${health.execution.limits.maxProcesses} processes · ${health.execution.limits.processMemoryMB} MB per command`
              : 'Process group cleanup · memory and process limits monitored' },
          ] : []),
          { label: 'Database', value: health.database },
        ]
      : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 720 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: '#202020',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#E6EAF20A',
          padding: 18,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor, flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1, minWidth: 0 }}>
          <text testId="daemon-status" style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
            {`Hiroshi daemon · ${word}`}
          </text>
          <text style={{ fontSize: 12.5, lineHeight: 18, color: C.secondary }}>
            {connected && health
              ? `${health.name} ${health.version} is listening on this machine, protocol ${health.protocol}`
              : engine?.error ?? 'This build has no engine attached.'}
          </text>
        </div>
        <Button
          testId="daemon-restart"
          onClick={() => onRestart?.()}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            height: 30,
            paddingLeft: 12,
            paddingRight: 12,
            borderRadius: 6,
            backgroundColor: '#2A2A2A',
            borderWidth: 1,
            borderColor: '#383838',
            cursor: 'pointer',
            hover: { backgroundColor: '#333333' },
          }}
        >
          <text style={{ fontSize: 12.5, color: C.text }}>{starting ? 'Starting…' : 'Restart'}</text>
        </Button>
      </div>

      {facts.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            backgroundColor: '#202020',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#E6EAF20A',
            padding: 18,
          }}
        >
          {facts.map((fact) => (
            <div
              key={fact.label}
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <text style={{ fontSize: 12, color: C.ghost, width: 76, flexShrink: 0 }}>{fact.label}</text>
              <text
                testId={`daemon-${fact.label.toLowerCase()}`}
                style={{
                  fontSize: 12,
                  fontFamily: FONT_MONO,
                  color: C.secondary,
                  flexGrow: 1,
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {fact.value}
              </text>
            </div>
          ))}
        </div>
      )}

      <text style={{ fontSize: 13, lineHeight: 19, color: C.secondary, maxWidth: 620 }}>
        The daemon is its own process. A run keeps going when this window closes, and a second window
        attaches to the same runs. The private connection stays on loopback and uses the discovery
        token. Optional network access has a separate listener and credential.
      </text>
    </div>
  )
}

function SettingsView({
  onBack,
  initialSection = 'general',
  engine,
  onRestartEngine,
  providerEngine,
}: {
  onBack: () => void
  initialSection?: string
  engine?: EngineSnapshot
  onRestartEngine?: () => void
  providerEngine?: EngineHandle
}) {
  const [activeSection, setActiveSection] = useState(initialSection)
  const [searchQuery, setSearchQuery] = useState('')
  const { renderer } = useGpuix()
  const windowSize = useWindowSize()

  // General state
  const [shareUsage, setShareUsage] = useState(true)
  const [renderMath, setRenderMath] = useState(true)
  const [autoUpdates, setAutoUpdates] = useState(true)

  // Appearance state
  const [themeValue, setThemeValue] = useState('system')
  const [langValue, setLangValue] = useState('system')
  const [uiFontSize, setUiFontSize] = useState('14px')
  const [codeFontSize, setCodeFontSize] = useState('13px')

  // Usage state
  const [usagePeriod, setUsagePeriod] = useState<'daily' | 'monthly' | 'projects'>('daily')
  const [usageCostType, setUsageCostType] = useState<'cost' | 'tokens'>('cost')
  const [usageBreakdownTab, setUsageBreakdownTab] = useState<'model' | 'day'>('model')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        backgroundColor: C.canvas,
        fontFamily: FONT_SANS,
        color: C.text,
        userSelect: 'none',
      }}
    >
      {/* Left Sidebar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 252,
          flexShrink: 0,
          height: '100%',
          backgroundColor: C.sidebar,
          borderRightWidth: 1,
          borderColor: C.sidebarBorder,
          paddingTop: 12,
          paddingLeft: 12,
          paddingRight: 12,
        }}
      >
        {/* Back Button + caption drag region */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: 8,
          }}
        >
          <Button
            testId="settings-back"
            onClick={onBack}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              height: 32,
              paddingLeft: 6,
              paddingRight: 10,
              borderRadius: 7,
              cursor: 'pointer',
              hover: { backgroundColor: C.overlay },
            }}
          >
            <Icon name="arrowLeft" size={14} color={C.secondary} />
            <text style={{ fontSize: 13.5, fontWeight: 500, color: C.text }}>Back</text>
          </Button>
          <div
            testId="titlebar-drag-settings"
            style={{ flexGrow: 1, height: 32, pointerEvents: 'auto' }}
            onMouseDown={(e: any) => handleTitlebarMouseDown(renderer, e)}
            onMouseMove={() => updateWindowDrag()}
            onMouseUp={() => endWindowDrag()}
          />
        </div>

        {/* Search Settings */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            height: 32,
            paddingLeft: 10,
            paddingRight: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: '#1E1E1E',
            marginBottom: 14,
          }}
        >
          <Icon name="search" size={13} color={C.ghost} />
          <input
            value={searchQuery}
            placeholder="Search Settings"
            theme={CHAT_THEME}
            style={{
              fontSize: 13,
              color: C.text,
              backgroundColor: '#00000000',
              borderWidth: 0,
              flexGrow: 1,
              minWidth: 0,
              height: 28,
            }}
            onChange={(e) => setSearchQuery(e.value ?? '')}
          />
        </div>

        {/* Nav Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SETTINGS_SECTIONS.map((section) => {
            const active = activeSection === section.id
            return (
              <Button
                key={section.id}
                testId={`settings-section-${section.id}`}
                onClick={() => setActiveSection(section.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  height: 36,
                  paddingLeft: 10,
                  paddingRight: 10,
                  borderRadius: 7,
                  cursor: 'pointer',
                  backgroundColor: active ? '#262626' : '#00000000',
                  hover: { backgroundColor: active ? '#262626' : C.item },
                }}
              >
                <Icon
                  name={section.icon}
                  size={15}
                  color={active ? C.text : C.secondary}
                />
                <text
                  style={{
                    fontSize: 13.5,
                    fontWeight: active ? 500 : 400,
                    color: active ? C.text : C.secondary,
                  }}
                >
                  {section.label}
                </text>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Right Content Area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          minWidth: 0,
          height: '100%',
        }}
      >
        {/* Custom Window Titlebar Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            height: 38,
            flexShrink: 0,
            paddingRight: 4,
          }}
        >
          <WindowControls />
        </div>

        {/* Content Body */}
        <div
          testId="settings-content"
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            minHeight: 0,
            overflowY: activeSection === 'skills' ? 'hidden' : 'scroll',
            paddingTop: activeSection === 'providers' ? 16 : 8,
            paddingLeft: activeSection === 'skills' ? 0 : activeSection === 'providers' ? windowSize.width < 1050 ? 32 : 84 : 44,
            paddingRight: activeSection === 'skills' ? 0 : activeSection === 'providers' ? windowSize.width < 1050 ? 32 : 84 : 44,
            paddingBottom: activeSection === 'skills' ? 0 : 40,
          }}
        >
          {activeSection !== 'skills' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: activeSection === 'providers' ? 760 : activeSection === 'usage' ? 1100 : activeSection === 'daemon' ? 820 : 720,
                gap: 14,
              }}
            >
              {/* SECTION: GENERAL */}
              {activeSection === 'general' && (
                <>
                  <text
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: C.text,
                      marginBottom: 10,
                    }}
                  >
                    General
                  </text>

                  {typeof process !== 'undefined' && process.platform === 'linux' && (
                    <text testId="linux-window-drag-notice" style={{ fontSize: 13, color: C.secondary, marginBottom: 12 }}>
                      {'Titlebar dragging is unavailable on Linux. Use your desktop’s Move Window action.'}
                    </text>
                  )}

                  {/* Local by default */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      backgroundColor: '#202020',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E6EAF20A',
                      padding: 18,
                    }}
                  >
                    <text style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                      Local by default
                    </text>
                    <text style={{ fontSize: 13, lineHeight: 18, color: C.secondary }}>
                      Projects, conversations, and settings are stored on this computer
                    </text>
                  </div>

                  {/* Share anonymous usage data */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      backgroundColor: '#202020',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E6EAF20A',
                      padding: 18,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexGrow: 1 }}>
                      <text style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                        Share anonymous usage data
                      </text>
                      <text
                        style={{
                          fontSize: 13,
                          lineHeight: 18,
                          color: C.secondary,
                          maxWidth: 520,
                        }}
                      >
                        Help improve Hiroshi by sharing feature usage and reliability data. Prompts, responses, project names, file paths, and other personal data are never included
                      </text>
                    </div>
                    <ToggleSwitch
                      checked={shareUsage}
                      onChange={setShareUsage}
                      testId="toggle-share-usage"
                    />
                  </div>

                  {/* Render math expressions */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      backgroundColor: '#202020',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E6EAF20A',
                      padding: 18,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexGrow: 1 }}>
                      <text style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                        Render math expressions
                      </text>
                      <text
                        style={{
                          fontSize: 13,
                          lineHeight: 18,
                          color: C.secondary,
                          maxWidth: 520,
                        }}
                      >
                        Show formatted math in Markdown. Turn off to show LaTeX source.
                      </text>
                    </div>
                    <ToggleSwitch
                      checked={renderMath}
                      onChange={setRenderMath}
                      testId="toggle-render-math"
                    />
                  </div>

                  {/* Automatic updates */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      backgroundColor: '#202020',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E6EAF20A',
                      padding: 18,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexGrow: 1 }}>
                      <text style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                        Automatic updates
                      </text>
                      <text
                        style={{
                          fontSize: 13,
                          lineHeight: 18,
                          color: C.secondary,
                          maxWidth: 520,
                        }}
                      >
                        Check for new versions in the background and offer to install them
                      </text>
                    </div>
                    <ToggleSwitch
                      checked={autoUpdates}
                      onChange={setAutoUpdates}
                      testId="toggle-auto-updates"
                    />
                  </div>
                </>
              )}

              {/* SECTION: APPEARANCE */}
              {activeSection === 'appearance' && (
                <>
                  <text
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: C.text,
                      marginBottom: 10,
                    }}
                  >
                    Appearance
                  </text>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: '#202020',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E6EAF20A',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Theme */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 18,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <text style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Theme</text>
                        <text style={{ fontSize: 13, color: C.secondary }}>
                          Choose between system, light, or dark themes
                        </text>
                      </div>
                      <SettingsDropdown
                        value={themeValue}
                        options={[
                          { value: 'system', label: 'System' },
                          { value: 'dark', label: 'Dark' },
                          { value: 'light', label: 'Light' },
                        ]}
                        onChange={setThemeValue}
                      />
                    </div>

                    <div style={{ height: 1, backgroundColor: '#E6EAF20A' }} />

                    {/* Language */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 18,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <text style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Language</text>
                        <text style={{ fontSize: 13, color: C.secondary }}>
                          Choose the language used throughout Hiroshi
                        </text>
                      </div>
                      <SettingsDropdown
                        value={langValue}
                        options={[
                          { value: 'system', label: 'System' },
                          { value: 'en', label: 'English' },
                          { value: 'ja', label: 'Japanese' },
                        ]}
                        onChange={setLangValue}
                      />
                    </div>

                    <div style={{ height: 1, backgroundColor: '#E6EAF20A' }} />

                    {/* UI font size */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 18,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <text style={{ fontSize: 14, fontWeight: 600, color: C.text }}>UI font size</text>
                        <text style={{ fontSize: 13, color: C.secondary }}>
                          Text size across the interface and messages
                        </text>
                      </div>
                      <SettingsDropdown
                        value={uiFontSize}
                        options={[
                          { value: '13px', label: '13 px' },
                          { value: '14px', label: '14 px' },
                          { value: '15px', label: '15 px' },
                          { value: '16px', label: '16 px' },
                        ]}
                        onChange={setUiFontSize}
                      />
                    </div>

                    <div style={{ height: 1, backgroundColor: '#E6EAF20A' }} />

                    {/* Code font size */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 18,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <text style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Code font size</text>
                        <text style={{ fontSize: 13, color: C.secondary }}>
                          Text size in the file editor, diffs, code blocks, and tool output
                        </text>
                      </div>
                      <SettingsDropdown
                        value={codeFontSize}
                        options={[
                          { value: '12px', label: '12 px' },
                          { value: '13px', label: '13 px' },
                          { value: '14px', label: '14 px' },
                        ]}
                        onChange={setCodeFontSize}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* SECTION: PROVIDERS */}
              {activeSection === 'providers' && <ProviderSettings engine={providerEngine} />}

              {/* SECTION: USAGE */}
              {activeSection === 'usage' && providerEngine && <UsageSettings engine={providerEngine} />}
              {activeSection === 'usage' && !engine && (
                <>
                  {/* Usage Top bar */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <text style={{ fontSize: 22, fontWeight: 600, color: C.text }}>Usage</text>
                      <text style={{ fontSize: 13, color: C.secondary }}>Sep 20 to Oct 19</text>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {/* Segmented Daily/Monthly/Projects */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          backgroundColor: '#262626',
                          borderRadius: 7,
                          padding: 2,
                        }}
                      >
                        {(['daily', 'monthly', 'projects'] as const).map((tab) => (
                          <Button
                            key={tab}
                            onClick={() => setUsagePeriod(tab)}
                            style={{
                              height: 24,
                              paddingLeft: 8,
                              paddingRight: 8,
                              borderRadius: 5,
                              backgroundColor: usagePeriod === tab ? '#333333' : '#00000000',
                              cursor: 'pointer',
                            }}
                          >
                            <text
                              style={{
                                fontSize: 12,
                                fontWeight: usagePeriod === tab ? 500 : 400,
                                color: usagePeriod === tab ? C.text : C.secondary,
                              }}
                            >
                              {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </text>
                          </Button>
                        ))}
                      </div>

                      <SettingsDropdown
                        value="30d"
                        options={[{ value: '30d', label: 'Last 30 days' }]}
                        onChange={() => {}}
                      />

                      <Button
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#262626',
                          cursor: 'pointer',
                        }}
                      >
                        <Icon name="retry" size={12} color={C.secondary} />
                      </Button>
                    </div>
                  </div>

                  {/* RAW TOKEN COST Card */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: '#202020',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E6EAF20A',
                      padding: 18,
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <text style={{ fontSize: 11.5, fontWeight: 600, color: C.ghost }}>
                        RAW TOKEN COST
                      </text>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            backgroundColor: '#262626',
                            borderRadius: 6,
                            padding: 2,
                          }}
                        >
                          {(['cost', 'tokens'] as const).map((t) => (
                            <Button
                              key={t}
                              onClick={() => setUsageCostType(t)}
                              style={{
                                height: 20,
                                paddingLeft: 6,
                                paddingRight: 6,
                                borderRadius: 4,
                                backgroundColor: usageCostType === t ? '#383838' : '#00000000',
                              }}
                            >
                              <text style={{ fontSize: 11, fontWeight: 500, color: usageCostType === t ? C.text : C.secondary }}>
                                {t.toUpperCase()}
                              </text>
                            </Button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#E2795B' }} />
                          <text style={{ fontSize: 12, color: C.secondary }}>Claude Code</text>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexGrow: 1 }}>
                        <text style={{ fontSize: 28, fontWeight: 700, color: C.text }}>$1.36*</text>
                        <text style={{ fontSize: 12, color: C.ghost }}>* if billed at full API rate</text>

                        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6, width: 280 }}>
                          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                            <text style={{ fontSize: 12.5, color: C.text }}>Claude Code</text>
                            <text style={{ fontSize: 12.5, color: C.text }}>$1.36</text>
                          </div>
                          <div style={{ height: 4, borderRadius: 2, backgroundColor: '#333333', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: '100%', backgroundColor: '#E2795B' }} />
                          </div>
                          <text style={{ fontSize: 11.5, color: C.ghost }}>100.0% of cost · 3.21M tokens</text>
                        </div>
                      </div>

                      {/* Chart representation */}
                      <div style={{ display: 'flex', flexDirection: 'column', width: 280, height: 110, justifyContent: 'space-between', paddingLeft: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                          <text style={{ fontSize: 11, color: C.ghost }}>$1.50</text>
                          <div style={{ width: 220, height: 1, backgroundColor: '#FFFFFF0A' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', position: 'relative' }}>
                          <text style={{ fontSize: 11, color: C.ghost }}>$1.00</text>
                          <div style={{ width: 220, height: 1, backgroundColor: '#FFFFFF0A' }} />
                          {/* Visual Spike */}
                          <div
                            style={{
                              position: 'absolute',
                              left: 30,
                              top: -20,
                              width: 3,
                              height: 60,
                              backgroundColor: '#E2795B',
                              borderRadius: 1.5,
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                          <text style={{ fontSize: 11, color: C.ghost }}>$0.50</text>
                          <div style={{ width: 220, height: 1, backgroundColor: '#FFFFFF0A' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                          <text style={{ fontSize: 11, color: C.ghost }}>0</text>
                          <div style={{ width: 220, height: 1, backgroundColor: '#FFFFFF12' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 20 }}>
                          <text style={{ fontSize: 11, color: C.ghost }}>Sep 20</text>
                          <text style={{ fontSize: 11, color: C.ghost }}>Oct 5</text>
                          <text style={{ fontSize: 11, color: C.ghost }}>Oct 19</text>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5 Stats Cards Row */}
                  <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
                    {[
                      { title: 'Processed tokens', value: '3.21M', sub: '3.21M per active...' },
                      { title: 'Cached input', value: '3.05M', sub: '100.0% of obser...' },
                      { title: 'Uncached input', value: '86', sub: '145K cache writes' },
                      { title: 'Output', value: '14.2K', sub: 'includes 0 reaso...' },
                      { title: 'Cache savings', value: '$9.48', sub: '7.0x the raw toke...' },
                    ].map((stat) => (
                      <div
                        key={stat.title}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          flexGrow: 1,
                          backgroundColor: '#202020',
                          borderRadius: 10,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: '#E6EAF20A',
                          gap: 4,
                        }}
                      >
                        <text style={{ fontSize: 11.5, color: C.secondary }}>{stat.title}</text>
                        <text style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{stat.value}</text>
                        <text style={{ fontSize: 11, color: C.ghost }}>{stat.sub}</text>
                      </div>
                    ))}
                  </div>

                  {/* Breakdown Table */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: '#202020',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E6EAF20A',
                      padding: 16,
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <text style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>Breakdown</text>
                      <div style={{ display: 'flex', flexDirection: 'row', backgroundColor: '#262626', borderRadius: 6, padding: 2 }}>
                        {(['model', 'day'] as const).map((tab) => (
                          <Button
                            key={tab}
                            onClick={() => setUsageBreakdownTab(tab)}
                            style={{
                              height: 20,
                              paddingLeft: 8,
                              paddingRight: 8,
                              borderRadius: 4,
                              backgroundColor: usageBreakdownTab === tab ? '#383838' : '#00000000',
                            }}
                          >
                            <text style={{ fontSize: 11, fontWeight: 500, color: usageBreakdownTab === tab ? C.text : C.secondary }}>
                              {tab.toUpperCase()}
                            </text>
                          </Button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 14 }}>
                        <text style={{ fontSize: 12, color: C.ghost }}>Provider reported 0.0%</text>
                        <text style={{ fontSize: 12, color: C.ghost }}>Model priced 100.0%</text>
                      </div>
                    </div>

                    <div style={{ height: 1, backgroundColor: '#E6EAF208' }} />

                    {/* Table headers */}
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 6, paddingRight: 6 }}>
                      <text style={{ fontSize: 12, color: C.ghost, width: 200 }}>Model</text>
                      <text style={{ fontSize: 12, color: C.ghost, width: 80, textAlign: 'right' }}>Cost</text>
                      <text style={{ fontSize: 12, color: C.ghost, width: 80, textAlign: 'right' }}>Share</text>
                      <text style={{ fontSize: 12, color: C.ghost, width: 80, textAlign: 'right' }}>Tokens</text>
                    </div>

                    {/* Table rows */}
                    {[
                      { model: 'claude-opus-5-5', cost: '$0.89', share: '65.4%', tokens: '2.06M' },
                      { model: 'claude-sonnet-5', cost: '$0.47', share: '34.6%', tokens: '1.15M' },
                    ].map((row) => (
                      <div
                        key={row.model}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingLeft: 6,
                          paddingRight: 6,
                          paddingTop: 4,
                          paddingBottom: 4,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, width: 200 }}>
                          <Icon name="sparkle" size={13} color="#E2795B" />
                          <text style={{ fontSize: 13, color: C.text }}>{row.model}</text>
                        </div>
                        <text style={{ fontSize: 13, color: C.text, width: 80, textAlign: 'right' }}>{row.cost}</text>
                        <text style={{ fontSize: 13, color: C.secondary, width: 80, textAlign: 'right' }}>{row.share}</text>
                        <text style={{ fontSize: 13, color: C.secondary, width: 80, textAlign: 'right' }}>{row.tokens}</text>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* SECTION: DAEMON */}
              {activeSection === 'daemon' && (
                <>
                  <text
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: C.text,
                      marginBottom: 10,
                    }}
                  >
                    Daemon
                  </text>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <NetworkSettings engine={providerEngine} />
                    <DaemonPanel engine={engine} onRestart={onRestartEngine} />
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === 'skills' && <SkillsSettings engine={providerEngine} renderMarkdown={(source) => <SafeMdxContent source={source} />} />}
        </div>
      </div>
    </div>
  )
}

function Header({
  runStatus,
  onUsage,
  collapsed,
  onExpand,
  title,
  turnCount,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onToggleRightPanel,
  rightPanelOpen,
  onOpenCommitModal,
  onOpenReview,
  activeId,
}: {
  collapsed: boolean
  onExpand: () => void
  title: string
  turnCount: number
  runStatus?: string
  onUsage?: () => void
  canGoBack: boolean
  canGoForward: boolean
  onBack: () => void
  onForward: () => void
  onToggleRightPanel: () => void
  rightPanelOpen: boolean
  onOpenCommitModal?: () => void
  onOpenReview?: () => void
  activeId?: string
}) {
  const { renderer } = useGpuix()
  const [envMenuOpen, setEnvMenuOpen] = useState(false)
  const [copiedTaskId, setCopiedTaskId] = useState(false)

  const taskIdDisplay = activeId || 'No session'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: TITLEBAR_HEIGHT,
        flexShrink: 0,
        paddingLeft: collapsed ? 0 : 14,
        paddingRight: 14,
        userSelect: 'none',
      }}
    >
      {collapsed && (
        <>
          <div style={{ width: TRAFFIC_LIGHT_CLEARANCE - 8, height: '100%', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <IconButton icon="sidebar" testId="sidebar-expand" onClick={onExpand} />
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <IconButton icon="arrowLeft" dimmed={!canGoBack} onClick={onBack} />
              <IconButton icon="arrowRight" dimmed={!canGoForward} onClick={onForward} />
            </div>
          </div>
        </>
      )}
      {/* Caption drag region — pointerEvents:auto so GPUI inserts a hitbox on an
          unfilled in-flow div (see gpuix should_occlude). Buttons stay outside. */}
      <div
        testId="titlebar-drag-header"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          flexGrow: 1,
          height: '100%',
          minWidth: 0,
          pointerEvents: 'auto',
        }}
        onMouseDown={(e: any) => handleTitlebarMouseDown(renderer, e)}
        onMouseMove={() => updateWindowDrag()}
        onMouseUp={() => endWindowDrag()}
      >
        <text
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: C.text,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            minWidth: 0,
            flexShrink: 1,
          }}
        >
          {title}
        </text>
        {(runStatus || turnCount > TURNS.length) && (
          <text
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: C.tertiary,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {`${turnCount.toLocaleString('en-US')} turns`}
          </text>
        )}
        <div style={{ flexGrow: 1, height: '100%' }} />
        {runStatus && <text testId="engine-run-status" style={{ fontSize: 11, color: C.tertiary, whiteSpace: 'nowrap' }}>{runStatus}</text>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {onUsage && <IconButton icon="activity" testId="run-usage-open" onClick={onUsage} />}
        <div style={{ position: 'relative' }}>
          <IconButton
            icon="info"
            testId="environment-menu-toggle"
            active={envMenuOpen}
            onClick={() => setEnvMenuOpen((v) => !v)}
            borderRadius={14}
            tooltip="Environment & tasks"
          />
          {envMenuOpen && (
            <anchored side="bottom" align="end" gap={4} fit="snap" deferred priority={1} occlude>
              <div
                style={{
                  width: 236,
                  backgroundColor: '#1E1E1E',
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: '#303030',
                  padding: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <Button
                  testId="env-commit-push"
                  onClick={() => {
                    setEnvMenuOpen(false)
                    onOpenCommitModal?.()
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    height: 32,
                    paddingLeft: 10,
                    paddingRight: 10,
                    borderRadius: 6,
                    cursor: 'pointer',
                    hover: { backgroundColor: '#2C2C2C' },
                  }}
                >
                  <text style={{ fontSize: 13, color: C.text }}>Commit or push</text>
                </Button>
                <Button
                  testId="env-compare-branch"
                  onClick={() => {
                    setEnvMenuOpen(false)
                    onOpenReview?.()
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: 32,
                    paddingLeft: 10,
                    paddingRight: 10,
                    borderRadius: 6,
                    cursor: 'pointer',
                    hover: { backgroundColor: '#2C2C2C' },
                  }}
                >
                  <text style={{ fontSize: 13, color: C.text }}>Compare branch</text>
                  <Icon name="arrowUpRight" size={13} color={C.tertiary} />
                </Button>

                <div style={{ height: 1, backgroundColor: '#2A2A2A', marginTop: 3, marginBottom: 3 }} />

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    paddingLeft: 10,
                    paddingRight: 6,
                    paddingTop: 4,
                    paddingBottom: 6,
                  }}
                >
                  <text style={{ fontSize: 11, fontWeight: 500, color: C.tertiary }}>Task ID</text>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#141414',
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#2A2A2A',
                      paddingLeft: 8,
                      paddingRight: 4,
                      height: 28,
                    }}
                  >
                    <text
                      style={{
                        fontSize: 11.5,
                        fontFamily: FONT_MONO,
                        color: C.secondary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 165,
                      }}
                    >
                      {taskIdDisplay}
                    </text>
                    <Button
                      testId="copy-task-id-btn"
                      onClick={() => {
                        setCopiedTaskId(true)
                        setTimeout(() => setCopiedTaskId(false), 2000)
                      }}
                      style={{
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 4,
                        cursor: 'pointer',
                        hover: { backgroundColor: '#252525' },
                      }}
                    >
                      <Icon
                        name={copiedTaskId ? 'check' : 'copy'}
                        size={12}
                        color={copiedTaskId ? '#10B981' : C.tertiary}
                      />
                    </Button>
                  </div>
                </div>
              </div>
            </anchored>
          )}
        </div>
        {!rightPanelOpen && (
          <>
            <IconButton
              icon="panelRight"
              testId="panel-right-open"
              onClick={onToggleRightPanel}
              borderRadius={14}
              tooltip="Toggle Right Panel"
            />
            <WindowControls />
          </>
        )}
      </div>
    </div>
  )
}

type SurfaceKind = 'none' | 'browser' | 'terminal' | 'files' | 'review' | 'editor' | 'dock'

const SURFACES: { id: SurfaceKind; label: string; icon: IconName; desc: string }[] = [
  { id: 'editor', label: 'Editor', icon: 'compose', desc: 'Code editor buffers & tabs' },
  { id: 'dock', label: 'Dock', icon: 'blocks', desc: 'Dockable layout engine' },
  { id: 'browser', label: 'Browser', icon: 'globe', desc: 'Open a local app or URL' },
  { id: 'terminal', label: 'Terminal', icon: 'terminal', desc: 'Start a shell in this workspace' },
  { id: 'files', label: 'Files', icon: 'folder', desc: 'Browse and read workspace files' },
  { id: 'review', label: 'Review', icon: 'fileDiff', desc: 'Review file changes' },
]

/** One durable run, drawn from the engine's events. */
function TerminalRun({
  run,
  output,
  truncated,
  onCancel,
}: {
  run: EngineRun
  output: string
  truncated: boolean
  onCancel: () => void
}) {
  const lines = output.replace(/\r\n/g, '\n').split('\n')
  // A runaway command cannot blow the paint budget: the terminal shows the tail.
  const shown = lines.length > 400 ? lines.slice(-400) : lines
  const seconds = ((run.endedAt ?? Date.now()) - run.startedAt) / 1000
  const color =
    run.status === 'running'
      ? '#FBBF24'
      : run.status === 'succeeded'
        ? '#4ADE80'
        : run.status === 'failed'
          ? '#F87171'
          : '#A3A3A3'
  const footer =
    run.status === 'running'
      ? 'running…'
      : run.status === 'succeeded'
        ? `exit ${run.exitCode ?? 0} · ${seconds.toFixed(1)}s`
        : run.status === 'failed'
          ? `exit ${run.exitCode ?? '?'} · failed · ${seconds.toFixed(1)}s`
          : `${run.status} · ${seconds.toFixed(1)}s`

  return (
    <div
      testId="terminal-run"
      style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 10 }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <text
          style={{
            fontSize: 13,
            lineHeight: 18,
            fontFamily: FONT_MONO,
            color: C.text,
            whiteSpace: 'nowrap',
            flexShrink: 1,
          }}
        >
          {`> ${run.command}`}
        </text>
        {run.status === 'running' && (
          <Button
            testId={`terminal-cancel-${run.id}`}
            onClick={onCancel}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              height: 20,
              paddingLeft: 8,
              paddingRight: 8,
              borderRadius: 5,
              backgroundColor: '#2A2A2A',
              borderWidth: 1,
              borderColor: '#383838',
              cursor: 'pointer',
              hover: { backgroundColor: '#333333' },
            }}
          >
            <text style={{ fontSize: 11, color: C.secondary }}>Stop</text>
          </Button>
        )}
      </div>
      {shown.map((line, index) => (
        <text
          key={index}
          style={{
            fontSize: 13,
            lineHeight: 18,
            fontFamily: FONT_MONO,
            color: C.secondary,
          }}
        >
          {line || ' '}
        </text>
      ))}
      {truncated && (
        <text style={{ fontSize: 11.5, lineHeight: 16, fontFamily: FONT_MONO, color: C.ghost }}>
          output was truncated by the engine
        </text>
      )}
      <text style={{ fontSize: 11.5, lineHeight: 16, fontFamily: FONT_MONO, color }}>{footer}</text>
    </div>
  )
}

function SurfacePanel({
  initialFile,
  initialLine,
  activeSurface,
  onChangeSurface,
  onClose,
  project,
  open = true,
  engine,
}: {
  initialFile?: string
  initialLine?: number
  activeSurface: SurfaceKind
  onChangeSurface: (surface: SurfaceKind) => void
  onClose: () => void
  project: string
  open?: boolean
  engine: EngineHandle
}) {
  const [surfaceMenuOpen, setSurfaceMenuOpen] = useState(false)
  const [termInput, setTermInput] = useState('')
  const promptInput = engine.draft.text
  const [promptMode, setPromptMode] = useState<DeliveryMode>('queue')

  // Every line the terminal shows is the engine's. A command leaves the window
  // as one request and comes back as durable events on the feed.
  const handleTermSubmit = (val: string) => {
    const cmd = val.trim()
    if (!cmd) return
    setTermInput('')
    engine.exec(cmd)
  }

  const handlePromptSubmit = (val: string) => {
    const text = val.trim()
    if (!text || engine.draft.pending || engine.draft.busy || engine.draft.unsaved) return
    void engine.prompt(val, promptMode)
  }

  const engineStatus = engine.snapshot.status
  const engineError = engine.snapshot.error
  const engineRuns = engine.snapshot.runs
  const engineInbox = engine.snapshot.inbox
  const engineReady = engineStatus === 'ready'
  const engineRunning = engineRuns.some((run) => run.status === 'running') || engine.snapshot.toolCalls.some((call) => call.callID && !call.resultMessageID)
  // Delivered counts turns, not transcript lines: the assistant reply to a
  // prompt must not make the inbox look like it delivered two prompts.
  const activeMessages = new Set(engine.snapshot.activeMessageIDs ?? engine.snapshot.messages.map((message) => message.id))
  const delivered = engine.snapshot.messages.filter((message) => message.role === 'user' && activeMessages.has(message.id)).length
  const engineSteps = engine.snapshot.steps.filter((step) => !step.messageID || activeMessages.has(step.messageID))
  const latestStep = engineSteps.length > 0 ? engineSteps[engineSteps.length - 1]! : null
  const stepColor = !latestStep
    ? C.ghost
    : latestStep.status === 'running'
      ? '#FBBF24'
      : latestStep.status === 'succeeded'
        ? '#4ADE80'
        : latestStep.status === 'failed'
          ? '#F87171'
          : '#A3A3A3'
  const stepDetail = !latestStep
    ? ''
    : latestStep.error
      ? `${latestStep.error.code}: ${latestStep.error.message}`
      : latestStep.output.length > 0
        ? latestStep.output.split(/\r?\n/, 1)[0]!
        : latestStep.status === 'running'
          ? 'waiting for the provider…'
          : 'no output'

  const currentDef = SURFACES.find((s) => s.id === activeSurface)

  const { renderer } = useGpuix()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minWidth: 0,
        height: '100%',
        backgroundColor: C.canvas,
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* Titlebar / Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          height: TITLEBAR_HEIGHT,
          flexShrink: 0,
          paddingLeft: 12,
          paddingRight: 14,
        }}
      >
        {/* Left: Tab badge if surface is active */}
        <AnimatePresence initial={false}>
          {activeSurface !== 'none' && currentDef ? (
            <motion.div
              key={currentDef.id}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 112 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#262626',
                borderRadius: 6,
                height: 28,
                paddingLeft: 8,
                paddingRight: 6,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {activeSurface === 'terminal' ? (
                <text style={{ fontSize: 12, fontFamily: FONT_MONO, color: C.secondary, whiteSpace: 'nowrap' }}>&gt;_</text>
              ) : (
                <Icon name={currentDef.icon} size={13} color={C.secondary} />
              )}
              <text style={{ fontSize: 12.5, fontWeight: 500, color: C.text, whiteSpace: 'nowrap' }}>
                {currentDef.label}
              </text>
              <Button
                testId="surface-close-tab"
                aria-label="Close surface"
                onClick={() => onChangeSurface('none')}
                style={{
                  width: 16,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                  cursor: 'pointer',
                  marginLeft: 2,
                  hover: { backgroundColor: C.overlayStrong },
                }}
              >
                <Icon name="windowClose" size={10} color={C.tertiary} />
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div
          testId="titlebar-drag-surface"
          style={{ flexGrow: 1, height: '100%', pointerEvents: 'auto' }}
          onMouseDown={(e: any) => handleTitlebarMouseDown(renderer, e)}
          onMouseMove={() => updateWindowDrag()}
          onMouseUp={() => endWindowDrag()}
        />

        {/* Right controls: + dropdown, panelRight toggle, and WindowControls */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {/* Surface selector button (+) */}
          {activeSurface !== 'none' && (
            <div style={{ position: 'relative' }}>
              <Button
                testId="surface-plus-menu"
                aria-label="Add surface"
                onClick={() => setSurfaceMenuOpen((v) => !v)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backgroundColor: surfaceMenuOpen ? C.overlayStrong : '#00000000',
                  hover: { backgroundColor: C.overlay },
                }}
              >
                <Icon name="plus" size={13} color={C.tertiary} />
              </Button>

              {surfaceMenuOpen && (
                <anchored side="bottom" align="end" gap={4} fit="snap" deferred priority={1} occlude>
                  <div
                    style={{
                      width: 160,
                      backgroundColor: '#212121',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: C.borderStrong,
                      padding: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    {SURFACES.map((s) => (
                      <Button
                        key={s.id}
                        testId={`surface-select-${s.id}`}
                        onClick={() => {
                          onChangeSurface(s.id)
                          setSurfaceMenuOpen(false)
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          padding: 6,
                          borderRadius: 6,
                          cursor: 'pointer',
                          backgroundColor: activeSurface === s.id ? '#2A2A2A' : '#00000000',
                          hover: { backgroundColor: '#2C2C2C' },
                        }}
                      >
                        {s.id === 'terminal' ? (
                          <text style={{ fontSize: 11, fontFamily: FONT_MONO, color: C.secondary, width: 14 }}>&gt;_</text>
                        ) : (
                          <Icon name={s.icon} size={13} color={C.secondary} />
                        )}
                        <text style={{ fontSize: 12.5, color: C.text }}>{s.label}</text>
                      </Button>
                    ))}
                  </div>
                </anchored>
              )}
            </div>
          )}

          <IconButton
            icon="panelRight"
            testId="surface-panel-toggle"
            onClick={onClose}
            borderRadius={14}
          />
          {open && <WindowControls />}
        </div>
      </div>

      {/* Surface Content */}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, width: '100%', position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence initial={false}>
          <motion.div
            key="workspace-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              width: '100%',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            {activeSurface === 'none' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
            padding: 24,
            gap: 4,
          }}
        >
          <text style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>
            Open a surface
          </text>
          <text style={{ fontSize: 13, color: C.tertiary, marginBottom: 24 }}>
            Choose what to show in the right panel
          </text>

          {/* 2x2 Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
              {/* Browser Card */}
              <Button
                testId="surface-card-browser"
                onClick={() => onChangeSurface('browser')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: 196,
                  height: 104,
                  backgroundColor: '#1E1E1E',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#292929',
                  padding: 14,
                  gap: 6,
                  cursor: 'pointer',
                  hover: { backgroundColor: '#252525', borderColor: '#3A3A3A' },
                }}
              >
                <Icon name="globe" size={16} color={C.secondary} />
                <text style={{ fontSize: 13.5, fontWeight: 600, color: C.text, marginTop: 6 }}>
                  Browser
                </text>
                <text style={{ fontSize: 12, color: C.tertiary, lineHeight: 16 }}>
                  Open a local app or URL
                </text>
              </Button>

              {/* Terminal Card */}
              <Button
                testId="surface-card-terminal"
                onClick={() => onChangeSurface('terminal')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: 196,
                  height: 104,
                  backgroundColor: '#1E1E1E',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#292929',
                  padding: 14,
                  gap: 6,
                  cursor: 'pointer',
                  hover: { backgroundColor: '#252525', borderColor: '#3A3A3A' },
                }}
              >
                <text style={{ fontSize: 13, fontFamily: FONT_MONO, color: C.secondary, height: 16 }}>&gt;_</text>
                <text style={{ fontSize: 13.5, fontWeight: 600, color: C.text, marginTop: 6 }}>
                  Terminal
                </text>
                <text style={{ fontSize: 12, color: C.tertiary, lineHeight: 16 }}>
                  Start a shell in this workspace
                </text>
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
              {/* Files Card */}
              <Button
                testId="surface-card-files"
                onClick={() => onChangeSurface('files')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: 196,
                  height: 104,
                  backgroundColor: '#1E1E1E',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#292929',
                  padding: 14,
                  gap: 6,
                  cursor: 'pointer',
                  hover: { backgroundColor: '#252525', borderColor: '#3A3A3A' },
                }}
              >
                <Icon name="folder" size={16} color={C.secondary} />
                <text style={{ fontSize: 13.5, fontWeight: 600, color: C.text, marginTop: 6 }}>
                  Files
                </text>
                <text style={{ fontSize: 12, color: C.tertiary, lineHeight: 16 }}>
                  Browse and read workspace files
                </text>
              </Button>

              {/* Review Card */}
              <Button
                testId="surface-card-review"
                onClick={() => onChangeSurface('review')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: 196,
                  height: 104,
                  backgroundColor: '#1E1E1E',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#292929',
                  padding: 14,
                  gap: 6,
                  cursor: 'pointer',
                  hover: { backgroundColor: '#252525', borderColor: '#3A3A3A' },
                }}
              >
                <Icon name="fileDiff" size={16} color={C.secondary} />
                <text style={{ fontSize: 13.5, fontWeight: 600, color: C.text, marginTop: 6 }}>
                  Review
                </text>
                <text style={{ fontSize: 12, color: C.tertiary, lineHeight: 16 }}>
                  Review file changes
                </text>
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
              {/* Editor Card */}
              <Button
                testId="surface-card-editor"
                onClick={() => onChangeSurface('editor')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: 404,
                  height: 94,
                  backgroundColor: '#1E1E1E',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#292929',
                  padding: 14,
                  gap: 6,
                  cursor: 'pointer',
                  hover: { backgroundColor: '#252525', borderColor: '#3A3A3A' },
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="compose" size={16} color={C.accent} />
                  <text style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>
                    Editor
                  </text>
                </div>
                <text style={{ fontSize: 12, color: C.tertiary, lineHeight: 16 }}>
                  Multi-buffer tabs, syntax highlighting, and status bar
                </text>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Active View */}
      {activeSurface === 'terminal' && (
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
          {/* Subheader info bar */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 28,
              paddingLeft: 14,
              paddingRight: 14,
              borderBottomWidth: 1,
              borderColor: C.border,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: engineReady ? '#4ADE80' : '#EF4444',
                  flexShrink: 0,
                }}
              />
              <text
                style={{
                  fontSize: 11.5,
                  fontFamily: FONT_MONO,
                  color: C.tertiary,
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                }}
              >
                {project}
              </text>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {engineRunning && (
                <Button
                  testId="interrupt-session"
                  onClick={() => engine.interrupt()}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    height: 20,
                    paddingLeft: 7,
                    paddingRight: 8,
                    borderRadius: 4,
                    backgroundColor: '#E2795B1A',
                    borderWidth: 1,
                    borderColor: '#E2795B44',
                    cursor: 'pointer',
                    hover: { backgroundColor: '#E2795B2A' },
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: C.accent, flexShrink: 0 }} />
                  <text style={{ fontSize: 10.5, fontWeight: '600', color: C.accent, whiteSpace: 'nowrap' }}>
                    Interrupt
                  </text>
                </Button>
              )}
              <text style={{ fontSize: 11.5, color: C.ghost, flexShrink: 0 }}>
                {project}
              </text>
            </div>
          </div>

          {/* Monospace Shell Output & Input */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              padding: 14,
              overflowY: 'scroll',
              gap: 4,
              fontFamily: FONT_MONO,
            }}
          >
            {engine.snapshot.toolCalls.filter((call) => call.callID && call.tool === 'shell').map((call) => (
              <div key={call.id} testId="terminal-model-tool" style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 10 }}>
                <text style={{ fontSize: 12, color: C.secondary }}>{`Model shell · ${call.status} · ${call.id}`}</text>
                <text style={{ fontSize: 12, color: C.text }}>{call.input}</text>
                {(call.output || call.error) && <text style={{ fontSize: 12, color: C.tertiary }}>{call.output || call.error}</text>}
              </div>
            ))}
            {engineReady ? (
              engineRuns.length === 0 ? (
                <text
                  style={{
                    fontSize: 12.5,
                    lineHeight: 18,
                    fontFamily: FONT_MONO,
                    color: C.ghost,
                  }}
                >
                  {`The daemon is listening for ${project}. A command runs in the engine, not in this window.`}
                </text>
              ) : (
                engineRuns.map((run) => (
                  <TerminalRun
                    key={run.id}
                    run={run}
                    output={engine.snapshot.output[run.id]?.text ?? ''}
                    truncated={engine.snapshot.output[run.id]?.truncated ?? false}
                    onCancel={() => engine.cancel(run.id)}
                  />
                ))
              )
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 6,
                }}
              >
                <text
                  testId="terminal-offline"
                  style={{
                    fontSize: 12.5,
                    lineHeight: 18,
                    fontFamily: FONT_MONO,
                    color: '#FCD34D',
                  }}
                >
                  {engineStatus === 'starting'
                    ? 'Starting the daemon…'
                    : engineStatus === 'off'
                      ? 'This build has no engine attached.'
                      : 'The daemon is not reachable.'}
                </text>
                {engineError && (
                  <text
                    style={{
                      fontSize: 12,
                      lineHeight: 17,
                      fontFamily: FONT_MONO,
                      color: C.tertiary,
                    }}
                  >
                    {engineError}
                  </text>
                )}
                <Button
                  testId="terminal-retry"
                  onClick={() => engine.restart()}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 26,
                    paddingLeft: 10,
                    paddingRight: 10,
                    borderRadius: 6,
                    backgroundColor: '#2A2A2A',
                    borderWidth: 1,
                    borderColor: '#383838',
                    cursor: 'pointer',
                    hover: { backgroundColor: '#333333' },
                  }}
                >
                  <text style={{ fontSize: 12, color: C.text }}>Restart the daemon</text>
                </Button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
              <text
                style={{
                  fontSize: 13,
                  lineHeight: 18,
                  fontFamily: FONT_MONO,
                  color: C.text,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {`${project}> `}
              </text>
              <input
                testId="terminal-input"
                value={termInput}
                theme={CHAT_THEME}
                placeholder="█"
                style={{
                  flexGrow: 1,
                  height: 20,
                  fontSize: 13,
                  fontFamily: FONT_MONO,
                  color: C.text,
                  backgroundColor: '#00000000',
                  borderWidth: 0,
                  padding: 0,
                }}
                onChange={(e) => setTermInput(e.value ?? '')}
                onSubmit={(e) => handleTermSubmit(e.value ?? termInput)}
              />
            </div>
          </div>

          {/* The step: one model call, durable before it streamed. */}
          {latestStep && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                borderTopWidth: 1,
                borderColor: C.border,
                backgroundColor: C.composer,
                paddingLeft: 14,
                paddingRight: 14,
                paddingTop: 6,
                paddingBottom: 6,
                gap: 3,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="sparkle" size={11} color={stepColor} />
                <text
                  testId="session-step-title"
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    fontFamily: FONT_MONO,
                    color: stepColor,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {`STEP · ${latestStep.provider.toUpperCase()} · ${latestStep.status.toUpperCase()} · ATTEMPT ${latestStep.attempt}`}
                </text>
                <text style={{ fontSize: 10, color: C.ghost, fontFamily: FONT_MONO, whiteSpace: 'nowrap' }}>
                  {latestStep.model}
                </text>
              </div>
              <text
                testId="session-step-detail"
                style={{
                  fontSize: 11,
                  lineHeight: 15,
                  fontFamily: FONT_MONO,
                  color: latestStep.status === 'failed' ? '#F87171' : C.tertiary,
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {stepDetail}
              </text>
            </div>
          )}

          <ContextHistory
            configuration={engine.snapshot.configuration}
            messages={engine.snapshot.messages}
            compactions={engine.snapshot.compactions}
            contexts={engine.snapshot.contexts}
          />

          {/* The session's inbox: prompts the engine has admitted, not delivered. */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              borderTopWidth: 1,
              borderColor: C.border,
              backgroundColor: C.composer,
              paddingLeft: 14,
              paddingRight: 14,
              paddingTop: 8,
              paddingBottom: 10,
              gap: 6,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <Icon name="inbox" size={12} color={engineInbox.length > 0 ? C.accent : C.ghost} />
                <text
                  testId="session-inbox-title"
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: C.tertiary,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {`INBOX · ${engineInbox.length} PENDING · ${delivered} DELIVERED`}
                </text>
              </div>
              <text style={{ fontSize: 10, color: C.ghost, fontFamily: FONT_MONO, whiteSpace: 'nowrap' }}>
                {engineInbox.length > 0 ? 'delivered at the next safe boundary' : 'a prompt waits for the step to end'}
              </text>
            </div>

            {engineInbox.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 96, overflowY: 'scroll' }}>
                {engineInbox.map((item) => (
                  <div
                    key={item.id}
                    testId={`inbox-item-${item.id}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingLeft: 8,
                      paddingRight: 8,
                      paddingTop: 4,
                      paddingBottom: 4,
                      borderRadius: 5,
                      backgroundColor: C.item,
                    }}
                  >
                    <div
                      style={{
                        paddingLeft: 5,
                        paddingRight: 5,
                        paddingTop: 1,
                        paddingBottom: 1,
                        borderRadius: 3,
                        flexShrink: 0,
                        backgroundColor: item.mode === 'steer' ? '#E2795B22' : '#E6EAF217',
                      }}
                    >
                      <text
                        style={{
                          fontSize: 9.5,
                          fontWeight: '700',
                          fontFamily: FONT_MONO,
                          color: item.mode === 'steer' ? C.accent : C.tertiary,
                        }}
                      >
                        {item.mode === 'steer' ? 'STEER' : 'QUEUE'}
                      </text>
                    </div>
                    <text
                      style={{
                        flexGrow: 1,
                        minWidth: 0,
                        fontSize: 11.5,
                        color: C.text,
                        fontFamily: FONT_MONO,
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.text}
                    </text>
                    <text style={{ flexShrink: 0, fontSize: 10, color: C.ghost, fontFamily: FONT_MONO }}>
                      {`#${item.seq}`}
                    </text>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexShrink: 0,
                  borderRadius: 5,
                  backgroundColor: C.raised,
                  borderWidth: 1,
                  borderColor: C.border,
                  overflow: 'hidden',
                }}
              >
                {(['steer', 'queue'] as const).map((mode) => (
                  <div
                    key={mode}
                    testId={`prompt-mode-${mode}`}
                    onClick={() => setPromptMode(mode)}
                    style={{
                      paddingLeft: 8,
                      paddingRight: 8,
                      paddingTop: 4,
                      paddingBottom: 4,
                      cursor: 'pointer',
                      backgroundColor: promptMode === mode ? '#E2795B22' : '#00000000',
                      hover: { backgroundColor: promptMode === mode ? '#E2795B2A' : C.item },
                    }}
                  >
                    <text
                      style={{
                        fontSize: 10,
                        fontWeight: '600',
                        fontFamily: FONT_MONO,
                        color: promptMode === mode ? C.accent : C.tertiary,
                      }}
                    >
                      {mode === 'steer' ? 'STEER' : 'QUEUE'}
                    </text>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexGrow: 1,
                  minWidth: 0,
                  height: 28,
                  gap: 6,
                  borderRadius: 6,
                  backgroundColor: C.canvas,
                  borderWidth: 1,
                  borderColor: C.borderStrong,
                  paddingLeft: 8,
                  paddingRight: 4,
                }}
              >
                <input
                  testId="prompt-input"
                  value={promptInput}
                  theme={CHAT_THEME}
                  placeholder={
                    promptMode === 'steer'
                      ? 'Steer the session at the next boundary…'
                      : 'Queue a prompt for when the session is idle…'
                  }
                  style={{
                    flexGrow: 1,
                    minWidth: 0,
                    fontSize: 11.5,
                    fontFamily: FONT_MONO,
                    color: C.text,
                    backgroundColor: '#00000000',
                    borderWidth: 0,
                    padding: 0,
                  }}
                  onChange={(e) => engine.editDraft(e.value ?? '')}
                  onSubmit={(e) => handlePromptSubmit(e.value ?? promptInput)}
                />
                <div
                  testId="prompt-send"
                  onClick={() => handlePromptSubmit(promptInput)}
                  style={{
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: promptInput.trim() ? C.accent : C.overlayStrong,
                    cursor: promptInput.trim() ? 'pointer' : 'default',
                    hover: promptInput.trim() ? { backgroundColor: '#EA8A6E' } : undefined,
                  }}
                >
                  <Icon name="send" size={11} color={promptInput.trim() ? C.onInverse : C.tertiary} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <BrowserSurface engine={engine} active={open && activeSurface === 'browser'} />
      <FilesSurface engine={engine} active={open && activeSurface === 'files'} initialFile={initialFile} initialLine={initialLine} onOpenEditor={() => onChangeSurface('editor')} />
      <ReviewSurface engine={engine} active={open && activeSurface === 'review'} />
      {open && activeSurface === 'editor' && <EditorWorkspace engine={engine} initialFile={initialFile} />}
      {open && activeSurface === 'dock' && <DockWorkspace engine={engine} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function CommandPaletteModal({
  open,
  onClose,
  onNewTask,
  onOpenProject,
  onChooseModel,
  onFocusComposer,
  onCopyTaskId,
  onToggleUsage,
  onCollapseSidebar,
  conversations,
  onSelectConversation,
}: {
  open: boolean
  onClose: () => void
  onNewTask: () => void
  onOpenProject: () => void
  onChooseModel: () => void
  onFocusComposer: () => void
  onCopyTaskId: () => void
  onToggleUsage: () => void
  onCollapseSidebar: () => void
  conversations: Conversation[]
  onSelectConversation: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<PublicInstance | null>(null)
  const [highlightedId, setHighlightedId] = useState<string>('new-task')

  useEffect(() => {
    if (open) {
      setQuery('')
      setHighlightedId('new-task')
    }
  }, [open])

  const suggestedItems = [
    { id: 'new-task', label: 'New task', icon: 'pencil' as const, shortcut: 'Ctrl+N', action: onNewTask },
    { id: 'resume', label: 'Resume...', icon: 'retry' as const, action: () => onClose() },
    { id: 'open-project', label: 'Open project...', icon: 'folder' as const, action: onOpenProject },
    { id: 'choose-model', label: 'Choose model...', icon: 'blocks' as const, shortcut: 'Ctrl+/', action: onChooseModel },
  ]

  const commandItems = [
    { id: 'focus-composer', label: 'Focus Composer', icon: 'pencil' as const, shortcut: 'Ctrl+L', action: onFocusComposer },
    { id: 'copy-task-id', label: 'Copy Task ID', icon: 'copy' as const, action: onCopyTaskId },
    { id: 'toggle-usage', label: 'Toggle Usage Panel', icon: 'activity' as const, shortcut: 'Ctrl+U', action: onToggleUsage },
    { id: 'collapse-sidebar', label: 'Collapse all sidebar groups', icon: 'sidebar' as const, action: onCollapseSidebar },
  ]

  const q = query.trim().toLowerCase()

  const filteredSuggested = q
    ? suggestedItems.filter((i) => i.label.toLowerCase().includes(q))
    : suggestedItems

  const filteredCommands = q
    ? commandItems.filter((i) => i.label.toLowerCase().includes(q))
    : commandItems

  const matchedTasks = q
    ? conversations.filter((c) => c.title.toLowerCase().includes(q))
    : []

  const executeItem = (action: () => void) => {
    onClose()
    action()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPortal
        {...({ position: { x: 0, y: 0 } } as any)}
        onMouseDown={onClose}
        style={{
          width: 1180,
          height: 820,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 70,
          backgroundColor: '#00000088',
        }}
      >
        <DialogPopup
          initialFocus={inputRef}
          onMouseDown={(e: any) => {
            // Stop backdrop click from closing when clicking inside popup
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
          }}
          style={{
            width: 580,
            maxWidth: '92%',
            maxHeight: 520,
            backgroundColor: '#1E1E1E',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#303030',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            paddingTop: 4,
            paddingBottom: 6,
            paddingLeft: 0,
            paddingRight: 0,
          }}
        >
          {/* Top Search Input */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: 8,
              paddingBottom: 8,
            }}
          >
            <input
              ref={inputRef}
              testId="command-palette-input"
              value={query}
              placeholder="Search tasks or run a command..."
              theme={CHAT_THEME}
              style={{
                width: '100%',
                height: 34,
                fontSize: 14,
                color: C.text,
                backgroundColor: '#00000000',
                borderWidth: 0,
                padding: 0,
              }}
              onChange={(e) => setQuery(e.value ?? '')}
            />
          </div>

          <div style={{ height: 1, backgroundColor: '#292929', width: '100%' }} />

          {/* Items List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              overflowY: 'scroll',
              paddingLeft: 8,
              paddingRight: 8,
              paddingTop: 6,
              paddingBottom: 6,
            }}
          >
            {/* Suggested Section */}
            {filteredSuggested.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 6 }}>
                <text
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: C.ghost,
                    paddingLeft: 10,
                    paddingTop: 4,
                    paddingBottom: 4,
                  }}
                >
                  Suggested
                </text>
                {filteredSuggested.map((item) => {
                  const isHighlighted = highlightedId === item.id
                  return (
                    <Button
                      key={item.id}
                      testId={`command-${item.id}`}
                      onClick={() => executeItem(item.action)}
                      onMouseEnter={() => setHighlightedId(item.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        height: 36,
                        paddingLeft: 10,
                        paddingRight: 10,
                        borderRadius: 7,
                        cursor: 'pointer',
                        backgroundColor: isHighlighted ? '#2B2B2B' : '#00000000',
                        hover: { backgroundColor: '#2B2B2B' },
                      }}
                    >
                      <Icon name={item.icon} size={15} color={C.secondary} />
                      <text style={{ fontSize: 13, color: C.text, flexGrow: 1 }}>
                        {item.label}
                      </text>
                      {item.shortcut && (
                        <div
                          style={{
                            paddingLeft: 6,
                            paddingRight: 6,
                            paddingTop: 2,
                            paddingBottom: 2,
                            borderRadius: 4,
                            backgroundColor: '#262626',
                            borderWidth: 1,
                            borderColor: '#383838',
                          }}
                        >
                          <text style={{ fontSize: 11, color: C.tertiary, fontFamily: FONT_SANS }}>
                            {item.shortcut}
                          </text>
                        </div>
                      )}
                    </Button>
                  )
                })}
              </div>
            )}

            {/* Commands Section */}
            {filteredCommands.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 6 }}>
                <text
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: C.ghost,
                    paddingLeft: 10,
                    paddingTop: 4,
                    paddingBottom: 4,
                  }}
                >
                  Commands
                </text>
                {filteredCommands.map((item) => {
                  const isHighlighted = highlightedId === item.id
                  return (
                    <Button
                      key={item.id}
                      testId={`command-${item.id}`}
                      onClick={() => executeItem(item.action)}
                      onMouseEnter={() => setHighlightedId(item.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        height: 36,
                        paddingLeft: 10,
                        paddingRight: 10,
                        borderRadius: 7,
                        cursor: 'pointer',
                        backgroundColor: isHighlighted ? '#2B2B2B' : '#00000000',
                        hover: { backgroundColor: '#2B2B2B' },
                      }}
                    >
                      <Icon name={item.icon} size={15} color={C.secondary} />
                      <text style={{ fontSize: 13, color: C.text, flexGrow: 1 }}>
                        {item.label}
                      </text>
                      {item.shortcut && (
                        <div
                          style={{
                            paddingLeft: 6,
                            paddingRight: 6,
                            paddingTop: 2,
                            paddingBottom: 2,
                            borderRadius: 4,
                            backgroundColor: '#262626',
                            borderWidth: 1,
                            borderColor: '#383838',
                          }}
                        >
                          <text style={{ fontSize: 11, color: C.tertiary, fontFamily: FONT_SANS }}>
                            {item.shortcut}
                          </text>
                        </div>
                      )}
                    </Button>
                  )
                })}
              </div>
            )}

            {/* Tasks section if query matches */}
            {matchedTasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <text
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: C.ghost,
                    paddingLeft: 10,
                    paddingTop: 4,
                    paddingBottom: 4,
                  }}
                >
                  Tasks
                </text>
                {matchedTasks.map((t) => (
                  <Button
                    key={t.id}
                    testId={`command-task-${t.id}`}
                    onClick={() => {
                      onClose()
                      onSelectConversation(t.id)
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      height: 36,
                      paddingLeft: 10,
                      paddingRight: 10,
                      borderRadius: 7,
                      cursor: 'pointer',
                      hover: { backgroundColor: '#2B2B2B' },
                    }}
                  >
                    <Icon name="compose" size={14} color={C.secondary} />
                    <text
                      style={{
                        fontSize: 13,
                        color: C.text,
                        flexGrow: 1,
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t.title}
                    </text>
                    <text style={{ fontSize: 11.5, color: C.ghost }}>{t.time}</text>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}

const MENU = {
  minWidth: 220,
  paddingTop: 4,
  paddingBottom: 4,
  paddingLeft: 4,
  paddingRight: 4,
  backgroundColor: C.raised,
  borderWidth: 1,
  borderColor: C.borderStrong,
  borderRadius: 12,
} satisfies StyleDesc

function menuItemStyle(state: { selected: boolean; highlighted: boolean }): StyleDesc {
  return {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: 7,
    backgroundColor: state.highlighted ? '#404040' : state.selected ? '#2C2C2C' : C.raised,
    hover: { backgroundColor: '#404040' },
    cursor: 'pointer',
  }
}

type MenuRowProps = Props & {
  label: string
  description?: string
  descriptionSize?: number
  icon?: IconName
  selected: boolean
  hint?: string
}

const MenuRow = React.forwardRef<PublicInstance, MenuRowProps>(function MenuRow(
  { label, description, descriptionSize = 12.5, icon, selected, hint, style, ...props },
  ref,
) {
  return (
    <div
      {...props}
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        paddingTop: description ? 6 : 5,
        paddingBottom: description ? 6 : 5,
        paddingLeft: 8,
        paddingRight: 8,
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={14} color={C.tertiary} />}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        <text
          style={{
            fontSize: 12.5,
            fontWeight: selected ? 600 : 500,
            color: C.text,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </text>
        {description && (
          <text style={{ fontSize: descriptionSize, lineHeight: descriptionSize + 1.5, color: C.tertiary, paddingTop: 2 }}>
            {description}
          </text>
        )}
      </div>
      {hint && <text style={{ fontSize: 11.5, color: C.ghost, flexShrink: 0 }}>{hint}</text>}
      {selected && <Icon name="check" size={11} color={C.tertiary} />}
    </div>
  )
})

function ChipSelect({
  value,
  onChange,
  items,
  icon,
  label,
  caret = true,
  accent,
  menuWidth,
  fixedMenuWidth = false,
  testId,
  disabled = false,
  children,
}: {
  value: string
  onChange: (next: string) => void
  items: { value: string; label: string }[]
  icon?: IconName
  label: string
  caret?: boolean
  accent?: boolean
  menuWidth?: number
  fixedMenuWidth?: boolean
  testId?: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Select disabled={disabled} items={items} value={value} onValueChange={onChange} style={{ flexShrink: 0 }}>
      <div style={{ position: 'relative', display: 'flex' }}>
        <SelectTrigger
          testId={testId}
          style={(state: any) => ({
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            height: 26,
            paddingLeft: 7,
            paddingRight: 7,
            borderRadius: 6,
            cursor: 'pointer',
            backgroundColor: state.open ? C.overlay : '#00000000',
            hover: { backgroundColor: C.overlay },
          })}
        >
          {icon && <Icon name={icon} size={12} color={accent ? C.accent : C.tertiary} />}
          <text
            style={{
              fontSize: 13,
              lineHeight: 16,
              color: accent ? C.accent : C.secondary,
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </text>
          {caret && <Icon name="chevronDown" size={10.5} color={C.ghost} />}
        </SelectTrigger>
        <SelectContent side="top" sideOffset={4} style={{ ...MENU, minWidth: menuWidth ?? 220, ...(fixedMenuWidth ? { width: menuWidth ?? 220 } : {}) }}>
          {children}
        </SelectContent>
      </div>
    </Select>
  )
}

export function ModelPicker({ value, onChange, models = MODELS }: { value: string; onChange: (next: string) => void; models?: typeof MODELS }) {
  return <CatalogPicker value={value} onChange={onChange} choices={models} />
}

function ReasoningPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const selected = REASONING.find((option) => option.id === value) ?? REASONING[0]
  return (
    <ChipSelect
      value={value}
      onChange={onChange}
      items={REASONING.map((option) => ({ value: option.id, label: option.label }))}
      label={selected.label}
      caret={false}
    >
      <SelectLabel
        style={{
          height: 22,
          paddingLeft: 8,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <text style={{ fontSize: 11.5, fontWeight: 500, color: C.ghost }}>Reasoning</text>
      </SelectLabel>
      {REASONING.map((option) => (
        <SelectItem
          asChild
          key={option.id}
          value={option.id}
          testId={`reasoning-${option.id}`}
          style={(state: any) => menuItemStyle(state)}
        >
          {(state: any) => (
            <MenuRow label={option.label} hint={option.hint} selected={state.selected} />
          )}
        </SelectItem>
      ))}
    </ChipSelect>
  )
}

export function AccessPicker({ value, onChange, disabled = false }: { value: string; onChange: (next: string) => void | Promise<void>; disabled?: boolean }) {
  const selected = ACCESS.find((option) => option.id === value) ?? ACCESS[0]
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const pending = useRef(false)
  const change = async (next: string) => {
    if (pending.current || disabled) return
    pending.current = true; setBusy(true); setError('')
    try { await onChange(next) } catch (error) { setError(error instanceof Error ? error.message : 'Could not save permission mode') }
    finally { pending.current = false; setBusy(false) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 288 }}>
    <ChipSelect
      testId="access-picker"
      disabled={disabled || busy}
      value={value}
      onChange={(next) => void change(next)}
      items={ACCESS.map((option) => ({ value: option.id, label: option.label }))}
      icon={selected.icon}
      label={busy ? 'Saving…' : selected.label}
      caret={false}
      menuWidth={312}
      fixedMenuWidth
    >
      {ACCESS.map((option) => (
        <SelectItem
          asChild
          key={option.id}
          value={option.id}
          testId={`access-${option.id}`}
          style={(state: any) => menuItemStyle(state)}
        >
          {(state: any) => (
            <MenuRow
              label={option.label}
              description={option.description}
              descriptionSize={11.5}
              icon={option.icon}
              selected={state.selected}
            />
          )}
        </SelectItem>
      ))}
    </ChipSelect>
    {error && <text testId="access-error" style={{ fontSize: 11, color: '#f87171' }}>{error}</text>}
    </div>
  )
}

function ProjectPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const selected = PROJECTS.find((option) => option.id === value) ?? PROJECTS[0]
  return (
    <ChipSelect
      value={value}
      onChange={onChange}
      items={PROJECTS.map((option) => ({ value: option.id, label: option.label }))}
      icon="folder"
      label={selected.label}
      caret={false}
    >
      {PROJECTS.map((option) => (
        <SelectItem
          asChild
          key={option.id}
          value={option.id}
          testId={`project-${option.id}`}
          style={(state: any) => menuItemStyle(state)}
        >
          {(state: any) => <MenuRow label={option.label} icon="folder" selected={state.selected} />}
        </SelectItem>
      ))}
    </ChipSelect>
  )
}

function WorkspacePicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const selected = WORKSPACES.find((option) => option.id === value) ?? WORKSPACES[0]
  return (
    <ChipSelect
      value={value}
      onChange={onChange}
      items={WORKSPACES.map((option) => ({ value: option.id, label: option.label }))}
      icon={selected.icon}
      label={selected.label}
      caret={false}
    >
      <SelectLabel
        style={{
          height: 22,
          paddingLeft: 8,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <text style={{ fontSize: 11.5, fontWeight: 500, color: C.ghost }}>Work in</text>
      </SelectLabel>
      {WORKSPACES.map((option) => (
        <SelectItem
          asChild
          key={option.id}
          value={option.id}
          testId={`workspace-${option.id}`}
          style={(state: any) => menuItemStyle(state)}
        >
          {(state: any) => (
            <MenuRow label={option.label} icon={option.icon} selected={state.selected} />
          )}
        </SelectItem>
      ))}
    </ChipSelect>
  )
}

function BranchPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const selected = BRANCHES.find((option) => option.id === value) ?? BRANCHES[0]
  return (
    <ChipSelect
      value={value}
      onChange={onChange}
      items={BRANCHES.map((option) => ({ value: option.id, label: option.label }))}
      icon="gitBranch"
      label={selected.label}
    >
      {BRANCHES.map((option) => (
        <SelectItem
          asChild
          key={option.id}
          value={option.id}
          testId={`branch-${option.id}`}
          style={(state: any) => menuItemStyle(state)}
        >
          {(state: any) => <MenuRow label={option.label} icon="gitBranch" selected={state.selected} />}
        </SelectItem>
      ))}
    </ChipSelect>
  )
}

function ModeToggle({
  value,
  onChange,
}: {
  value: 'build' | 'plan'
  onChange: (next: 'build' | 'plan') => void
}) {
  const plan = value === 'plan'
  return (
    <Button
      aria-label="Mode"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 26,
        paddingLeft: 7,
        paddingRight: 7,
        borderRadius: 6,
        cursor: 'pointer',
        hover: { backgroundColor: C.overlay },
      }}
      onClick={() => onChange(plan ? 'build' : 'plan')}
    >
      <Icon name={plan ? 'list' : 'wrench'} size={12} color={plan ? C.accent : C.tertiary} />
      <text style={{ fontSize: 13, lineHeight: 16, color: plan ? C.accent : C.secondary }}>
        {plan ? 'Plan' : 'Build'}
      </text>
    </Button>
  )
}

function Composer({
  engine,
  deliveryMode = 'queue',
  onDeliveryMode,
  value,
  onChange,
  onSend,
  sendBlocked = false,
  draftAvailable = false,
  model,
  models,
  onModelChange,
  reasoning,
  onReasoningChange,
  access,
  onAccessChange,
  mode,
  onModeChange,
  focusTick,
}: {
  engine?: EngineSnapshot
  deliveryMode?: DeliveryMode
  onDeliveryMode?: (mode: DeliveryMode) => void
  value: string
  onChange: (next: string) => void
  onSend: (text: string) => void
  sendBlocked?: boolean
  draftAvailable?: boolean
  model: string
  models?: typeof MODELS
  onModelChange: (next: string) => void
  reasoning: string
  onReasoningChange: (next: string) => void
  access: string
  onAccessChange: (next: string) => void | Promise<void>
  mode: 'build' | 'plan'
  onModeChange: (next: 'build' | 'plan') => void
  focusTick: number
}) {
  const composerRef = useRef<PublicInstance | null>(null)
  const { renderer } = useGpuix()
  useEffect(() => {
    const id = composerRef.current?.id
    if (id == null) return
    renderer?.focusElement?.(id)
  }, [focusTick, renderer])
  const ready = value.trim().length > 0 && !sendBlocked && (!engine || draftAvailable)
  const send = (text: string) => {
    const next = text.trim()
    if (!next || sendBlocked || (engine && !draftAvailable)) return
    onSend(text)
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
        paddingLeft: 20,
        paddingRight: 20,
        overflow: 'visible',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: CONTENT_MAX_WIDTH,
          overflow: 'visible',
          backgroundColor: C.composer,
          borderRadius: 13,
          borderWidth: 1,
          borderColor: C.border,
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
        {engine && !draftAvailable ? <text style={{ fontSize: 14, color: C.tertiary, paddingLeft: 10 }}>Connecting to this task…</text> : <textarea
          ref={composerRef}
          testId="composer"
          value={value}
          placeholder="Ask anything, @ to mention, / for workflows"
          minRows={1}
          maxRows={3}
          autoFocus
          theme={CHAT_THEME}
          style={{
            width: '100%',
            minWidth: 0,
            fontSize: 14,
            lineHeight: 20,
            color: C.text,
            backgroundColor: '#00000000',
            borderWidth: 0,
            paddingLeft: 10,
            paddingRight: 10,
          }}
          onChange={(event) => onChange(event.value ?? '')}
          onSubmit={(event) => send(event.value ?? value)}
        />}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginTop: 8,
            flexWrap: 'wrap',
            paddingLeft: 10,
            paddingRight: 10,
          }}
        >
          <ModelPicker value={model} onChange={onModelChange} models={models} />
          {!engine && <ReasoningPicker value={reasoning} onChange={onReasoningChange} />}
          <AccessPicker key={engine?.sessionID ?? 'demo'} value={access} onChange={onAccessChange} disabled={!!engine && engine.status !== 'ready'} />
          {!engine && <ModeToggle value={mode} onChange={onModeChange} />}
          {engine && <ComposerDelivery snapshot={engine} mode={deliveryMode} onMode={onDeliveryMode ?? (() => {})} />}
          <div style={{ flexGrow: 1 }} />
          <div
            testId="send"
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: ready ? 'pointer' : undefined,
              backgroundColor: ready ? C.inverse : C.overlayStrong,
              hover: ready ? { opacity: 0.9 } : undefined,
            }}
            onClick={() => send(value)}
          >
            <Icon name="send" size={16} color={ready ? C.onInverse : C.ghost} />
          </div>
        </div>
      </div>
    </div>
  )
}

function WorkspaceFooter({
  project,
  onProjectChange,
  workspace,
  onWorkspaceChange,
  branch,
  onBranchChange,
}: {
  project: string
  onProjectChange: (next: string) => void
  workspace: string
  onWorkspaceChange: (next: string) => void
  branch: string
  onBranchChange: (next: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 4,
        paddingBottom: 8,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          width: '100%',
          maxWidth: CONTENT_MAX_WIDTH,
          height: 28,
          paddingLeft: 10,
          paddingRight: 10,
        }}
      >
        <ProjectPicker value={project} onChange={onProjectChange} />
        <WorkspacePicker value={workspace} onChange={onWorkspaceChange} />
        {project !== 'none' && <BranchPicker value={branch} onChange={onBranchChange} />}
        <div style={{ flexGrow: 1 }} />
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            borderWidth: 1.5,
            borderColor: C.tertiary,
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  )
}

function GhostButton({
  icon,
  label,
  active,
  onClick,
  testId,
}: {
  icon: IconName
  label?: string
  active?: boolean
  onClick?: () => void
  testId?: string
}) {
  const color = active ? C.text : C.ghost
  return (
    <Button
      testId={testId}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 30,
        paddingLeft: label ? 9 : 0,
        paddingRight: label ? 11 : 0,
        width: label ? undefined : 30,
        justifyContent: 'center',
        borderRadius: 10,
        cursor: 'pointer',
        backgroundColor: active ? C.overlayStrong : '#00000000',
        hover: { backgroundColor: C.overlay },
      }}
      onClick={onClick}
    >
      <Icon name={icon} size={16} color={color} />
      {label && <text style={{ fontSize: 12.5, color }}>{label}</text>}
    </Button>
  )
}

function ActionBar({ onRetry }: { onRetry?: () => void }) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const [note, setNote] = useState<string | null>(null)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 4,
        paddingTop: 6,
        marginLeft: -7,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <GhostButton
          icon={copied ? 'check' : 'copy'}
          active={copied}
          onClick={() => {
            setCopied(true)
            setNote('Copied. Clipboard is a demo in this example.')
          }}
        />
        <GhostButton
          icon="thumbsUp"
          active={feedback === 'up'}
          onClick={() => {
            setFeedback((value) => (value === 'up' ? null : 'up'))
            setNote(null)
          }}
        />
        <GhostButton
          icon="thumbsDown"
          active={feedback === 'down'}
          onClick={() => {
            setFeedback((value) => (value === 'down' ? null : 'down'))
            setNote(null)
          }}
        />
        <GhostButton
          icon="retry"
          testId="retry"
          onClick={() => {
            onRetry?.()
            setNote('Ran the demo reply again.')
          }}
        />
        <GhostButton
          icon="share"
          onClick={() => setNote('Share is a demo. No link left this window.')}
        />
        <GhostButton
          icon="more"
          onClick={() => setNote('More actions are a demo.')}
        />
      </div>
      {note && <text style={{ fontSize: 12, color: C.tertiary, paddingLeft: 9 }}>{note}</text>}
    </div>
  )
}

type MdxChildren = { children?: React.ReactNode }

function flattenMdxTable(children: React.ReactNode): {
  cols: number
  cells: React.ReactElement[]
} {
  const rows: React.ReactElement[][] = []
  React.Children.forEach(children, (section) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(section)) return
    React.Children.forEach(section.props.children, (row) => {
      if (!React.isValidElement<{ children?: React.ReactNode }>(row)) return
      const cells: React.ReactElement[] = []
      React.Children.forEach(row.props.children, (cell) => {
        if (React.isValidElement(cell)) cells.push(cell)
      })
      if (cells.length > 0) rows.push(cells)
    })
  })
  const cols = rows.reduce((max, row) => Math.max(max, row.length), 0)
  const cells: React.ReactElement[] = []
  for (const [rowIndex, row] of rows.entries()) {
    for (let col = 0; col < cols; col++) {
      cells.push(
        col < row.length
          ? React.cloneElement(row[col]!, { key: `${rowIndex}-${col}` })
          : <div key={`pad-${rowIndex}-${col}`} />
      )
    }
  }
  return { cols, cells }
}

function MdxCell({ children, header }: MdxChildren & { header?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        padding: 8,
        minWidth: 96,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        backgroundColor: C.canvas,
        fontSize: 15,
        lineHeight: 26,
        fontWeight: header ? 700 : 400,
        color: C.text,
      }}
    >
      {children}
    </div>
  )
}

function MdxBlock({ children }: MdxChildren) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', minWidth: 0 }}>
      {children}
    </div>
  )
}

const MD_TEXT = {
  fontSize: 15,
  lineHeight: 26,
  color: C.text,
  maxWidth: '100%',
  minWidth: 0,
} as const

function MdxInline({ children, style }: MdxChildren & { style?: StyleDesc }) {
  return <text style={{ ...MD_TEXT, ...style }}>{children}</text>
}

function mdxStringChild(children: React.ReactNode) {
  const items = React.Children.toArray(children)
  if (items.length === 1 && (typeof items[0] === 'string' || typeof items[0] === 'number')) {
    return items[0]
  }
  return null
}

function MdxParagraph({ children }: MdxChildren) {
  const only = mdxStringChild(children)
  if (only != null) {
    return <text style={{ ...MD_TEXT, width: '100%' }}>{only}</text>
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'start',
        width: '100%',
        minWidth: 0,
        fontSize: 15,
        lineHeight: 26,
        color: C.text,
      }}
    >
      {React.Children.map(children, (child) =>
        typeof child === 'string' || typeof child === 'number' ? (
          <text style={MD_TEXT}>{child}</text>
        ) : (
          child
        ),
      )}
    </div>
  )
}

const SAFE_MDX_COMPONENTS = {
  h1: ({ children }: MdxChildren) => (
    <text style={{ fontSize: 22, lineHeight: 30, fontWeight: 700, color: C.text, maxWidth: '100%', minWidth: 0 }}>
      {children}
    </text>
  ),
  h2: ({ children }: MdxChildren) => (
    <text style={{ fontSize: 18, lineHeight: 26, fontWeight: 700, color: C.text, maxWidth: '100%', minWidth: 0 }}>
      {children}
    </text>
  ),
  h3: ({ children }: MdxChildren) => (
    <text style={{ fontSize: 16, lineHeight: 24, fontWeight: 700, color: C.text, maxWidth: '100%', minWidth: 0 }}>
      {children}
    </text>
  ),
  h4: MdxInline,
  h5: MdxInline,
  h6: MdxInline,
  p: MdxParagraph,
  blockquote: ({ children }: MdxChildren) => (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 12, width: '100%', minWidth: 0 }}>
      <div style={{ width: 3, flexShrink: 0, backgroundColor: C.accent }} />
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, gap: 6, color: C.secondary }}>
        {children}
      </div>
    </div>
  ),
  hr: () => <div style={{ height: 1, width: '100%', backgroundColor: C.border }} />,
  ul: MdxBlock,
  ol: MdxBlock,
  li: ({
    children,
    'data-checked': checked,
  }: MdxChildren & { 'data-checked'?: boolean }) => {
    const only = mdxStringChild(children)
    return (
      <div style={{ display: 'flex', flexDirection: 'row', gap: 9, width: '100%', minWidth: 0 }}>
        <text style={{ fontSize: 15, lineHeight: 26, color: C.secondary, flexShrink: 0 }}>
          {checked === undefined ? '•' : checked ? '✓' : '○'}
        </text>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
          {only != null ? <text style={{ ...MD_TEXT, width: '100%' }}>{only}</text> : children}
        </div>
      </div>
    )
  },
  strong: ({ children }: MdxChildren) => <MdxInline style={{ fontWeight: 700 }}>{children}</MdxInline>,
  em: ({ children }: MdxChildren) => <MdxInline style={{ color: C.secondary }}>{children}</MdxInline>,
  del: ({ children }: MdxChildren) => <MdxInline style={{ color: C.ghost }}>{children}</MdxInline>,
  code: ({ children }: MdxChildren) => (
    <MdxInline
      style={{
        fontFamily: FONT_MONO,
        fontSize: 13,
        backgroundColor: C.raised,
        borderRadius: 5,
        paddingLeft: 5,
        paddingRight: 5,
      }}
    >
      {children}
    </MdxInline>
  ),
  a: ({ children }: MdxChildren & { href?: string }) => (
    <MdxInline style={{ color: C.accent }}>{children}</MdxInline>
  ),
  table: ({ children }: MdxChildren) => {
    const { cols, cells } = flattenMdxTable(children)
    if (cols === 0) return null
    return (
      <div style={{ display: 'flex', width: '100%', minWidth: 0, overflowX: 'scroll' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: cols,
            gridColumnMin: 'max-content',
            flexShrink: 0,
            backgroundColor: C.border,
            rowGap: 1,
            columnGap: 1,
          }}
        >
          {cells}
        </div>
      </div>
    )
  },
  thead: MdxBlock,
  tbody: MdxBlock,
  tr: ({ children }: MdxChildren) => <>{children}</>,
  th: ({ children }: MdxChildren) => <MdxCell header>{children}</MdxCell>,
  td: ({ children }: MdxChildren) => <MdxCell>{children}</MdxCell>,
  Callout: ({ children, title }: MdxChildren & { title?: string }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: '100%',
        padding: 12,
        backgroundColor: C.raised,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <text style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{title}</text>
      {children}
    </div>
  ),
}

const mdxCache = new Map<string, Root>()

function parseMdx(source: string) {
  const cached = mdxCache.get(source)
  if (cached) return cached
  const tree = mdxParse(source)
  mdxCache.set(source, tree)
  return tree
}

export function SafeMdxContent({
  source,
  onLinkClick,
}: {
  source: string
  onLinkClick?: (href: string) => void
}) {
  const mdast = useMemo(() => parseMdx(source), [source])
  const components = useMemo(
    () =>
      onLinkClick
        ? {
            ...SAFE_MDX_COMPONENTS,
            a: ({ children, href }) => (
              <div
                style={{ display: 'flex', flexDirection: 'row', cursor: href ? 'pointer' : undefined }}
                onClick={() => href && onLinkClick(href)}
              >
                <MdxInline style={{ color: C.accent }}>{children}</MdxInline>
              </div>
            ),
          }
        : SAFE_MDX_COMPONENTS,
    [onLinkClick]
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', minWidth: 0 }}>
      <SafeMdxRenderer
        markdown={source}
        mdast={mdast}
        components={components}
        renderNode={(node) => {
          if (node.type !== 'code') return undefined
          return <CodeBlock code={node.value} language={node.lang ?? undefined} showLineNumbers />
        }}
      />
    </div>
  )
}

export function SafeMdxTranscript() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30, width: 748 }}>
      <UserTurn text="Can Markdown be composed as normal React elements instead?" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SafeMdxContent source={SAFE_MDX_STRESS} />
        <ActionBar />
      </div>
    </div>
  )
}

export function ChatApp({
  turnCount = TURNS.length,
  includeSafeMdx = false,
  engine: engineEnabled = false,
}: {
  turnCount?: number
  includeSafeMdx?: boolean
  /**
   * Attach the local engine daemon. Off by default so the integration tests and
   * a browser build stay hermetic; the desktop entry point turns it on.
   */
  engine?: boolean
} = {}) {
  const [initialProject] = useState(() => engineEnabled && typeof Bun !== 'undefined' ? readProjectSelection(process.cwd()) : null)
  const [shellInitial] = useState(() => engineEnabled && typeof Bun !== 'undefined' ? readWindowState(initialProject?.cwd ?? process.cwd()) : null)
  const [projectDialog, setProjectDialog] = useState(false)
  const [projectPreferencesRevision, setProjectPreferencesRevision] = useState(0)
  const [shellLink, setShellLink] = useState(() => engineEnabled && typeof Bun !== 'undefined' ? launchLink() : null)
  const [conversations, setConversations] = useState(() =>
    CONVERSATIONS.map((conversation) => ({
      ...conversation,
      turns: seedTurnsFor(conversation.id, turnCount),
    })),
  )
  const [activeId, setActiveId] = useState('task-new')
  const [nav, setNav] = useState({ stack: ['task-new'], index: 0 })
  const [collapsed, setCollapsed] = useState(shellInitial?.sidebarCollapsed ?? false)
  const [sidebarWidth, setSidebarWidth] = useState(shellInitial?.sidebarWidth ?? 260)
  // The surface picker is a 2×2 grid of 196px cards inside 24px padding, so
  // the panel needs 452px before it can show the picker without clipping.
  const [rightPanelWidth, setRightPanelWidth] = useState(shellInitial?.panelWidth ?? 480)
  const [resizing, setResizing] = useState<'left' | 'right' | null>(null)
  const resizeOrigin = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 0 })
  const [rightPanelOpen, setRightPanelOpen] = useState(!!shellLink?.file || (shellInitial?.panelOpen ?? false))
  const [activeSurface, setActiveSurface] = useState<SurfaceKind>(shellLink?.file ? 'files' : shellInitial?.surface ?? 'none')
  const [settingsInitialSection, setSettingsInitialSection] = useState('general')
  const [currentView, setCurrentView] = useState<'chat' | 'settings'>('chat')
  const [overlay, setOverlay] = useState<'search' | null>(null)
  const [commitModalOpen, setCommitModalOpen] = useState(false)
  const searchInputRef = useRef<PublicInstance | null>(null)
  const [query, setQuery] = useState('')
  const [projectOnly, setProjectOnly] = useState(false)
  const [draft, setDraft] = useState('')
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('queue')
  const [model, setModel] = useState('grok-4.6')
  const [reasoning, setReasoning] = useState('high')
  const [access, setAccess] = useState('ask')
  const [mode, setMode] = useState<'build' | 'plan'>('build')
  const [project, setProject] = useState('kale')
  const [workspace, setWorkspace] = useState('local')
  const [branch, setBranch] = useState('master')
  const [tailTick, setTailTick] = useState(0)
  const [focusTick, setFocusTick] = useState(0)

  const listRef = useRef<PublicInstance | null>(null)
  const nextTask = useRef(1)
  const { renderer } = useGpuix()
  const { ime } = useWindowInsets()
  const active = conversations.find((conversation) => conversation.id === activeId)
  const turns = active?.turns ?? []
  const showSafeMdx = includeSafeMdx && activeId === 'c1'
  const rowCount = turns.length + (showSafeMdx ? 1 : 0)
  const canGoBack = nav.index > 0
  const canGoForward = nav.index < nav.stack.length - 1
  const projectLabel = PROJECTS.find((item) => item.id === project)?.label ?? project
  const visibleConversations = projectOnly
    ? conversations.filter((conversation) => conversation.project === projectLabel)
    : conversations
  const searchHits = query.trim()
    ? conversations.filter((conversation) =>
        conversation.title.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : conversations

  const goTo = (id: string) => {
    setOverlay(null)
    if (engineEnabled) {
      if (id !== engineView.snapshot.sessionID) engineView.selectSession(id)
      setDraft('')
      setFocusTick((value) => value + 1)
      return
    }
    if (id === activeId) {
      setFocusTick((value) => value + 1)
      return
    }
    setActiveId(id)
    setNav((current) => ({
      stack: current.stack.slice(0, current.index + 1).concat(id),
      index: current.index + 1,
    }))
    setFocusTick((value) => value + 1)
  }

  const goBack = () => {
    if (nav.index === 0) return
    const index = nav.index - 1
    setActiveId(nav.stack[index]!)
    setNav({ ...nav, index })
    setFocusTick((value) => value + 1)
  }

  const goForward = () => {
    if (nav.index >= nav.stack.length - 1) return
    const index = nav.index + 1
    setActiveId(nav.stack[index]!)
    setNav({ ...nav, index })
    setFocusTick((value) => value + 1)
  }

  const handleDeleteConversation = useCallback(
    (id: string) => {
      setConversations((current) => current.filter((c) => c.id !== id))
      if (activeId === id) {
        const remaining = conversations.filter((c) => c.id !== id)
        if (remaining.length > 0 && remaining[0]) {
          goTo(remaining[0].id)
        }
      }
    },
    [activeId, conversations, goTo],
  )

  const retryLastReply = () => {
    let cut = -1
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i]?.kind === 'user') {
        cut = i
        break
      }
    }
    const lastUser = cut >= 0 ? turns[cut] : undefined
    if (!lastUser || lastUser.kind !== 'user') return
    const modelLabel = MODELS.find((item) => item.id === model)?.label ?? model
    const reply = demoReply({ text: lastUser.text, modelLabel, mode })
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeId
          ? { ...conversation, turns: [...conversation.turns.slice(0, cut + 1), ...reply] }
          : conversation,
      ),
    )
    setTailTick((value) => value + 1)
  }
  // `Transcript` is memo: a fresh closure per render would re-render every row
  // on each keystroke in the composer. The ref keeps the callback identity
  // stable while it always runs the latest closure.
  const retryRef = useRef(retryLastReply)
  retryRef.current = retryLastReply
  const onRetry = useCallback(() => retryRef.current(), [])

  useEffect(() => {
    if (tailTick === 0) return
    const id = listRef.current?.id
    if (id == null || !renderer?.scrollToItem) return
    renderer.scrollToItem(id, Math.max(0, rowCount - 1))
  }, [renderer, rowCount, tailTick])

  // The daemon is the only owner of a run. The cockpit attaches and draws.
  const engineView = useEngine({
    enabled: engineEnabled,
    initialSessionID: shellLink?.sessionID ?? initialProject?.sessionID ?? shellInitial?.sessionID,
    initialWorkspace: initialProject?.cwd,
    workspace: typeof process !== 'undefined' ? process.cwd() : '',
  })
  const activeEngineSession = engineView.snapshot.sessions.find((s) => s.id === engineView.snapshot.sessionID)
  const actualWorkspace = activeEngineSession?.cwd ?? initialProject?.cwd ?? (typeof process !== 'undefined' ? process.cwd() : '')
  const shownProject = activeEngineSession?.projectless ? '' : engineView.snapshot.projects.find((item) => item.cwd === actualWorkspace)?.name ?? actualWorkspace
  const previousSession = useRef<string | null>(null)
  const restoringProject = useRef(false)
  const previousWorkspace = useRef<string | null>(null)
  useEffect(() => {
    const id = engineView.snapshot.sessionID
    if (!engineEnabled || !id || typeof Bun === 'undefined') return
    if (previousSession.current !== id) {
      setDraft(''); setCommitModalOpen(false); setEngineModel(null)
      if (previousSession.current && shellLink?.sessionID !== id) setShellLink(null)
      previousSession.current = id
    }
    if (previousWorkspace.current !== actualWorkspace) {
      restoringProject.current = true
      const saved = readWindowState(actualWorkspace)
      setCollapsed(saved.sidebarCollapsed); setSidebarWidth(saved.sidebarWidth); setRightPanelWidth(saved.panelWidth)
      if (previousWorkspace.current) { setRightPanelOpen(saved.panelOpen); setActiveSurface(saved.surface) }
      if (shellLink?.sessionID === id && shellLink.file) { setRightPanelOpen(true); setActiveSurface('files') }
      previousWorkspace.current = actualWorkspace
      setProjectPreferencesRevision((value) => value + 1)
    }
    saveProjectSelection(process.cwd(), actualWorkspace, id)
  }, [engineEnabled, engineView.snapshot.sessionID, actualWorkspace])
  useEffect(() => {
    if (!engineEnabled || !renderer?.getWindowSize || typeof Bun === 'undefined') return
    const getWindowSize = () => renderer.getWindowSize!()
    const stop = trackWindow({ getWindowSize }, process.cwd())
    const beat = setInterval(() => {
      getWindowSize(); process.send?.({ type: 'hiroshi.window.alive' })
      const pending = nextNativeLink()
      if (pending) { try { const link = parseShellLink(pending); setShellLink(link); engineView.selectSession(link.sessionID); if (link.file) { setRightPanelOpen(true); setActiveSurface('files') } } catch (error) { console.error(String(error)) } }
    }, 750)
    beat.unref()
    process.send?.({ type: 'hiroshi.window.alive' })
    return () => { stop(); clearInterval(beat) }
  }, [engineEnabled, renderer])
  useEffect(() => {
    if (!engineEnabled || typeof Bun === 'undefined') return
    if (!engineView.snapshot.sessionID) return
    if (restoringProject.current) { restoringProject.current = false; return }
    try { saveWindowState(actualWorkspace, { sidebarCollapsed: collapsed, sidebarWidth, panelWidth: rightPanelWidth, panelOpen: rightPanelOpen, surface: activeSurface, sessionID: engineView.snapshot.sessionID }) } catch {}
  }, [engineEnabled, collapsed, sidebarWidth, rightPanelWidth, rightPanelOpen, activeSurface, engineView.snapshot.sessionID, projectPreferencesRevision])
  const reportedModels: typeof MODELS = engineView.snapshot.models.map((item) => ({
    id: item.id,
    label: `${item.label}${item.reason === 'provider_denied' ? ' · denied' : item.reason === 'credentials_missing' ? ' · needs credential' : item.reason === 'provider_disabled' ? ' · disabled' : item.reason === 'cli_unavailable' ? ' · unavailable' : ''}`,
    group: item.provider,
    icon: 'sparkle' as const,
  }))
  const [engineModel, setEngineModel] = useState<string | null>(null)
  useEffect(() => setEngineModel(null), [engineView.snapshot.sessionID])
  const chosenModel = engineEnabled ? engineModel ?? engineView.snapshot.defaultModel : model
  const shownTurns = useMemo(() => engineEnabled ? engineTranscript(engineView.snapshot) : turns, [engineEnabled, engineView.snapshot, turns])
  const greetingPicker = useMemo(() => engineEnabled && !activeEngineSession?.projectless
    ? <ProjectMenu engine={engineView} cwd={actualWorkspace} greeting triggerId="greeting-project" onNewProject={() => setProjectDialog(true)} /> : undefined,
  [engineEnabled, engineView.snapshot, actualWorkspace])
  const runView = cockpit(engineView.snapshot)
  const engineConversations: Conversation[] = engineView.snapshot.sessions.filter((s) => activeEngineSession?.projectless ? s.projectless : s.cwd === actualWorkspace && s.workspaceIdentity === activeEngineSession?.workspaceIdentity).map((s) => ({ id: s.id, title: s.title, group: 'Today', project: s.projectless ? 'No project' : s.cwd, time: s.running ? 'running' : '', turns: [] }))
  const latestEngineOutput = engineView.snapshot.steps.at(-1)?.output
  useEffect(() => {
    if (!engineEnabled || shownTurns.length === 0) return
    const id = listRef.current?.id
    if (id != null) renderer?.scrollToItem?.(id, shownTurns.length - 1)
  }, [engineEnabled, renderer, shownTurns.length, latestEngineOutput, engineView.snapshot.parts.length])


  if (currentView === 'settings') {
    return (
      <SettingsView
        onBack={() => setCurrentView('chat')}
        initialSection={settingsInitialSection}
        engine={engineEnabled ? engineView.snapshot : undefined}
        onRestartEngine={engineView.restart}
        providerEngine={engineEnabled ? { ...engineView, updateProviders: async (input) => {
          await engineView.updateProviders(input)
          if (input.defaultModel !== undefined) setEngineModel(null)
        } } : undefined}
      />
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        backgroundColor: C.canvas,
        fontFamily: FONT_SANS,
        color: C.text,
        position: 'relative',
      }}
    >
      <motion.div
        initial={false}
        animate={{ width: collapsed ? 0 : sidebarWidth }}
        transition={{ duration: resizing === 'left' ? 0 : 0.2, ease: 'easeOut' }}
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          flexShrink: 0,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Sidebar
          key={engineEnabled ? `${actualWorkspace}:${activeEngineSession?.workspaceIdentity ?? 'connecting'}` : 'demo'}
          width={sidebarWidth}
          conversations={engineEnabled ? engineConversations : visibleConversations}
          activeId={engineEnabled ? engineView.snapshot.sessionID ?? '' : activeId}
          onSelect={goTo}
          onDelete={engineEnabled ? undefined : handleDeleteConversation}
          onCollapse={() => setCollapsed(true)}
          onNewTask={() => {
            if (engineEnabled) { void engineView.newSession().catch(() => {}); setDraft(''); return }
            const id = `task-${nextTask.current++}`
            const created: Conversation = {
              id,
              title: 'New task',
              group: 'Today',
              project: projectLabel,
              time: 'now',
              turns: [],
            }
            setConversations((current) => [created, ...current])
            setDraft('')
            goTo(id)
          }}
          onSearch={() => {
            setQuery('')
            setOverlay('search')
          }}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onBack={goBack}
          onForward={goForward}
          onSettings={() => {
            setSettingsInitialSection('general')
            setCurrentView('settings')
          }}
          onFilter={() => setProjectOnly((value) => !value)}
          filterActive={projectOnly}
        />
        <ResizeHandle
          testId="resize-handle-left"
          side="left"
          isResizing={resizing === 'left'}
          onMouseDown={(e: any) => {
            if (e.button === 0) {
              resizeOrigin.current = { startX: e.x ?? 0, startWidth: sidebarWidth }
              setResizing('left')
            }
          }}
        />
      </motion.div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          minWidth: 0,
          height: '100%',
          paddingBottom: ime.bottom,
          backgroundColor: C.canvas,
        }}
      >
        <Header
          runStatus={engineEnabled ? `${runView.phase} · ${runView.pending} pending` : undefined}
          onUsage={engineEnabled ? () => { setSettingsInitialSection('usage'); setCurrentView('settings') } : undefined}
          collapsed={collapsed}
          onExpand={() => setCollapsed(false)}
          title={engineEnabled ? engineView.snapshot.sessions.find((s) => s.id === engineView.snapshot.sessionID)?.title ?? 'Workspace' : active?.title ?? 'New task'}
          turnCount={engineEnabled ? runView.turns : turns.length}
          canGoBack={engineEnabled ? false : canGoBack}
          canGoForward={engineEnabled ? false : canGoForward}
          onBack={goBack}
          onForward={goForward}
          onToggleRightPanel={() => setRightPanelOpen((value) => !value)}
          rightPanelOpen={rightPanelOpen}
          onOpenCommitModal={() => setCommitModalOpen(true)}
          onOpenReview={() => {
            setRightPanelOpen(true)
            setActiveSurface('review')
          }}
          activeId={engineEnabled ? engineView.snapshot.sessionID ?? '' : activeId}
        />
        <Transcript
          turns={shownTurns}
          testId={engineEnabled ? 'engine-transcript' : undefined}
          showActions={!engineEnabled}
          includeSafeMdx={engineEnabled ? false : showSafeMdx}
          listRef={listRef}
          onRetry={engineEnabled ? undefined : onRetry}
          project={engineEnabled ? shownProject : projectLabel}
          projectPicker={greetingPicker}
        />
        {engineEnabled && (
          <CheckpointHistory key={engineView.snapshot.sessionID} checkpoints={engineView.snapshot.checkpoints} rewinds={engineView.snapshot.rewinds}
            messages={engineView.snapshot.messages} activeMessageIDs={engineView.snapshot.activeMessageIDs}
            checkpointError={engineView.snapshot.checkpointError} onRestore={engineView.rewind} />
        )}
        {engineEnabled && (
          <ToolActivity key={`tools:${engineView.snapshot.sessionID}`} permissions={engineView.snapshot.permissions} calls={engineView.snapshot.toolCalls.filter((call) => !call.messageID || !engineView.snapshot.activeMessageIDs || engineView.snapshot.activeMessageIDs.includes(call.messageID))}
            reviews={engineView.snapshot.accessReviews} onAnswer={engineView.answerPermission} onOutput={engineView.toolOutput} />
        )}
        {engineEnabled && engineView.snapshot.error && (
          <text testId="engine-transcript-error" style={{ fontSize: 12, color: '#F87171', padding: 12 }}>{engineView.snapshot.error}</text>
        )}
        {engineEnabled && <DraftRecovery engine={engineView} />}
        {engineEnabled && <CliConversationStatus key={engineView.snapshot.cliConversation?.id ?? 'no-cli'} engine={engineView} model={chosenModel} />}
        <Composer
          engine={engineEnabled ? engineView.snapshot : undefined}
          deliveryMode={deliveryMode}
          onDeliveryMode={setDeliveryMode}
          value={engineEnabled ? engineView.draft.text : draft}
          onChange={engineEnabled ? engineView.editDraft : setDraft}
          sendBlocked={engineEnabled && (!!engineView.draft.pending || engineView.draft.busy || engineView.draft.unsaved || cliNeedsFresh(engineView.snapshot, chosenModel))}
          draftAvailable={!!engineView.draft.scope}
          focusTick={focusTick}
          onSend={(text) => {
            if (engineEnabled) {
              void engineView.prompt(text, deliveryMode, engineModel ?? undefined)
              setTailTick((value) => value + 1)
              return
            }
            const modelLabel = MODELS.find((item) => item.id === model)?.label ?? model
            const reply = demoReply({ text, modelLabel, mode })
            setConversations((current) =>
              current.map((conversation) =>
                conversation.id === activeId
                  ? {
                      ...conversation,
                      title:
                        conversation.turns.length === 0 ? titleFromDraft(text) : conversation.title,
                      turns: [...conversation.turns, { kind: 'user', text }, ...reply],
                    }
                  : conversation,
              ),
            )
            setDraft('')
            setTailTick((value) => value + 1)
          }}
          model={chosenModel}
          models={engineEnabled ? reportedModels : undefined}
          onModelChange={(next) => {
            if (!engineEnabled) { setModel(next); return }
            setEngineModel(next)
            void engineView.updateProviders({ defaultModel: next }).then(() => {
              // Without a workspace override, follow the shared provider default
              // again after saving so selections from another window stay live.
              if (!engineView.snapshot.configuration?.settings.defaultModel) setEngineModel((current) => current === next ? null : current)
            }).catch(() => {})
          }}
          reasoning={reasoning}
          onReasoningChange={setReasoning}
          access={engineEnabled ? engineView.snapshot.access.mode : access}
          onAccessChange={(next) => {
            if (!engineEnabled) { setAccess(next); return }
            const id = engineView.snapshot.sessionID
            if (!id) return Promise.reject(new Error('Connect the engine before changing permissions'))
            return engineView.updateAccess(id, next as import('./engine/src/protocol').AccessMode, engineView.snapshot.access.revision)
          }}
          mode={mode}
          onModeChange={setMode}
        />
        {engineEnabled ? <ProjectSwitcher engine={engineView} cwd={actualWorkspace} open={projectDialog} onOpen={() => setProjectDialog(true)} onClose={() => setProjectDialog(false)} /> : <WorkspaceFooter
          project={project}
          onProjectChange={setProject}
          workspace={workspace}
          onWorkspaceChange={setWorkspace}
          branch={branch}
          onBranchChange={setBranch}
        />}
      </div>
      <motion.div
        initial={false}
        animate={{ width: rightPanelOpen ? rightPanelWidth : 0 }}
        transition={{ duration: resizing === 'right' ? 0 : 0.2, ease: 'easeOut' }}
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          flexShrink: 0,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{ width: rightPanelWidth, height: '100%', flexShrink: 0, display: 'flex' }}>
          <SurfacePanel
            initialFile={shellLink?.file}
            initialLine={shellLink?.line}
            key={engineEnabled ? `${engineView.snapshot.sessionID}:${shellLink?.file ?? ''}:${shellLink?.line ?? ''}` : 'demo'}
            open={rightPanelOpen}
            activeSurface={activeSurface}
            onChangeSurface={setActiveSurface}
            onClose={() => setRightPanelOpen(false)}
            project={engineEnabled ? actualWorkspace : project}
            engine={engineView}
          />
        </div>
        <ResizeHandle
          testId="resize-handle-right"
          side="right"
          isResizing={resizing === 'right'}
          onMouseDown={(e: any) => {
            if (e.button === 0) {
              resizeOrigin.current = { startX: e.x ?? 0, startWidth: rightPanelWidth }
              setResizing('right')
            }
          }}
        />
      </motion.div>
      <WorkspaceCommitModal
        key={engineEnabled ? engineView.snapshot.sessionID : 'demo'}
        open={commitModalOpen}
        onClose={() => setCommitModalOpen(false)}
        engine={engineView}
        onTerminal={() => { setCommitModalOpen(false); setRightPanelOpen(true); setActiveSurface('terminal') }}
      />
      <CommandPaletteModal
        open={overlay === 'search'}
        onClose={() => setOverlay(null)}
        onNewTask={() => {
          if (engineEnabled) { void engineView.newSession().catch(() => {}); setOverlay(null); setDraft(''); return }
          const id = `task-${nextTask.current++}`
          const created: Conversation = {
            id,
            title: 'New task',
            group: 'Today',
            project: projectLabel,
            time: 'now',
            turns: [],
          }
          setConversations((current) => [created, ...current])
          setDraft('')
          goTo(id)
        }}
        onOpenProject={() => {
          if (engineEnabled) { setOverlay(null); setProjectDialog(true); void engineView.refreshProjects().catch(() => {}); return }
          setProject((curr) => (curr === 'gpuix' ? 'example-app' : 'gpuix'))
        }}
        onChooseModel={() => {
          setModel((curr) => (curr === 'deepseek-v4-flash' ? 'opus-4.6' : 'deepseek-v4-flash'))
        }}
        onFocusComposer={() => {
          setFocusTick((v) => v + 1)
        }}
        onCopyTaskId={() => {
          // copy active id
        }}
        onToggleUsage={() => {
          setSettingsInitialSection('usage')
          setCurrentView('settings')
        }}
        onCollapseSidebar={() => {
          setCollapsed((v) => !v)
        }}
        conversations={engineEnabled ? engineConversations : conversations}
        onSelectConversation={goTo}
      />
      {resizing !== null && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            cursor: 'col-resize',
            backgroundColor: '#00000001',
          }}
          onMouseMove={(e: any) => {
            const currentX = e.x ?? 0
            if (resizing === 'left') {
              const newWidth = Math.max(180, Math.min(460, currentX))
              setSidebarWidth(newWidth)
            } else if (resizing === 'right') {
              const delta = resizeOrigin.current.startX - currentX
              const newWidth = Math.max(460, Math.min(680, resizeOrigin.current.startWidth + delta))
              setRightPanelWidth(newWidth)
            }
          }}
          onMouseUp={() => setResizing(null)}
        />
      )}
    </div>
  )
}

export const MorselApp = ChatApp
export const HiroshiApp = ChatApp
export default MorselApp

const isEntryPoint =
  typeof Bun !== 'undefined'
    ? packagedBuild || process.env.HIROSHI_WINDOW_CHILD === '1' || Bun.main === import.meta.path
    : typeof process !== 'undefined' &&
      (process.argv[1]?.endsWith('chat.tsx') || process.argv[1]?.endsWith('app.tsx'))

if (isEntryPoint) {
  applyMacCpuThrottleFromEnv()
  const saved = readWindowState(process.cwd())
  render(<ChatApp turnCount={0} includeSafeMdx={false} engine />, {
    title: 'Morsel · GPUIX Code Editor',
    width: saved.width,
    height: saved.height,
    titlebarTransparent: true,
    windowBackground: 'blurred',
    trafficLightX: 16,
    trafficLightY: 17,
    debugFrameOverlay: 'hidden',
    // An agent launching this to check its own work must not take the keyboard
    // away from whoever is typing. Automation needs no focus.
    focus: process.env.GPUIX_BACKGROUND !== '1',
  })
}
