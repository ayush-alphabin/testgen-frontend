export const apiClient = {
    get: async (url: string, params?: Record<string, any>) => {
        try {
            const query = params ? `?${new URLSearchParams(params).toString()}` : '';
            const response = await fetch(`${url}${query}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('GET request failed:', error);
            throw error;
        }
    },

    post: async (url: string, body: any) => {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('POST request failed:', error);
            throw error;
        }
    },

    put: async (url: string, body: any) => {
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('PUT request failed:', error);
            throw error;
        }
    },

    delete: async (url: string, body?: any) => {
        try {
            const options: RequestInit = {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            if (body) {
                options.body = JSON.stringify(body);
            }
            const response = await fetch(url, options);
            return await handleResponse(response);
        } catch (error) {
            console.error('DELETE request failed:', error);
            throw error;
        }
    },
};

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Request failed');
    }
    return response.json();
};
