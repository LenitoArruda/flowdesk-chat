# FlowDesk Chat

A TypeScript project that explores AI-powered features for FlowDesk, a fictional customer and lead management platform. It covers conversational assistants, retrieval-augmented generation (RAG) over company policy documents, and the first steps of a sentiment-classification fine-tuning dataset, all powered by the OpenAI API.

## Features

- **Conversational assistants**
  - Three personas: customer support, business analyst, and product manager.
  - An interactive command-line chatbot with streamed responses.
  - Input and output validation (guardrails).
  - Context-window management with automatic history compression and summarization.
  - Draft generation, critique, and revision in the scripted persona demo.
  - Retry logic for OpenAI calls.
- **RAG over documents**
  - Document chunking with overlap and embeddings (`text-embedding-3-small`) stored in SQLite.
  - Hybrid retrieval that combines cosine similarity with keyword scoring.
  - Grounded answers (`gpt-4o-mini`) with a debug view of the retrieved chunks.
  - A safe answer flow that blocks out-of-scope questions and skips the model when nothing relevant is found.
- **Fine-tuning dataset**
  - A labelled set of customer reviews (positive, negative, neutral) exported to Parquet with DuckDB.
- **Persistence**
  - Chat messages are stored in SQLite, grouped by a session identifier.

## Requirements

- Node.js 22.13 or newer.
- An OpenAI API key.

The project uses Node.js's built-in TypeScript type stripping and SQLite support; no separate TypeScript build step or database server is required.

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file and add your API key:

```bash
npm run env:setup
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead.

Edit `.env.local` so it contains:

```dotenv
OPENAI_API_KEY=your_api_key_here
```

Keep your API key private. `.env.local` is excluded from Git.

## Usage

Each entry point has an npm script, and the ones that call OpenAI load `.env.local` automatically.

| Script | What it does |
| --- | --- |
| `npm run chatbot -- "<system prompt>" [session-id]` | Interactive streaming chatbot. Type `sair` to end the session. |
| `npm run demo:personas -- [session-id]` | Scripted persona conversation with critique and summarization. |
| `npm run rag:ingest` | Chunks, embeds, and stores the documents from `data/documents/`. |
| `npm run rag:query` | Retrieves the most relevant chunks and answers a question. |
| `npm run fine-tuning:dataset` | Builds `data/fine-tuning/reviews.parquet` from the labelled reviews. |

Example:

```bash
npm run chatbot -- "You are a helpful assistant." my-session
```

### RAG workflow

1. Add `.txt` documents to `data/documents/`.
2. Register them in `src/cli/ingest-documents.ts` and run `npm run rag:ingest`.
3. Change the `question` in `src/cli/rag-query.ts` and run `npm run rag:query`. It prints the retrieved chunks with their scores, then the answer.

## Project structure

```text
data/
  db/                  SQLite databases (messages.db, vectors.db)
  documents/           Source documents for RAG ingestion
  fine-tuning/         Generated fine-tuning datasets
src/
  cli/                 Entry points (chatbot, persona demo, RAG ingest/query, dataset builder)
  chat/                Context window, compression, streaming, summarization, personas, critique
  rag/                 Chunking, embeddings, scoring, prompt building, and answer generation
  guardrails/          Input and output validation
  repositories/        SQLite persistence (messages and vectors)
  clients/             External API clients (OpenAI)
  config/              Shared configuration (file paths)
  shared/              Shared types and helpers (retry)
```

## Data and current limitations

Messages are stored in `data/db/messages.db`, grouped by the session identifier, and document embeddings in `data/db/vectors.db`. Paths are resolved from the project root, so scripts work from any working directory. The databases are created automatically.

- Although the entry points load saved messages on startup, restoring them into the active context is not currently implemented. Reusing a session identifier groups new messages under the same identifier but does not restore prior conversation context.
- The RAG question and the list of ingested documents are set in the source files rather than passed as arguments.
- The fine-tuning step currently only prepares the dataset; it does not start a fine-tuning job.
- The personas and several prompts and terminal messages are written in Portuguese.
