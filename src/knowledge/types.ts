export type KnowledgeDocument = {
    /** File name, used as the stable identifier of the document. */
    source: string;
    title: string;
    category: string;
    body: string;
};

export type KnowledgeChunk = {
    source: string;
    title: string;
    section: string;
    text: string;
};

export type RetrievedChunk = KnowledgeChunk & {
    score: number;
};

export type IngestReport = {
    documents: number;
    ingested: number;
    skipped: number;
    chunks: number;
};
