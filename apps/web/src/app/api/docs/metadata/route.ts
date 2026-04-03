import { NextResponse } from "next/server";
import { DASHBOARD_SECTIONS, getDocsCommandMeta } from "@/lib/dashboard-catalog";
import { DOC_TREE, flattenDocTree } from "@/lib/docs-tree";

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      sections: DASHBOARD_SECTIONS,
      commands: getDocsCommandMeta(),
      docsTree: DOC_TREE,
      flatDocs: flattenDocTree()
    }
  });
}
