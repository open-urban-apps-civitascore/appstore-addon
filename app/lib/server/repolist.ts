import { Catalog } from "@/types/catalog";
import { UseCaseCatalog } from "@/types/use-cases";
import { ZodType } from "zod";

type Cached<T> = { data: T; fetchedAt: Date; stale: boolean; }

let cache: { catalog?: Cached<Catalog>; useCases?: Cached<UseCaseCatalog> } = {};

export async function fetchAndValidate<T>(file: string, schema: ZodType<T>): Promise<Cached<T>> {

    const base = process.env.REPO_LIST_BASE_URL;
    // const entry = cache[key]; 
    // if(entry && ageOf(entry) < TTL)
    // if (!base) {
    //     throw new Error("REPO_LIST_BASE_URL is not defined.");
    // }

    // return new Promise((resolve) => {
    //     const staleThreshold = 5 * 60 * 1000; // 5 Minuten
    // })

    const data = await fetch(`${base}${file}`);

    if (!data.ok) {
        // return { data: fallback, fetchedAt: new Date(), stale: true }
        throw new Error(`Failed to fetch ${file}: ${data.statusText}`);
    }

    const json = await data.json();
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
        // return { data: fallback, fetchedAt: new Date(), stale: true }
        throw new Error(`Failed to validate ${file}: ${parsed.error.message}`);
    }

    return { data: parsed.data, fetchedAt: new Date(), stale: false }
}