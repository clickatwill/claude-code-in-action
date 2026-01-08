# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup          # Install deps, generate Prisma client, run migrations
npm run dev            # Start dev server with Turbopack
npm run build          # Production build
npm run lint           # ESLint
npm test               # Run all tests with Vitest
npx vitest run <path>  # Run a single test file
npx prisma studio      # Database GUI
npm run db:reset       # Reset database
```

## Architecture

UIGen is an AI-powered React component generator with live preview. Users describe components in chat, and Claude generates code that renders in a sandboxed iframe.

### Core Data Flow

1. **Chat → AI → File System**: User messages go to `/api/chat`, which streams responses from Claude. The AI uses `str_replace_editor` and `file_manager` tools to manipulate a `VirtualFileSystem` instance.

2. **File System → Preview**: `FileSystemContext` exposes the virtual FS to React components. When files change, `PreviewFrame` transforms JSX via Babel (`jsx-transformer.ts`), creates blob URLs in an import map, and renders in a sandboxed iframe with React 19 from esm.sh.

3. **Persistence**: For authenticated users, messages and file system state are serialized to JSON and stored in the `Project` model (SQLite via Prisma). The database schema is defined in `prisma/schema.prisma` - reference it anytime you need to understand the structure of data stored in the database.

### Key Files

- `src/lib/file-system.ts` - `VirtualFileSystem` class with CRUD operations and tool command implementations
- `src/lib/transform/jsx-transformer.ts` - Babel transformation, import map generation, HTML template for preview
- `src/lib/contexts/file-system-context.tsx` - React context wrapping VirtualFileSystem, handles tool calls
- `src/lib/contexts/chat-context.tsx` - Wraps Vercel AI SDK's `useChat`, connects to file system
- `src/app/api/chat/route.ts` - Chat endpoint, builds tools, persists to database
- `src/lib/prompts/generation.tsx` - System prompt for Claude

### Virtual File System

The VFS operates at root `/`. All local imports use `@/` alias (e.g., `@/components/Button`). Every project needs `/App.jsx` as the entry point.

### AI Tools

- `str_replace_editor`: create, view, str_replace, insert commands for file manipulation
- `file_manager`: rename, delete commands

### Preview System

Preview uses browser-native ES modules with an import map. Third-party packages resolve to esm.sh. JSX/TSX files are transformed with Babel standalone. CSS files are inlined into a style tag.
