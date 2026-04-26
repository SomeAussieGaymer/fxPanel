export const DEV_MOCK_STATUS_STORAGE_KEY = 'fxpanel.devMockStatus';
export const DEV_MOCK_STATUS_QUERY_KEY = 'devMockStatus';

export const isDevMockStatusOptInEnabled = () => {
    if (typeof window === 'undefined') return false;

    const queryEnabled =
        new URLSearchParams(window.location.search).get(DEV_MOCK_STATUS_QUERY_KEY) === '1';
    const storageEnabled = window.localStorage.getItem(DEV_MOCK_STATUS_STORAGE_KEY) === '1';

    return queryEnabled || storageEnabled;
};
