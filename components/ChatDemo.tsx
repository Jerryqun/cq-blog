'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// ─── 模拟模式的知识库（无 API Key 时使用）───
const KNOWLEDGE_BASE: { keywords: string[]; response: string }[] = [
  {
    keywords: ['vercel', 'ai sdk', '流式', 'streaming'],
    response: `Vercel AI SDK 的流式实现核心在于 \`streamText\` 函数和 \`toDataStreamResponse()\` 方法。

\`\`\`typescript
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

const result = streamText({
  model: openai('gpt-4o'),
  messages,
})

// 返回 SSE 流式响应
return result.toDataStreamResponse()
\`\`\`

前端通过 \`useChat\` Hook 自动接收流式数据，实现打字机效果。整个过程无需手动处理 SSE 解析，SDK 帮你搞定了一切。`,
  },
  {
    keywords: ['usechat', 'hook', '前端'],
    response: `\`useChat\` 是 Vercel AI SDK 提供的 React Hook，封装了聊天所需的所有状态管理：

\`\`\`tsx
const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
})
\`\`\`

它自动处理了：
- 消息列表状态管理
- 流式数据的接收和拼接
- 输入框的双向绑定
- 加载状态和错误处理

你只需要关注 UI 渲染即可。`,
  },
  {
    keywords: ['错误', '重试', 'error', 'retry'],
    response: `生产环境中 AI 接口不稳定是常态，建议采用指数退避重试策略：

\`\`\`typescript
async function callAI(messages, retryCount = 0) {
  try {
    return await streamText({ model, messages })
  } catch (error) {
    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000
      await new Promise(r => setTimeout(r, delay))
      return callAI(messages, retryCount + 1)
    }
    throw error
  }
}
\`\`\`

同时客户端要用 \`reload()\` 提供重试入口，并做好流中断的兜底处理。`,
  },
  {
    keywords: ['性能', '虚拟滚动', '长对话'],
    response: `长对话场景下，消息过多会导致 DOM 卡顿。推荐使用 \`@tanstack/react-virtual\` 做虚拟滚动：

\`\`\`tsx
const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 100,
})
\`\`\`

只渲染可视区域内的消息节点，即使有上千条消息也能保持流畅。`,
  },
  {
    keywords: ['上下文', 'token', '截断'],
    response: `默认情况下 useChat 会发送所有历史消息，长对话容易超出 Token 限制。

解决方案是服务端截断：保留 system 消息 + 最近 10 轮对话（约 20 条消息），丢弃更早的历史。

更进阶的做法是摘要压缩：用一次 LLM 调用把旧消息总结成一段摘要，再拼接到最新对话前面。这样既控制了 Token，又保留了关键上下文。`,
  },
]

const DEFAULT_RESPONSE = `这是一个 Vercel AI SDK 流式聊天 Demo。

我是模拟的 AI 助手，可以回答关于 Vercel AI SDK、useChat Hook、错误处理、性能优化等问题。

试试问我：
- "Vercel AI SDK 怎么实现流式？"
- "useChat 怎么用？"
- "怎么处理错误重试？"
- "长对话怎么优化性能？"

> 💡 当前为模拟模式。在上方输入 OpenAI API Key 后，将使用真实的 Vercel AI SDK \`streamText\` 调用 AI 模型。`

const SUGGESTIONS = [
  'Vercel AI SDK 怎么实现流式？',
  'useChat Hook 怎么用？',
  '错误重试怎么处理？',
  '长对话性能怎么优化？',
]

const SYSTEM_PROMPT =
  '你是一个专业的前端开发助手，熟悉 Vercel AI SDK、React、Next.js 等前端技术。回答要简洁准确，代码示例要完整可运行。使用中文回答。'

function findResponse(input: string): string {
  const lower = input.toLowerCase()
  for (const item of KNOWLEDGE_BASE) {
    if (item.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return item.response
    }
  }
  return DEFAULT_RESPONSE
}

