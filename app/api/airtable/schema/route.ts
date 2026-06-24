import { airtableEnv, airtableFetch, jsonRoute, relay } from '@/lib/airtable/server';

// GET /api/airtable/schema → base tables + fields (metadata API)
export const GET = jsonRoute(async () => {
    const { baseId } = airtableEnv();
    const res = await airtableFetch(`/meta/bases/${baseId}/tables`);
    return relay(res);
});
