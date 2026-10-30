export function hybridScore(semantic: number, keyword: number, alpha = 0.7) {
    return alpha * semantic + (1 - alpha) * keyword;
}