// ─── Markdown 渲染 ───
function renderContent(text: string) {
  const parts = text.split(/(```[\s\S]*?```)/g)

  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const match = part.match(/```(\w+)?\n([\s\S]*?)```/)
      if (match) {
        const lang = match[1] || 'text'
        const code = match[2]
        return (
          <div
            key={i}
            className="my-3 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 dark:bg-gray-800">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{lang}</span>
            </div>
            <pre className="overflow-x-auto bg-gray-50 p-3 text-sm dark:bg-gray-900">
              <code className="text-gray-800 dark:text-gray-200">{code}</code>
            </pre>
          </div>
        )
      }
    }
    return (
      <span key={i}>
        {part.split('\n').map((line, j) => {
          if (line.trim().startsWith('> ')) {
            return (
              <blockquote
                key={j}
                className="border-primary-500 my-2 border-l-4 pl-3 text-sm text-gray-600 dark:text-gray-400"
              >
                {renderInline(line.replace(/^>\s/, ''))}
              </blockquote>
            )
          }
          if (line.trim().startsWith('- ')) {
            return (
              <div key={j} className="my-0.5 pl-2">
                <span className="text-primary-500">•</span> {renderInline(line.replace(/^-\s/, ''))}
              </div>
            )
          }
          return (
            <span key={j}>
              {renderInline(line)}
              {j < part.split('\n').length - 1 && <br />}
            </span>
          )
        })}
      </span>
    )
  })
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="text-primary-600 dark:text-primary-400 rounded bg-gray-100 px-1 py-0.5 text-sm dark:bg-gray-800"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={i}>{part}</span>
  })
}

