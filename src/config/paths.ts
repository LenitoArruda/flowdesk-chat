import { resolve } from "node:path";

export const ROOT_DIR = resolve(import.meta.dirname, "../..");
export const DATA_DIR = resolve(ROOT_DIR, "data");

export const DB_DIR = resolve(DATA_DIR, "db");
export const DOCUMENTS_DIR = resolve(DATA_DIR, "documents");
export const FINE_TUNING_DIR = resolve(DATA_DIR, "fine-tuning");

export const MESSAGES_DB_PATH = resolve(DB_DIR, "messages.db");
export const VECTORS_DB_PATH = resolve(DB_DIR, "vectors.db");
