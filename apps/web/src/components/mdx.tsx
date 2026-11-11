import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

import { DocsMermaid } from "@/components/docs/docs-mermaid";
import { DocsHub } from "@/components/docs/hub";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Step,
    Steps,
    Tab,
    Tabs,
    TypeTable,
    DocsHub,
    // fumadocs-mermaid's remark plugin emits <Mermaid /> for every ```mermaid fence.
    Mermaid: DocsMermaid,
    ...components,
  };
}
