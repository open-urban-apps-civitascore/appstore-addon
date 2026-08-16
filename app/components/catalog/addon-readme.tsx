import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { AddonReadme } from "@/lib/server/addon-readme";
import { cn } from "@/lib/utils";

/**
 * Renders a repository README. Relative links and images in the markdown are
 * resolved against the repository, so they keep working outside the forge UI
 * (images against the raw host, links against the web UI). Anything that is
 * not an absolute http(s)/mailto/anchor URL is treated as repo-relative —
 * which also neutralises script URLs.
 */
export function AddonReadmeView({
  readme,
  className,
}: {
  readme: AddonReadme;
  className?: string;
}) {
  const resolve = (url: string, base: string) => {
    if (/^(https?:|mailto:|#)/i.test(url)) return url;
    return `${base}/${url.replace(/^\.?\//, "")}`;
  };

  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url, key) =>
          resolve(url, key === "src" ? readme.rawBase : readme.blobBase)
        }
        components={{
          // `node` is react-markdown metadata, not a DOM prop — keep it off the anchor.
          a: ({ node, ...props }) => {
            void node;
            return <a {...props} target="_blank" rel="noreferrer" />;
          },
        }}
      >
        {readme.markdown}
      </ReactMarkdown>
    </div>
  );
}
