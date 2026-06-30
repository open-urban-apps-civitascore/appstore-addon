import { fetchAndValidate } from "@/lib/server/repolist";
import { catalogSchema } from "@/types/catalog";

export default async function CatalogGitlabPrototypePage() {

    const data = await fetchAndValidate("index.json", catalogSchema);

    return (
        <div>
            <h1>Catalog GitLab Prototype</h1>
            {JSON.stringify(data)}
        </div>
    );
}