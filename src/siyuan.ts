
export const genClient = (base: string, token: string) => {
    const post = async (url: string, data: unknown) => {
        // send post
        const r = await fetch(base + url, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        return await r.json()
    }
    
    return {
        sql: async(x: {stmt: string}) => {
            return await post('/api/query/sql', x)
        },
        exportMdContent: async(x: {id: string}) => {
            return await post('/api/export/exportMdContent', x)
        },

        currentTime: async() => {
            return await post('/api/system/currentTime', {})
        },
        getBlockAttrs: async(x: {id: string}) => {
            return await post('/api/attr/getBlockAttrs', x)
        },
        setBlockAttrs: async(x: {id: string, attrs: Record<string, string>}) => {
            return await post('/api/attr/setBlockAttrs', x)
        }
    }
}