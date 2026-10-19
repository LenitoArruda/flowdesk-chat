# FlowDesk Chat

A TypeScript learning project that demonstrates AI-powered conversations for FlowDesk, a fictional project-management and productivity platform. It includes a scripted persona demo and an interactive command-line chatbot, both powered by the OpenAI API.

## Features

- Three assistant personas: customer support, business analyst, and product manager.
- OpenAI chat completions using the `gpt-4o-mini` model.
- SQLite storage for messages, grouped by a session identifier.
- An interactive chatbot with streamed responses, input checks, and response checks.
- Context-window utilities for limiting and preparing conversation history.
- Draft critique and revision in the scripted demo, plus conversation summarization.

## Requirements

- Node.js 22.13 or newer.
- An OpenAI API key.

The project uses Node.js's built-in TypeScript type stripping and SQLite support; no separate TypeScript build step or database server is required.

## Setup

Install dependencies:

```powershell
npm install
```

Create a local environment file and add your API key:

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local` so it contains:

```dotenv
OPENAI_API_KEY=your_api_key_here
```

Keep your API key private. `.env.local` is excluded from Git.

## Run

### Scripted persona demo

Run the scripted conversation with the support persona and print a summary of the conversation:

```powershell
node --experimental-strip-types --env-file=.env.local src/index.ts
```

An optional first argument sets the session identifier:

```powershell
node --experimental-strip-types --env-file=.env.local src/index.ts my-session
```

### Interactive chatbot

Start the command-line chatbot with a system prompt:

```powershell
node --experimental-strip-types --env-file=.env.local src/chatbot.ts "You are a helpful assistant."
```

The chatbot generates a session identifier if one is not provided. To provide one, pass it after the system prompt:

```powershell
node --experimental-strip-types --env-file=.env.local src/chatbot.ts "You are a helpful assistant." my-session
```

Enter a question at the prompt. Type `sair` to end the session.

## Project structure

```text
src/
  chatbot.ts                 Interactive streaming chatbot
  index.ts                   Scripted persona and summarization demo
  clients/openai.ts          OpenAI client configuration
  utils/
    contextWindows.ts        Conversation context management
    generateWithCritique.ts  Draft generation, critique, and revision
    messageRepository.ts     SQLite message persistence
    personas.ts              Assistant persona prompts
    streamResponse.ts        Streaming response generation
    sumamarizeHistory.ts     Conversation summarization
    validateInput.ts         User input validation
    validateOutput.ts        Response validation
```

Additional utilities support retries, token estimation, context compression, and response preparation.

## Data and current limitations

Messages are stored in `pos_ia-m3.db` in the current working directory, grouped by the session identifier. The database is created automatically.

Although the entry points load saved messages on startup, restoring them into the active context is not currently implemented. Reusing a session identifier groups new messages under the same identifier but does not restore prior conversation context.

The personas and several prompts and terminal messages are currently written in Portuguese.
