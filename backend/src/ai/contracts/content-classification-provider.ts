/** Provider-independent contract for classifying HTML content. */
export interface ContentClassificationProvider {
    classifyContent(tree: string): Promise<unknown>;
}
