export class JobAnalysisUnavailableError extends Error {
    constructor(message = 'AI analysis is currently unavailable') {
        super(message);
        this.name = 'JobAnalysisUnavailableError';
    }
}

export class JobAnalysisInvalidResponseError extends Error {
    constructor() {
        super('The AI service did not return a usable job analysis');
        this.name = 'JobAnalysisInvalidResponseError';
    }
}
