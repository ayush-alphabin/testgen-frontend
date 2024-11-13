import { apiClient } from "../../../api/api";
import { API_ENDPOINTS } from "../../../api/apiConfig";

export async function runTests(files: any[], folders: any[], filePath: string) {
    return await apiClient.post(API_ENDPOINTS.RUN_TESTS, {
        folders: folders || [],
        files: files || [],
        folderPath: filePath,
    });
}

export async function runCloudTests(filePath: string, name: string, projectName: string | undefined, json: any, uniqueId: string) {

    return await apiClient.post(API_ENDPOINTS.RUN_CLOUD, {
        projectPath: filePath,
        folderName: name,
        projectName: projectName,
        jsonFileName: "run-info.json",
        jsonData: json,
        uuid: uniqueId,
    });
}

export async function cancelRunningTest() {
    return await apiClient.post(API_ENDPOINTS.STOP_TESTS, {});
}
