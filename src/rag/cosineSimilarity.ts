export function cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, aVal, idx) => sum + aVal * b[idx], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, aVal) => sum + aVal * aVal, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bVal) => sum + bVal * bVal, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}
