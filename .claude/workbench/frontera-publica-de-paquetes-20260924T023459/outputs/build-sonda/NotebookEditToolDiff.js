// @bun
// src/packages/permission/src/components/NotebookEditPermissionRequest/NotebookEditToolDiff.tsx
import { relative } from "path";
import { Suspense, use, useMemo } from "react";
import { Box, NoSelect, Text } from "@anthropic/ink";
import { intersperse } from "@thyrox/tool-registry/utils/array.js";
import { getCwd } from "@thyrox/app-host/bootstrap/cwd.js";
import { getPatchForDisplay } from "@thyrox/agent/diff.js";
import { getFsImplementation } from "@thyrox/storage/fsOperations.js";
import { safeParseJSON } from "@thyrox/storage/json.js";
import { parseCellId } from "@thyrox/tool-registry/notebook.js";
import { HighlightedCode } from "@thyrox/repl/components/HighlightedCode.js";
import { StructuredDiff } from "@thyrox/repl/components/StructuredDiff.js";
import { jsxDEV } from "react/jsx-dev-runtime";
function NotebookEditToolDiff(props) {
  const notebookDataPromise = useMemo(() => getFsImplementation().readFile(props.notebook_path, { encoding: "utf-8" }).then((content) => safeParseJSON(content)).catch(() => null), [props.notebook_path]);
  return /* @__PURE__ */ jsxDEV(Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsxDEV(NotebookEditToolDiffInner, {
      ...props,
      promise: notebookDataPromise
    }, undefined, false, undefined, this)
  }, undefined, false, undefined, this);
}
function NotebookEditToolDiffInner({
  notebook_path,
  cell_id,
  new_source,
  cell_type,
  edit_mode = "replace",
  verbose,
  width,
  promise
}) {
  const notebookData = use(promise);
  const oldSource = useMemo(() => {
    if (!notebookData || !cell_id) {
      return "";
    }
    const cellIndex = parseCellId(cell_id);
    if (cellIndex !== undefined) {
      if (notebookData.cells[cellIndex]) {
        const source = notebookData.cells[cellIndex].source;
        return Array.isArray(source) ? source.join("") : source;
      }
      return "";
    }
    const cell = notebookData.cells.find((cell2) => cell2.id === cell_id);
    if (!cell) {
      return "";
    }
    return Array.isArray(cell.source) ? cell.source.join("") : cell.source;
  }, [notebookData, cell_id]);
  const hunks = useMemo(() => {
    if (!notebookData || edit_mode === "insert" || edit_mode === "delete") {
      return null;
    }
    return getPatchForDisplay({
      filePath: notebook_path,
      fileContents: oldSource,
      edits: [
        {
          old_string: oldSource,
          new_string: new_source,
          replace_all: false
        }
      ],
      ignoreWhitespace: false
    });
  }, [notebookData, notebook_path, oldSource, new_source, edit_mode]);
  let editTypeDescription;
  switch (edit_mode) {
    case "insert":
      editTypeDescription = "Insert new cell";
      break;
    case "delete":
      editTypeDescription = "Delete cell";
      break;
    default:
      editTypeDescription = "Replace cell contents";
  }
  return /* @__PURE__ */ jsxDEV(Box, {
    flexDirection: "column",
    children: /* @__PURE__ */ jsxDEV(Box, {
      borderStyle: "round",
      flexDirection: "column",
      paddingX: 1,
      children: [
        /* @__PURE__ */ jsxDEV(Box, {
          paddingBottom: 1,
          flexDirection: "column",
          children: [
            /* @__PURE__ */ jsxDEV(Text, {
              bold: true,
              children: verbose ? notebook_path : relative(getCwd(), notebook_path)
            }, undefined, false, undefined, this),
            /* @__PURE__ */ jsxDEV(Text, {
              dimColor: true,
              children: [
                editTypeDescription,
                " for cell ",
                cell_id,
                cell_type ? ` (${cell_type})` : ""
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this),
        edit_mode === "delete" ? /* @__PURE__ */ jsxDEV(Box, {
          flexDirection: "column",
          paddingLeft: 2,
          children: /* @__PURE__ */ jsxDEV(HighlightedCode, {
            code: oldSource,
            filePath: notebook_path
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this) : edit_mode === "insert" ? /* @__PURE__ */ jsxDEV(Box, {
          flexDirection: "column",
          paddingLeft: 2,
          children: /* @__PURE__ */ jsxDEV(HighlightedCode, {
            code: new_source,
            filePath: cell_type === "markdown" ? "file.md" : notebook_path
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this) : hunks ? intersperse(hunks.map((_) => /* @__PURE__ */ jsxDEV(StructuredDiff, {
          patch: _,
          dim: false,
          width,
          filePath: notebook_path,
          firstLine: new_source.split(`
`)[0] ?? null,
          fileContent: oldSource
        }, _.newStart, false, undefined, this)), (i) => /* @__PURE__ */ jsxDEV(NoSelect, {
          fromLeftEdge: true,
          children: /* @__PURE__ */ jsxDEV(Text, {
            dimColor: true,
            children: "..."
          }, undefined, false, undefined, this)
        }, `ellipsis-${i}`, false, undefined, this)) : /* @__PURE__ */ jsxDEV(HighlightedCode, {
          code: new_source,
          filePath: cell_type === "markdown" ? "file.md" : notebook_path
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
export {
  NotebookEditToolDiff
};
