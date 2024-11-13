const BASE_URL = 'http://localhost:3001';

export const API_ENDPOINTS = {
    RENAME_FILE: `${BASE_URL}/file/rename`,
    CREATE_FILE: `${BASE_URL}/file/create`,
    DELETE_FILE: `${BASE_URL}/file/delete`,
    FETCH_FILE:  `${BASE_URL}/file/fetch`,
    FETCH_FILES: `${BASE_URL}/getStructure`,  // Add this line

    CREATE_PROJECT: `${BASE_URL}/create-project`,  // Add this line
    EDIT_PROJECT: (folderName: string) => `${BASE_URL}/edit-project/${folderName}`,  // Dynamic endpoint
    DELETE_PROJECT: (folderName: string) => `${BASE_URL}/delete-project/${folderName}`,  // Dynamic endpoint
    GET_PROJECTS: `${BASE_URL}/all-projects`,
    UPDATE_CONFIG: `${BASE_URL}/update-config`,
    GET_CONFIG:`${BASE_URL}/get-config`,

    RUN_TESTS: `${BASE_URL}/run-tests`,
    STOP_TESTS: `${BASE_URL}/stop-tests`,
    RUN_CLOUD: `${BASE_URL}/run-cloud`,
    TEST_RESULTS: `${BASE_URL}/get-test-result`,

    LOAD_LOCATORS:`${BASE_URL}/locators/load-locators`,
    GET_GLOBAL_JS: `${BASE_URL}/locators/get-global-js`,
    UPDATE_LOCATORS: `${BASE_URL}/locators/update-locators`,
    GET_IMAGE_PATH: `${BASE_URL}/locators/get-image-path`,
    DELETE_LOCATOR: `${BASE_URL}/locators/delete-locator`,

    LOAD_URL: `${BASE_URL}/load-url`,
};