// ─── 主组件 ───
export default function ChatDemo() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '你好！我是 AI 聊天 Demo 🤖\n\n我可以回答关于 **Vercel AI SDK** 的问题。试试下面的建议问题，或直接输入内容。\n\n> 💡 在下方设置区输入 OpenAI API Key，即可启用真实 AI 模式（使用 Vercel AI SDK streamText）。',
    },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [useRealAI, setUseRealAI] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<boolean>(false)

  // 从 localStorage 读取 API Key
  useEffect(() => {
    const savedKey = localStorage.getItem('openai-api-key')
    if (savedKey) {
      setApiKey(savedKey)
      setUseRealAI(true)
    }
  }, [])

  // 自动滚动
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // 清理
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearTimeout(streamTimerRef.current)
      abortRef.current = true
    }
  }, [])

  // 保存 API Key
  const handleSaveKey = useCallback(() => {
    if (apiKey.trim()) {
      localStorage.setItem('openai-api-key', apiKey.trim())
      setUseRealAI(true)
      setShowSettings(false)
      setError('')
    }
  }, [apiKey])

  // 清除 API Key
  const handleClearKey = useCallback(() => {
    localStorage.removeItem('openai-api-key')
    setApiKey('')
    setUseRealAI(false)
  }, [])

  // ─── 模拟流式输出 ───
  const simulateStream = useCallback((fullText: string, messageId: string) => {
    setIsStreaming(true)
    abortRef.current = false
    let index = 0
    const chars = fullText.split('')

    const streamNext = () => {
      if (abortRef.current) {
        setIsStreaming(false)
        return
      }
      if (index < chars.length) {
        const chunkSize = Math.min(Math.floor(Math.random() * 3) + 1, chars.length - index)
        const chunk = chars.slice(index, index + chunkSize).join('')
        index += chunkSize

        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, content: m.content + chunk } : m))
        )

        const delay = chunk.includes('\n') ? 20 : 15 + Math.random() * 25
        streamTimerRef.current = setTimeout(streamNext, delay)
      } else {
        setIsStreaming(false)
      }
    }

    streamNext()
  }, [])

  // ─── 真实 AI 流式输出（使用 Vercel AI SDK streamText）───
  const realStream = useCallback(
    async (userText: string, messageId: string, history: Message[]) => {
      setIsStreaming(true)
      abortRef.current = false
      setError('')

      try {
        // 使用 Vercel AI SDK 的 createOpenAI 创建 provider
        const openai = createOpenAI({
          apiKey: apiKey.trim(),
        })

        // 构建对话消息（保留上下文）
        const conversationMessages = [
          ...history.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user' as const, content: userText },
        ]

        // 调用 streamText —— Vercel AI SDK 的核心函数
        const result = streamText({
          model: openai('gpt-4o-mini'),
          system: SYSTEM_PROMPT,
          messages: conversationMessages,
          temperature: 0.7,
        })

        // 通过 textStream 异步迭代器逐块获取流式文本
        for await (const delta of result.textStream) {
          if (abortRef.current) break
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, content: m.content + delta } : m))
          )
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '未知错误'
        if (message.includes('401') || message.includes('API key')) {
          setError('API Key 无效，请检查后重新输入')
        } else if (message.includes('429')) {
          setError('请求过于频繁，请稍后再试')
        } else if (message.includes('fetch')) {
          setError('网络请求失败，请检查网络连接')
        } else {
          setError(`AI 请求失败: ${message}`)
        }
        // 移除空的 assistant 消息
        setMessages((prev) => prev.filter((m) => m.id !== messageId || m.content !== ''))
      } finally {
        setIsStreaming(false)
      }
    },
    [apiKey]
  )

  const handleSubmit = useCallback(
    (e?: React.FormEvent, presetInput?: string) => {
      e?.preventDefault()
      const text = presetInput ?? input
      if (!text.trim() || isStreaming) return

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
      }

      const assistantId = `assistant-${Date.now()}`
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
      }

      // 保存当前历史用于上下文（不包含 welcome 消息和当前用户消息）
      const history = messages.filter((m) => m.id !== 'welcome')

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInput('')

      if (useRealAI && apiKey.trim()) {
        // 真实模式：使用 Vercel AI SDK streamText
        realStream(text.trim(), assistantId, history)
      } else {
        // 模拟模式
        setTimeout(
          () => {
            const response = findResponse(text)
            simulateStream(response, assistantId)
          },
          400 + Math.random() * 600
        )
      }
    },
    [input, isStreaming, useRealAI, apiKey, realStream, simulateStream, messages]
  )

  return (
    <div className="not-prose my-8 overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-700">
      {/* 标题栏 */}
      <div className="from-primary-500 to-primary-600 flex items-center justify-between bg-gradient-to-r px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">AI 聊天 Demo</div>
            <div className="flex items-center gap-1 text-xs text-white/80">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${useRealAI ? 'bg-green-300' : 'bg-yellow-300'}`}
              />
              {useRealAI
                ? '真实模式 · gpt-4o-mini · Vercel AI SDK streamText'
                : '模拟模式 · 输入 API Key 启用真实 AI'}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="rounded-lg bg-white/20 px-2.5 py-1.5 text-xs text-white transition-colors hover:bg-white/30"
        >
          <svg
            className="inline-block h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
            OpenAI API Key（仅存储在浏览器 localStorage，不会发送到服务器）
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="focus:border-primary-400 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-gray-600 dark:bg-gray-900"
            />
            <button
              onClick={handleSaveKey}
              disabled={!apiKey.trim()}
              className="bg-primary-500 hover:bg-primary-600 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              保存
            </button>
            {useRealAI && (
              <button
                onClick={handleClearKey}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                清除
              </button>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-400">
            获取 API Key：
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-500 hover:underline"
            >
              platform.openai.com/api-keys
            </a>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* 消息区域 */}
      <div ref={scrollRef} className="h-[420px] overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-500 rounded-br-sm text-white'
                    : 'rounded-bl-sm bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-200'
                }`}
              >
                {msg.content === '' && isStreaming ? (
                  <div className="flex items-center gap-1 py-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                  </div>
                ) : msg.role === 'user' ? (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                ) : (
                  <div className="whitespace-pre-wrap">{renderContent(msg.content)}</div>
                )}
                {msg.role === 'assistant' && isStreaming && msg.content !== '' && (
                  <span className="bg-primary-500 ml-0.5 inline-block h-4 w-0.5 animate-pulse align-middle" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 建议问题 */}
      {messages.length <= 2 && !isStreaming && (
        <div className="flex flex-wrap gap-2 border-t border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSubmit(undefined, s)}
              className="hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600 dark:hover:border-primary-500 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* 输入区域 */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息，按 Enter 发送..."
          disabled={isStreaming}
          className="focus:border-primary-400 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 transition-colors outline-none placeholder:text-gray-400 focus:bg-white disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:focus:bg-gray-900"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="bg-primary-500 hover:bg-primary-600 flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isStreaming ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              生成中
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              发送
            </>
          )}
        </button>
      </form>
    </div>
  )
}
