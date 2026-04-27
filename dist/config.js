const noopLogger = {
    info: () => { },
    warn: () => { },
    error: () => { },
    debug: () => { },
};
let config = {};
export function configureLogging(c) {
    config = { ...config, ...c };
}
export function getLoggingConfig() {
    return config;
}
export function resetLoggingConfig() {
    config = {};
}
export function getNoopLogger() {
    return noopLogger;
}
