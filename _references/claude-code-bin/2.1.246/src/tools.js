// ==========================================================================
// tools.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/tools.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 11  (0 cadena, 11 nombre)
//   descartadas por ruido (>400 aparic.) : 10
//   sitios de co-ocurrencia : 9  (se emiten los 6 de mayor cruce)
//   regiones emitidas  : 5
//
// COMO SE LOCALIZO. El minificador mangla los identificadores
// locales y preserva los literales de cadena y las claves de
// objeto. Un ancla frecuente no discrimina sola; se cruza con
// las demas del mismo archivo en una ventana de 4000 B.
//
// La puntuacion de un sitio NO es su numero de anclas: es la
// suma de log10(ventanas/apariciones)/grado de cada una. El
// grado es en cuantos archivos del arbol aparece el ancla: un
// nombre que citan doce fragmentos no es de ninguno. El umbral
// se DERIVA del bundle — aqui 3.85 = log10(7062).
// ==========================================================================

// --- bundle[16890025:16890546]  (521 B)
//     especificidad 23.427 · 7 anclas — 'NotebookEditTool'(×1 g1), 'GlobTool'(×2 g1), 'GrepTool'(×2 g1), 'FileEditTool'(×3 g1), 'FileWriteTool'(×3 g1) …
()=>{van();$4l();wr();Mr();rL();Vq();RGe();Dhh=require("child_process"),Phh=require("fs"),Mhh=require("fs/promises"),zfo=require("path"),O4l=require("readline");nkE={Read:"Reading",Write:"Writing",Edit:"Editing",MultiEdit:"Editing",Bash:"Running",Glob:"Searching",Grep:"Searching",WebFetch:"Fetching",WebSearch:"Searching",Task:"Running task",FileReadTool:"Reading",FileWriteTool:"Writing",FileEditTool:"Editing",GlobTool:"Searching",GrepTool:"Searching",BashTool:"Running",NotebookEditTool:"Editing notebook",LSP:"LSP"}}

// --- bundle[24201524:24210120]  (8596 B)
//     especificidad 10.480 · 4 anclas — 'WebFetchTool'(×11 g1), 'BashTool'(×13 g1), 'WebSearchTool'(×16 g1), 'AgentTool'(×36 g1)
dHy=`# Tool Use \u2014 Go

For conceptual overview (tool definitions, tool choice, tips), see [shared/tool-use-concepts.md](../../shared/tool-use-concepts.md).

## Tool Use

### Tool Runner (Beta \u2014 Recommended)

**Beta:** The Go SDK provides \`BetaToolRunner\` for automatic tool use loops via the \`toolrunner\` package.

\`\`\`go
import (
    "context"
    "fmt"
    "log"

    "github.com/anthropics/anthropic-sdk-go"
    "github.com/anthropics/anthropic-sdk-go/toolrunner"
)

// Define tool input with jsonschema tags for automatic schema generation
type GetWeatherInput struct {
    City string \`json:"city" jsonschema:"required,description=The city name"\`
}

// Create a tool with automatic schema generation from struct tags
weatherTool, err := toolrunner.NewBetaToolFromJSONSchema(
    "get_weather",
    "Get current weather for a city",
    func(ctx context.Context, input GetWeatherInput) (anthropic.BetaToolResultBlockParamContentUnion, error) {
        return anthropic.BetaToolResultBlockParamContentUnion{
            OfText: &anthropic.BetaTextBlockParam{
                Text: fmt.Sprintf("The weather in %s is sunny, 72\xB0F", input.City),
            },
        }, nil
    },
)
if err != nil {
    log.Fatal(err)
}

// Create a tool runner that handles the conversation loop automatically
runner := client.Beta.Messages.NewToolRunner(
    []anthropic.BetaTool{weatherTool},
    anthropic.BetaToolRunnerParams{
        BetaMessageNewParams: anthropic.BetaMessageNewParams{
            Model:     anthropic.ModelClaudeOpus4_8,
            MaxTokens: 16000,
            Messages: []anthropic.BetaMessageParam{
                anthropic.NewBetaUserMessage(anthropic.NewBetaTextBlock("What's the weather in Paris?")),
            },
        },
        MaxIterations: 5,
    },
)

// Run until Claude produces a final response
message, err := runner.RunToCompletion(context.Background())
if err != nil {
    log.Fatal(err)
}

// RunToCompletion returns *BetaMessage; content is []BetaContentBlockUnion.
// Narrow via AsAny() switch \u2014 note the Beta-namespace types (BetaTextBlock,
// not TextBlock):
for _, block := range message.Content {
    switch block := block.AsAny().(type) {
    case anthropic.BetaTextBlock:
        fmt.Println(block.Text)
    }
}
\`\`\`

**Key features of the Go tool runner:**

- Automatic schema generation from Go structs via \`jsonschema\` tags
- \`RunToCompletion()\` for simple one-shot usage
- \`All()\` iterator for processing each message in the conversation
- \`NextMessage()\` for step-by-step iteration
- Streaming variant via \`NewToolRunnerStreaming()\` with \`AllStreaming()\`

### Manual Loop

Prefer the tool runner above. For interception, validation, logging, or human-in-the-loop approval, gate inside the tool's run function or step the runner with \`NextMessage()\`/\`All()\` and inspect each message (the runner's public \`Params\` field lets you adjust the next request) \u2014 a manual loop is not required. Drop to a manual loop only when you need control the runner does not expose: define tools with \`ToolParam\`, check \`StopReason\`, execute tools yourself, and feed \`tool_result\` blocks back.

Derived from \`anthropic-sdk-go/examples/tools/main.go\`.

\`\`\`go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"

    "github.com/anthropics/anthropic-sdk-go"
)

func main() {
    client := anthropic.NewClient()

    // 1. Define tools. ToolParam.InputSchema uses a map, no struct tags needed.
    addTool := anthropic.ToolParam{
        Name:        "add",
        Description: anthropic.String("Add two integers"),
        InputSchema: anthropic.ToolInputSchemaParam{
            Properties: map[string]any{
                "a": map[string]any{"type": "integer"},
                "b": map[string]any{"type": "integer"},
            },
        },
    }
    // ToolParam must be wrapped in ToolUnionParam for the Tools slice
    tools := []anthropic.ToolUnionParam{{OfTool: &addTool}}

    messages := []anthropic.MessageParam{
        anthropic.NewUserMessage(anthropic.NewTextBlock("What is 2 + 3?")),
    }

    for {
        resp, err := client.Messages.New(context.Background(), anthropic.MessageNewParams{
            Model:     anthropic.ModelClaudeSonnet4_6,
            MaxTokens: 16000,
            Messages:  messages,
            Tools:     tools,
        })
        if err != nil {
            log.Fatal(err)
        }

        // 2. Append the assistant response to history BEFORE processing tool calls.
        //    resp.ToParam() converts Message \u2192 MessageParam in one call.
        messages = append(messages, resp.ToParam())

        // 3. Walk content blocks. ContentBlockUnion is a flattened struct;
        //    use block.AsAny().(type) to switch on the actual variant.
        toolResults := []anthropic.ContentBlockParamUnion{}
        for _, block := range resp.Content {
            switch variant := block.AsAny().(type) {
            case anthropic.TextBlock:
                fmt.Println(variant.Text)
            case anthropic.ToolUseBlock:
                // 4. Parse the tool input. Use variant.JSON.Input.Raw() to get the
                //    raw JSON \u2014 block.Input is json.RawMessage, not the parsed value.
                var in struct {
                    A int \`json:"a"\`
                    B int \`json:"b"\`
                }
                if err := json.Unmarshal([]byte(variant.JSON.Input.Raw()), &in); err != nil {
                    log.Fatal(err)
                }
                result := fmt.Sprintf("%d", in.A+in.B)
                // 5. NewToolResultBlock(toolUseID, content, isError) builds the
                //    ContentBlockParamUnion for you. block.ID is the tool_use_id.
                toolResults = append(toolResults,
                    anthropic.NewToolResultBlock(block.ID, result, false))
            }
        }

        // 6. Exit when Claude stops asking for tools
        if resp.StopReason != anthropic.StopReasonToolUse {
            break
        }

        // 7. Tool results go in a user message (variadic: all results in one turn)
        messages = append(messages, anthropic.NewUserMessage(toolResults...))
    }
}
\`\`\`

**Key API surface:**

| Symbol | Purpose |
|---|---|
| \`resp.ToParam()\` | Convert \`Message\` response \u2192 \`MessageParam\` for history |
| \`block.AsAny().(type)\` | Type-switch on \`ContentBlockUnion\` variants |
| \`variant.JSON.Input.Raw()\` | Raw JSON string of tool input (for \`json.Unmarshal\`) |
| \`anthropic.NewToolResultBlock(id, content, isError)\` | Build \`tool_result\` block |
| \`anthropic.NewUserMessage(blocks...)\` | Wrap tool results as a user turn |
| \`anthropic.StopReasonToolUse\` | \`StopReason\` constant to check loop termination |
| \`anthropic.ToolUnionParam{OfTool: &t}\` | Wrap \`ToolParam\` in the union for \`Tools:\` |

---

## Anthropic-Defined Tools

Version-suffixed struct names with \`Param\` suffix. \`Name\`/\`Type\` are \`constant.*\` types \u2014 zero value marshals correctly, so \`{}\` works. Wrap in \`ToolUnionParam\` with the matching \`Of*\` field. Web search and code execution are server-executed; bash and text editor are client-executed (you handle the \`tool_use\` locally \u2014 see \`shared/tool-use-concepts.md\`).

\`\`\`go
Tools: []anthropic.ToolUnionParam{
    {OfWebSearchTool20260209: &anthropic.WebSearchTool20260209Param{}},
    {OfBashTool20250124: &anthropic.ToolBash20250124Param{}},
    {OfTextEditor20250728: &anthropic.ToolTextEditor20250728Param{}},
    {OfCodeExecutionTool20260120: &anthropic.CodeExecutionTool20260120Param{}},
},
\`\`\`

Also available: \`WebFetchTool20260209Param\`, \`ToolSearchToolBm25_20251119Param\`, \`ToolSearchToolRegex20251119Param\`. For the advisor and memory tools, use \`BetaAdvisorTool20260301Param\` / \`BetaMemoryTool20250818Param\` in the beta namespace on \`client.Beta.Messages.New\`.

### Advisor tool (beta)

Server-side \u2014 no tool_result round-trip. The advisor model must be \u2265 the executor (top-level) model; invalid pairs return 400.

\`\`\`go
response, err := client.Beta.Messages.New(ctx, anthropic.BetaMessageNewParams{
    Model:     anthropic.ModelClaudeSonnet4_6,
    MaxTokens: 4096,
    Tools: []anthropic.BetaToolUnionParam{
        {OfAdvisorTool20260301: &anthropic.BetaAdvisorTool20260301Param{
            Model: anthropic.ModelClaudeOpus4_8,
        }},
    },
    Messages: []anthropic.BetaMessageParam{ /* ... */ },
    Betas:    []anthropic.AnthropicBeta{anthropic.AnthropicBetaAdvisorTool2026_03_01},
})
\`\`\`

---

`

// --- bundle[24784212:24815267]  (31055 B)
//     especificidad 10.480 · 4 anclas — 'WebFetchTool'(×11 g1), 'BashTool'(×13 g1), 'WebSearchTool'(×16 g1), 'AgentTool'(×36 g1)
//     REGION ANCHA (31055 B) — muy por encima de la mediana; puede envolver varios modulos.
U0y="# Managed Agents \u2014 Tools & Skills\n\n## Tools\n\n### Server tools vs client tools\n\n| Type | Who runs it | How it works |\n|---|---|---|\n| **Prebuilt Claude Agent tools** (`agent_toolset_20260401`) | Anthropic, on the session's container (for `cloud` envs; for `self_hosted`, **your** worker supplies and runs the file/bash tools \u2014 see `shared/managed-agents-self-hosted-sandboxes.md`). `web_search` / `web_fetch` always run on Anthropic's servers, in both environment types. | File ops, bash, web search, etc. Enable all at once or configure individually with `enabled: true/false`; restrict the web tools with `allowed_domains` / `blocked_domains`. |\n| **MCP tools** (`mcp_toolset`) | Anthropic's orchestration layer | Capabilities exposed by connected MCP servers. Grant access per-server via the toolset. |\n| **Custom tools** | **You** \u2014 your application handles the call and returns results | Agent emits a `agent.custom_tool_use` event, session goes `idle`, you send back a `user.custom_tool_result` event. |\n\n**Recommendation:** Enable all prebuilt tools via `agent_toolset_20260401`, then disable individually as needed.\n\n**Versioning:** The toolset is a versioned, static resource. When underlying tools change, a new toolset version is created (hence `_20260401`) so you always know exactly what you're getting.\n\n### Agent Toolset\n\nThe `agent_toolset_20260401` provides these built-in tools:\n\n| Tool                   | Description                              |\n| ---------------------- | ---------------------------------------- |\n| `bash` | Execute bash commands in a shell session |\n| `read` | Read a file from the local filesystem, including text, images, PDFs, and Jupyter notebooks |\n| `write` | Write a file to the local filesystem |\n| `edit` | Perform string replacement in a file |\n| `glob` | Fast file pattern matching using glob patterns |\n| `grep` | Text search using regex patterns |\n| `web_fetch` | Fetch content from a URL |\n| `web_search` | Search the web for information |\n\nEnable the full toolset:\n\n```json\n{\n  \"tools\": [\n    { \"type\": \"agent_toolset_20260401\" }\n  ]\n}\n```\n\n### Per-Tool Configuration\n\nOverride defaults for individual tools. This example enables everything except bash:\n\n```json\n{\n  \"tools\": [\n    {\n      \"type\": \"agent_toolset_20260401\",\n      \"default_config\": { \"enabled\": true },\n      \"configs\": [\n        { \"name\": \"bash\", \"enabled\": false }\n      ]\n    }\n  ]\n}\n```\n\n| Field | Required | Description |\n|---|---|---|\n| `type` | \u2705 | `\"agent_toolset_20260401\"` |\n| `default_config` | \u274C | Applied to all tools. `{ \"enabled\": bool, \"permission_policy\": {...} }` |\n| `configs` | \u274C | Per-tool overrides: `[{ \"name\": \"...\", \"type\": \"...\", \"enabled\": bool, \"permission_policy\": {...} }]`. `name` identifies the tool (values from the table above); `type` is optional in requests (same value as `name`; the server infers it) and always present in responses. `web_search` / `web_fetch` entries also accept web settings \u2014 see \xA7 Web search & web fetch settings below. |\n\n> **Typed SDKs:** each `configs` entry is a member of a union with one member per built-in tool (eight: `BetaManagedAgentsWebFetchToolConfigParams`, `...WebSearchToolConfigParams`, `...BashToolConfigParams`, \u2026), discriminated by `type`. Python/TypeScript/Ruby dicts and hashes with just `name` + `enabled` + `permission_policy` are unchanged. In Go, Java, C#, and PHP, `configs` is the union itself \u2014 build each entry from its per-tool type (Go: `BetaManagedAgentsAgentToolConfigUnionParamsUnion{OfWebFetch: &anthropic.BetaManagedAgentsWebFetchToolConfigParams{...}}` \u2014 the arms are `OfBash` / `OfRead` / `OfWrite` / `OfEdit` / `OfGlob` / `OfGrep` / `OfWebFetch` / `OfWebSearch`; Java: `.addConfig(BetaManagedAgentsWebFetchToolConfigParams.builder()...build())`; C#: `new BetaManagedAgentsWebFetchToolConfigParams { Enabled = false }`; PHP: `BetaManagedAgentsWebFetchToolConfigParams::with(enabled: false)`). Code written against an SDK where all tools shared one config type must update how it constructs entries.\n\n### Permission Policies\n\nControl when server-executed tools (agent toolset + MCP) run automatically vs wait for approval. Does not apply to custom tools.\n\n| Policy | Behavior |\n|---|---|\n| `always_allow` | Tool executes automatically (default) |\n| `always_ask` | Session emits `session.status_idle` and pauses until you send a `user.tool_confirmation` event |\n\n```json\n{\n  \"type\": \"agent_toolset_20260401\",\n  \"default_config\": {\n    \"enabled\": true,\n    \"permission_policy\": { \"type\": \"always_allow\" }\n  },\n  \"configs\": [\n    { \"name\": \"bash\", \"permission_policy\": { \"type\": \"always_ask\" } }\n  ]\n}\n```\n\n**Responding to `always_ask`:** Send a `user.tool_confirmation` event with `tool_use_id` from the triggering `agent_tool_use`/`mcp_tool_use` event:\n\n```json\n{ \"type\": \"user.tool_confirmation\", \"tool_use_id\": \"sevt_abc123\", \"result\": \"allow\" }\n{ \"type\": \"user.tool_confirmation\", \"tool_use_id\": \"sevt_def456\", \"result\": \"deny\", \"message\": \"Read .env.example instead\" }\n```\n\nThe optional `message` on a deny is delivered to the agent so it can adjust its approach.\n\nTo enable only specific tools, flip the default off and opt-in per tool:\n\n```json\n{\n  \"tools\": [\n    {\n      \"type\": \"agent_toolset_20260401\",\n      \"default_config\": { \"enabled\": false },\n      \"configs\": [\n        { \"name\": \"bash\", \"enabled\": true },\n        { \"name\": \"read\", \"enabled\": true }\n      ]\n    }\n  ]\n}\n```\n\n### Web search & web fetch settings (domain filters)\n\n`web_search` and `web_fetch` run on Anthropic's servers regardless of environment type, so an environment's `networking` policy **does not** govern them (see `shared/managed-agents-environments.md` \u2192 Networking). To control what they can reach, set `allowed_domains` (only these hosts) **or** `blocked_domains` (never these hosts) \u2014 never both on one entry \u2014 on the tool's `configs` entry. Each tool carries its own list. Organization-level web search/fetch settings in the Console apply to the Messages API only, not to Managed Agents sessions.\n\n```json\n{\n  \"type\": \"agent_toolset_20260401\",\n  \"configs\": [\n    {\n      \"type\": \"web_search\",\n      \"name\": \"web_search\",\n      \"allowed_domains\": [\"docs.example.com\", \"arxiv.org\"],\n      \"user_location\": { \"type\": \"approximate\", \"country\": \"US\", \"timezone\": \"America/Los_Angeles\" }\n    },\n    {\n      \"type\": \"web_fetch\",\n      \"name\": \"web_fetch\",\n      \"blocked_domains\": [\"ads.example.com\"],\n      \"max_content_tokens\": 50000\n    }\n  ]\n}\n```\n\n| Setting | Applies to | Description |\n|---|---|---|\n| `allowed_domains` | `web_search`, `web_fetch` | The only hosts the tool can reach. Mutually exclusive with `blocked_domains` on the same entry. |\n| `blocked_domains` | `web_search`, `web_fetch` | Hosts the tool cannot reach. |\n| `max_content_tokens` | `web_fetch` | Positive integer cap on fetched *text* content entering context (binary content such as PDFs is not capped). |\n| `user_location` | `web_search` | `{ \"type\": \"approximate\", city?, region?, country? (2-letter uppercase ISO 3166-1), timezone? (IANA) }` \u2014 at least one of the optional fields. |\n\n**Run-time behavior:** a `web_fetch` call outside its list returns an error result to the agent (`is_error: true` on `agent.tool_result`, content names `url_not_allowed`); `web_search` silently omits results outside its list. In the Console, the agent form has allow/block-list controls for the web tools; `user_location` and `max_content_tokens` are set in the agent's **Raw** view.\n\n**Domain list rules** (violations \u2192 400 `invalid_request_error` on agent create/update and on session create/update that supplies `tools`; messages name the list and zero-based index, e.g. `allowed_domains.0: IP addresses are not supported...`):\n\n- 1\u201364 domains per list, each 1\u2013255 chars. Empty list is rejected \u2014 omit the field or send `null` for \"no restriction\". Duplicates within a list are rejected.\n- Plain hostname only: `example.com`, not `https://example.com`, `example.com:443`, or `*.example.com`. Case-insensitive; a single trailing `/` is ignored.\n- A listed domain covers itself **and its subdomains** (`example.com` covers `docs.example.com`; `docs.example.com` does not cover `example.com` or `api.example.com`). `www.` is an ordinary subdomain \u2014 list the bare domain to cover both.\n- Rejected: IP addresses in any form; bare TLDs/registry suffixes (`com`, `co.uk`); single-label names (`intranet`); `localhost` and hosts ending in `.localhost`, `.local`, `.internal`, `.localdomain`, `.invalid`; non-ASCII (use `xn--` Punycode).\n- `web_fetch` domains cannot carry a path. `web_search` domains may carry a path suffix (`example.com/blog`, no spaces / `?` / `#` / `$ , | ^ !`), but the provider matches it as a URL pattern \u2014 prefer plain hostnames.\n- Provider-dependent rejections at the same time: a domain Anthropic's crawler may not access, an unsupported `user_location.country` (message ends `not a country the search provider supports`), an invalid IANA `timezone`.\n\nThe session re-checks the config when it first initializes the tool; if a previously accepted setting is no longer valid it emits `session.error` and goes `idle` without retrying. Fix via a session tools update (`shared/managed-agents-core.md` \u2192 Updating the agent configuration mid-session), update the agent too so new sessions get the fix, then send a new `user.message`.\n\n**Multiagent layering** (see `shared/managed-agents-multiagent.md`): every list on the path to a thread applies at once \u2014 a roster agent is bound by its own lists, by those of every agent that called it, and by the coordinator's *current* lists. Allow-lists intersect and block-lists union, so a roster agent can narrow but never widen. Disjoint allow-lists leave the tool available but every call fails `url_not_allowed` (the tool description tells the model) \u2014 keep roster allow-lists inside the coordinator's. `max_content_tokens` and `user_location` are **not** combined: own value \u2192 caller's \u2192 coordinator's. `{\"type\": \"self\"}` entries follow the coordinator. The outcome grader (`shared/managed-agents-outcomes.md`) runs without the web tools. Updating an idle session's tools changes the coordinator's lists for every thread from its next turn; a roster agent's own lists stay as defined at session create.\n\n**vs. the Messages API `web_search_20260209` / `web_fetch_20260209` tools:** same `allowed_domains` / `blocked_domains` vocabulary, but 64-entry cap, no path on `web_fetch` domains, and no `max_uses`, `citations`, or `cache_control`. If migrating from Messages API, these move from per-request to once-on-the-agent.\n\n### Custom Tools (Client-Side)\n\nCustom tools are executed by **your application**, not Anthropic. The flow:\n\n1. Agent decides to use the tool \u2192 session emits a `agent.custom_tool_use` event with inputs\n2. Session goes `idle` waiting for you\n3. Your application executes the tool\n4. You send back a `user.custom_tool_result` event with the output\n5. Session resumes `running`\n\nNo permission policy needed \u2014 you're the one executing.\n\n```json\n{\n  \"tools\": [\n    {\n      \"type\": \"custom\",\n      \"name\": \"get_weather\",\n      \"description\": \"Fetch current weather for a city.\",\n      \"input_schema\": {\n        \"type\": \"object\",\n        \"properties\": {\n          \"city\": { \"type\": \"string\", \"description\": \"City name\" }\n        },\n        \"required\": [\"city\"]\n      }\n    }\n  ]\n}\n```\n\n### MCP Servers\n\nMCP (Model Context Protocol) servers expose standardized third-party capabilities (e.g. Asana, GitHub, Linear). **Configuration is split across agent and vault:**\n\n1. **Agent creation** declares which servers to connect to (`type`, `name`, `url` \u2014 no auth). The agent's `mcp_servers` array has no auth field.\n2. **Vault** stores the OAuth credentials. Attach via `vault_ids` on session create.\n\nThis keeps secrets out of reusable agent definitions. Each vault credential is tied to one MCP server URL; Anthropic matches credentials to servers by URL.\n\n**Agent side \u2014 declare servers (no auth):**\n\n| Field | Required | Description |\n|---|---|---|\n| `type` | \u2705 | `\"url\"` |\n| `name` | \u2705 | Unique name \u2014 referenced by `mcp_toolset.mcp_server_name` |\n| `url` | \u2705 | The MCP server's endpoint URL (Streamable HTTP transport) |\n\n```json\n{\n  \"mcp_servers\": [\n    { \"type\": \"url\", \"name\": \"linear\", \"url\": \"https://mcp.linear.app/mcp\" }\n  ],\n  \"tools\": [\n    { \"type\": \"mcp_toolset\", \"mcp_server_name\": \"linear\" }\n  ]\n}\n```\n\n**Session side \u2014 attach vault:**\n\n```json\n{\n  \"agent\": \"agent_abc123\",\n  \"environment_id\": \"env_abc123\",\n  \"vault_ids\": [\"vlt_abc123\"]\n}\n```\n\n> \uD83D\uDCA1 **Per-tool enablement:** `mcp_toolset` accepts `default_config: {enabled: false}` + `configs: [{name, enabled: true}]` for an allowlist pattern. MCP `configs` entries take **only** `name` (the bare tool name as the server reports it), `enabled`, and `permission_policy` \u2014 no `type` field and none of the web settings that `web_search` / `web_fetch` accept in the agent toolset.\n\n> \uD83D\uDCA1 **Changing tools/MCP servers on a running session:** `sessions.update()` can replace `agent.tools` and `agent.mcp_servers` while the session is `idle` \u2014 a session-local override that doesn't touch the agent object. `vault_ids` is create-only. See `shared/managed-agents-core.md` \u2192 Updating the agent configuration mid-session.\n\n**Large tool outputs.** If a tool returns more than **100,000 characters (roughly 25,000 tokens)**, the output is automatically offloaded to a file in the sandbox \u2014 the agent receives a truncated preview plus the file path and can `read` the full content. No configuration required. The threshold is in *characters*, not tokens, and applies to built-in agent tools as well as MCP tools.\n\n**Invalid vault credentials don't block session creation.** If a vault credential is invalid for a declared MCP server, the session still creates successfully; a `session.error` event describes the MCP auth failure, and auth retries on the next `session.status_idle` \u2192 `session.status_running` transition.\n\n> \u26A0\uFE0F **MCP auth tokens \u2260 REST API tokens.** Hosted MCP servers (`mcp.notion.com`, `mcp.linear.app`, etc.) typically require **OAuth bearer tokens**, not the service's native API keys. A Notion `ntn_` integration token authenticates against Notion's REST API but will **not** work as a vault credential for the Notion MCP server. These are different auth systems.\n\n### Vaults \u2014 the credential store\n\n**Vaults** store credentials that Anthropic manages on your behalf. Two credential categories:\n\n- **MCP credentials** (`mcp_oauth`, `static_bearer`) \u2014 keyed by `mcp_server_url`. When the agent connects to a server at that URL, the token is injected automatically. **Matching is normalized, not byte-exact:** scheme and host are lowercased, and default ports and trailing slashes are stripped, so host casing, an explicit default port, or a trailing slash won't break the match. A different path, subdomain, or *non-default* port will. If nothing matches, the connection is attempted unauthenticated. `mcp_oauth` tokens are auto-refreshed via the standard OAuth 2.0 `refresh_token` grant. This is the only way to authenticate MCP servers.\n- **Environment variables** (`environment_variable`) \u2014 keyed by `secret_name` (the env var name). The sandbox sees only an **opaque placeholder**; the real secret is substituted into the outbound request **at egress**. Use this for any service that authenticates through an environment variable: CLIs (`aws`, `gcloud`, `stripe`), SDKs, or direct `curl` calls from the `bash` tool.\n\nSecret fields you supply (`token`, `access_token`, `refresh_token`, `client_secret`, `secret_value`) are write-only \u2014 never returned in API responses.\n\n#### Credentials and the sandbox\n\nVaults store credentials; those credentials **never enter the sandbox**. This is a deliberate security boundary \u2014 code running in the sandbox (including anything the agent writes) cannot read or exfiltrate a vaulted credential, even under prompt injection. Instead, credentials are injected by Anthropic-side proxies **after** a request leaves the sandbox:\n\n- **MCP tool calls** are routed through an Anthropic-side proxy that fetches the credential from the vault and adds it to the outbound request.\n- **Git operations on attached GitHub repositories** (`git pull`, `git push`, GitHub REST calls) are routed through a git proxy that injects the `github_repository` resource's `authorization_token` the same way.\n- **Environment-variable credentials** appear in the sandbox as an opaque placeholder; the real value replaces the placeholder at egress, on requests to the credential's allowed hosts only. Substitution covers request **headers and body only** \u2014 a secret embedded in the **URL path** is never substituted, so path-secret endpoints (e.g. Slack incoming-webhook URLs) can't be vaulted; use header-based auth instead (for Slack: a bot token in `Authorization` via `chat.postMessage`).\n\n**When vault credentials don't fit** (e.g. self-hosted sandboxes \u2014 `environment_variable` is not yet supported there), **register a custom tool:** the agent emits `agent.custom_tool_use`, your orchestrator (which already holds the credential) executes the call and returns `user.custom_tool_result` over the same authenticated event stream. No public endpoint is exposed; the sandbox never sees the secret. See `shared/managed-agents-client-patterns.md` \u2192 Pattern 9.\n\n**Do not put API keys in the system prompt or user messages as a workaround** \u2014 they persist in the session's event history.\n\n> Formerly known internally as TATs (Tool/Tenant Access Tokens).\n\n**Flow:**\n\n1. Create a vault (`client.beta.vaults.create(...)`) \u2014 one per tenant/user, or one shared, depending on your model\n2. Add credentials to it (`client.beta.vaults.credentials.create(...)`) \u2014 MCP credentials are keyed by MCP server URL; environment-variable credentials by `secret_name`\n3. Reference the vault on session create via `vault_ids: [\"vlt_...\"]`\n4. Anthropic auto-refreshes OAuth tokens before they expire and substitutes secrets at runtime\n\n**MCP OAuth credential shape**:\n\n```json\n{\n  \"display_name\": \"Notion (workspace-foo)\",\n  \"auth\": {\n    \"type\": \"mcp_oauth\",\n    \"mcp_server_url\": \"https://mcp.notion.com/mcp\",\n    \"access_token\": \"<current access token>\",\n    \"expires_at\": \"2026-04-02T14:00:00Z\",\n    \"refresh\": {\n      \"refresh_token\": \"<refresh token>\",\n      \"client_id\": \"<your OAuth client_id>\",\n      \"token_endpoint\": \"https://api.notion.com/v1/oauth/token\",\n      \"token_endpoint_auth\": { \"type\": \"none\" }\n    }\n  }\n}\n```\n\nThe `refresh` block is what enables auto-refresh \u2014 `token_endpoint` is where Anthropic posts the `refresh_token` grant. `token_endpoint_auth` is a discriminated union:\n\n| `type` | Shape | Use when |\n|---|---|---|\n| `\"none\"` | `{type: \"none\"}` | Public OAuth client (no secret) |\n| `\"client_secret_basic\"` | `{type: \"client_secret_basic\", client_secret: \"...\"}` | Confidential client, secret via HTTP Basic auth |\n| `\"client_secret_post\"` | `{type: \"client_secret_post\", client_secret: \"...\"}` | Confidential client, secret in request body |\n\nOmit `refresh` entirely if you only have an access token with no refresh capability \u2014 it'll work until it expires, then the agent loses access.\n\n> \uD83D\uDCA1 **Getting an OAuth token.** How you obtain the initial access and refresh tokens depends on the MCP server \u2014 consult its documentation. Once you have them, store them in a vault credential using the shape above; Anthropic auto-refreshes via the `refresh.token_endpoint` from there.\n\n**Environment-variable credential shape**:\n\n```json\n{\n  \"display_name\": \"Twilio API key for sandbox\",\n  \"auth\": {\n    \"type\": \"environment_variable\",\n    \"secret_name\": \"TWILIO_API_KEY\",\n    \"secret_value\": \"sk-your-secret-here\",\n    \"networking\": {\n      \"type\": \"limited\",\n      \"allowed_hosts\": [\"api.twilio.com\", \"*.twilio.com\"]\n    }\n  }\n}\n```\n\n`networking.allowed_hosts` controls which outbound hosts the secret can be substituted for \u2014 `{\"type\": \"limited\", \"allowed_hosts\": [...]}` or `{\"type\": \"unrestricted\"}` if you can't enumerate the domains in advance. Limiting is strongly recommended: it prevents the key from ever being sent to unauthorized hosts.\n\n**`injection_location`** (optional, sibling of `networking`) controls **where** in the outbound request the secret is substituted \u2014 `{header: bool, body: bool}`. The two are independent: `allowed_hosts` scopes *which hosts* a substituted request can target; `injection_location` scopes *which parts of the request* the secret is substituted into across all of those hosts. Most services read an API key from a request header, so `{\"header\": true}` is the narrower configuration \u2014 request bodies are often assembled from content the agent is working with, making the body the broader exposure surface. A placeholder in a disabled location is **neither substituted nor stripped** \u2014 the literal opaque placeholder string is sent to the third party in that location.\n\n| Operation | `injection_location` semantics |\n|---|---|\n| Create credential | Omit the field entirely \u2192 both locations enabled. Provide the object \u2192 any field you omit defaults to `false` (`{\"header\": true}` creates a header-only credential). |\n| Update credential | Fields **merge individually** \u2014 `{\"body\": false}` disables body substitution and leaves `header` unchanged. For a running session, the update takes effect on the session's next operation. |\n\nA credential must have at least one location enabled; a create or update that would disable both returns 400, as does explicit `null` for the object or either field (omit instead). The response always returns both fields with their resolved values.\n\n> \u26A0\uFE0F **Credentials created in the Console are header-only by default** \u2014 unlike the API, where omitting the field enables both. If your client sends the secret in the request body (a form-encoded token request, for example), the placeholder passes through literally and the service rejects it with its own authentication error. Tick body injection in the Console form, or `POST` the credential with `{\"injection_location\": {\"body\": true}}`.\n\n> \u26A0\uFE0F **Two networking layers, both required.** `networking.allowed_hosts` on the credential controls which requests *use the secret*, not which requests are *allowed*. The agent must also be able to reach the domain at the **environment level** (`unrestricted`, or the host listed in the environment's `allowed_hosts` \u2014 see `shared/managed-agents-environments.md`). A domain missing from either layer means the secret-substituted request fails.\n\n> \u26A0\uFE0F **Client-side validation caveat.** Substitution happens at egress, not inside the sandbox \u2014 clients that validate the credential *format* locally before making a network request (e.g. a CLI that checks the key starts with `sk-`) will see the opaque placeholder and may fail at startup. If a client rejects the credential before any network call, that's why.\n\n> \uD83D\uDCA1 **Scope the key minimally.** The agent can do anything the key allows; a key with broader permissions than the task needs increases the blast radius if the agent behaves unexpectedly.\n\n**Not supported with self-hosted sandboxes** \u2014 `environment_variable` credentials require Anthropic-managed egress. See `shared/managed-agents-self-hosted-sandboxes.md`.\n\n**Constraints (all credential types):**\n\n- **Unique key per vault.** `mcp_server_url` (MCP credentials) and `secret_name` (environment-variable credentials) must be unique among active credentials in a vault; duplicates return a 409.\n- **Keys are immutable.** Secret values, `display_name`, and (on environment-variable credentials) `injection_location` can be updated; to change `mcp_server_url`, `secret_name`, `token_endpoint`, or `client_id`, archive the credential and create a new one. Archiving purges the secret and frees the key for a replacement.\n- **Maximum 20 credentials per vault.**\n- Credentials are stored as provided and **not validated until session runtime** \u2014 an invalid credential surfaces as an authentication or downstream error during the session, which is emitted but does not block the session from continuing.\n\n**Scoping:** Vaults are workspace-scoped. Anyone with developer+ role in the API workspace can create, read (metadata only \u2014 secrets are write-only), and attach vaults. `vault_ids` can be set at session **create** time but not via session update (the SDK docstring says \"Not yet supported; requests setting this field are rejected\").\n\n---\n\n## Skills\n\nSkills are reusable, filesystem-based resources that provide your agent with domain-specific expertise: workflows, context, and best practices that transform general-purpose agents into specialists. Unlike prompts (conversation-level instructions for one-off tasks), skills load on-demand and eliminate the need to repeatedly provide the same guidance across multiple conversations.\n\nSkills reach the agent two ways: **attached** through the agent's `skills` array, or **loaded from a GitHub repository** mounted on the session (see \xA7 Skills from a GitHub repository below). The agent automatically uses them when relevant to the task at hand:\n\n| Type | What it is |\n|---|---|\n| **Pre-built Anthropic skills** | Common document tasks (PowerPoint, Excel, Word, PDF). Reference by name (e.g. `xlsx`). |\n| **Custom skills** | Skills you've created in your organization via the Skills API. Reference by `skill_id` + optional `version`. |\n\n**Max 20 skills per agent.** Agent creation uses `managed-agents-2026-04-01`; the separate Skills API (for managing custom skill definitions) uses `skills-2025-10-02`.\n\n### Enabling skills on a session\n\nSkills are attached to the **agent** definition via `agents.create()`:\n\n```ts\nconst agent = await client.beta.agents.create(\n  {\n    name: \"Financial Agent\",\n    model: \"{{OPUS_ID}}\",\n    system: \"You are a financial analysis agent.\",\n    skills: [\n      { type: \"anthropic\", skill_id: \"xlsx\" },\n      { type: \"custom\", skill_id: \"skill_abc123\", version: \"latest\" },\n    ],\n  }\n);\n```\n\nPython:\n\n```python\nagent = client.beta.agents.create(\n    name=\"Financial Agent\",\n    model=\"{{OPUS_ID}}\",\n    system=\"You are a financial analysis agent.\",\n    skills=[\n        {\"type\": \"anthropic\", \"skill_id\": \"xlsx\"},\n        {\"type\": \"custom\", \"skill_id\": \"skill_abc123\", \"version\": \"latest\"},\n    ]\n)\n```\n\n**Skill reference fields:**\n\n| Field | Anthropic skill | Custom skill |\n|---|---|---|\n| `type` | `\"anthropic\"` | `\"custom\"` |\n| `skill_id` | Skill name (e.g. `\"xlsx\"`, `\"docx\"`, `\"pptx\"`, `\"pdf\"`) | Skill ID from Skills API (e.g. `\"skill_abc123\"`) |\n| `version` | `\"latest\"` or a specific version number | `\"latest\"` or a specific version number |\n\n`version` is optional on **both** kinds and defaults to `\"latest\"` \u2014 it is not custom-skill-only.\n\n### Skills from a GitHub repository\n\nSkills can also live in your codebase. When a session mounts a repository via the `github_repository` resource (see `shared/managed-agents-environments.md` \u2192 GitHub Repositories), the repository's root `.claude/skills` directory is scanned at session start, and each skill found becomes available to the agent: it sees each discovered skill's name, description, and sandbox path, and reads the skill's `SKILL.md` (plus any scripts/resources it ships) when a task matches.\n\n**The agent can discover any skill in `.claude/skills/<skill-name>/`** \u2014 one directory level deep at the repository root. Skills in the following locations are not discoverable: a bare `.claude/skills/SKILL.md` (no skill directory), anything nested deeper (`.claude/skills/tools/code-review/SKILL.md`), a `skills/` directory outside `.claude`, or a `.claude/skills` inside a package subdirectory (though those can still surface when the agent reads files under that subtree). The `SKILL.md` format is the same as uploaded custom skills.\n\n> \u26A0\uFE0F **Repository skills are agent instructions \u2014 treat them as part of your trust boundary.** Anyone who can commit to a mounted repository (a merged external PR, a compromised dependency, a contributor) can add or edit `.claude/skills/` content, and the platform loads it at session start with no review step \u2014 where session tools like `bash` and `web_fetch` give injected instructions real capability. Only mount repositories you trust, and audit `.claude/skills/` before mounting one with external contributors.\n\nRules:\n- **Cloud sandboxes only** \u2014 self-hosted sandboxes don't support `github_repository` resources, so they can't load repository skills.\n- **Scanned once, at session start**, from the repository state checked out then (the resource's `checkout` branch/commit, else the default branch). Commits pushed mid-session are not picked up \u2014 start a new session for updated skills. Repositories added to a *running* session are not scanned either.\n- **Coexists with attached skills.** If a repository skill shares a name with an attached skill (or a skill from another mounted repo), both are available, each announced with its own path.\n\n### Skills API\n\n| Operation             | Method   | Path                                            |\n| --------------------- | -------- | ----------------------------------------------- |\n| Create Skill          | `POST`   | `/v1/skills`                                    |\n| List Skills           | `GET`    | `/v1/skills`                                    |\n| Get Skill             | `GET`    | `/v1/skills/{id}`                               |\n| Delete Skill          | `DELETE` | `/v1/skills/{id}`                               |\n| Create Version        | `POST`   | `/v1/skills/{id}/versions`                      |\n| List Versions         | `GET`    | `/v1/skills/{id}/versions`                      |\n| Get Version           | `GET`    | `/v1/skills/{id}/versions/{version}`            |\n| Delete Version        | `DELETE` | `/v1/skills/{id}/versions/{version}`            |\n\n"

// --- bundle[24147180:24166170]  (18990 B)
//     especificidad 5.452 · 2 anclas — 'WebFetchTool'(×11 g1), 'WebSearchTool'(×16 g1)
YAy="# Claude API \u2014 C#\n\n> **Note:** The C# SDK is the official Anthropic SDK for C#. Tool use is supported via the Messages API with a beta `BetaToolRunner` for automatic tool execution loops. The SDK also supports Microsoft.Extensions.AI IChatClient integration with function invocation and Managed Agents (beta).\n\n## Namespace Reference\n\nTypes are organized by namespace. If a type you need isn't shown in an example below, locate it via this table first \u2014 don't block on fetching SDK source over the network.\n\n| `using` | Contains |\n|---|---|\n| `Anthropic` | `AnthropicClient`, top-level options |\n| `Anthropic.Models.Messages` | non-beta request/response types \u2014 `MessageCreateParams`, `Model`, `Role`, `ContentBlock`, `TextBlock`, `ToolUseBlock`, `ToolResultBlockParam`, `Tool*` (tool definition classes) |\n| `Anthropic.Models.Beta.Messages` | beta-endpoint equivalents \u2014 `MessageCreateParams`, `BetaMessage`, `BetaTool*`, `Speed`, `BetaRequestMcpServerUrlDefinition`, context-editing/compaction configs |\n| `Anthropic.Models.Beta` | shared beta constants |\n| `Anthropic.Models.Beta.Files` | Files API types |\n| `Anthropic.Models.Messages.Batches` | Batch API types |\n| `Anthropic.Helpers.Beta` | `BetaToolRunner`, beta helper utilities |\n| `Anthropic.Exceptions` | `AnthropicApiException`, `AnthropicRateLimitException`, `Anthropic5xxException`, etc. \u2014 see `shared/error-codes.md` |\n| `Anthropic.Bedrock` / `Anthropic.Vertex` / `Anthropic.Foundry` / `Anthropic.Aws` | platform clients (separate NuGet packages): `AnthropicBedrockMantleClient`, `AnthropicFoundryClient`, `AnthropicAwsClient` |\n\n`client.Messages.*` uses non-beta types; `client.Beta.Messages.*` uses the `Anthropic.Models.Beta.Messages` types. Both namespaces define a `MessageCreateParams` \u2014 pick the one matching the client path you call.\n\n### Key types per feature\n\nWrite from this table instead of reflecting the SDK assembly. Endpoint column tells you whether to use `client.Messages.*` or `client.Beta.Messages.*`.\n\n| Feature | Endpoint | Key C# types (namespace per table above) |\n|---|---|---|\n| User profiles | beta | `client.Beta.UserProfiles.Create(...)` / `.Retrieve(id)` / `.List()`. Pass the returned profile id on the beta messages call. Requires a beta header \u2014 check the SDK's beta-headers reference for the current flag. |\n| Agent Skills | beta | `BetaContainerParams` (with `Skills = [new BetaSkillParams { ... }]`), `BetaCodeExecutionTool20250825`. `Betas = [\"code-execution-2025-08-25\", \"skills-2025-10-02\"]`. Download the output via `client.Beta.Files.Download(fileId)`. |\n| Advisor tool | beta | `BetaAdvisorTool20260301` \u2014 may not be in all SDK releases yet |\n| Cache diagnostics | beta | `Diagnostics = new() { PreviousMessageID = \u2026 }`, `BetaCacheControlEphemeral`, `BetaContentBlockParam` |\n| Context editing | beta | `ContextManagement = new BetaContextManagementConfig { Edits = [new BetaClearToolUses20250919Edit()] }`. `Betas = [\"context-management-2025-06-27\"]` (not `compact-2026-01-12` \u2014 that's for `BetaCompact20260112Edit`). |\n| Memory tool | non-beta | `Tools = [new ToolUnion(new MemoryTool20250818())]` |\n| Programmatic tool calling | non-beta | `CodeExecutionTool20260120`, `ToolResultBlockParam`, `ContentBlockParam` |\n| Task budgets | beta | `BetaOutputConfig` with `TaskBudget = new BetaTokenTaskBudget { ... }` |\n| Tool search | non-beta | `new ToolUnion(new ToolSearchToolRegex20251119 { Type = ToolSearchToolRegex20251119Type.ToolSearchToolRegex20251119 })` \u2014 `Type` must be set explicitly. |\n| Web search | non-beta | `new ToolUnion(new WebSearchTool20260209())` \u2014 the latest variant with dynamic filtering ({{FABLE_NAME}} + {{OPUS_NAME}} + Opus 4.8/4.7/4.6 + {{SONNET_NAME}} + Sonnet 4.6). For older models or Vertex, use `WebSearchTool20250305()` |\n\n### Discovering type and member names\n\nIf a type or member you need isn't in the tables above, `strings ~/.nuget/packages/anthropic/*/lib/*/Anthropic.dll | grep -i <term>` is fast and sufficient for locating class and property names. **Do not escalate to a `dotnet run` reflection probe** to dump members precisely \u2014 the first compile is slow enough to be backgrounded in many environments, trapping you in a polling loop. Instead, write `Program.cs` using the names `strings | grep` found; if a member name is wrong the compiler error (`error CS1061: 'X' does not contain a definition for 'Y'`) points at it in a few seconds, faster than any reflection probe.\n\nNote that `strings` will not surface wire-format snake_case field names (`output_tokens`, `stop_reason`) \u2014 those are stored in the DLL differently. **C# properties are the PascalCase equivalent of the wire field** (`response.Usage.OutputTokens`, `response.StopReason`). If you know the wire field name from the docs, write the PascalCase property and compile; do not probe for the snake_case string.\n\n### Minimal working skeleton\n\n**Write a plain `Program.cs` body** \u2014 `using` statements followed by top-level statements, as below. Do **not** add a `#!/usr/bin/env dotnet` shebang or `#:package Anthropic@*` directive: those are .NET file-based-app syntax and fail with `CS1024: Preprocessor directive expected` when the file is compiled via an existing `.csproj`. The standard project setup (per the [C# quickstart](https://platform.claude.com/docs/en/get-started): `dotnet new console` \u2192 `dotnet add package Anthropic` \u2192 edit `Program.cs` \u2192 `dotnet run`) provides the `.csproj` and package reference.\n\nStart from this \u2014 it compiles as-is. Fill in the feature-specific fields; do not spend turns running reflection or XML-doc inspection to discover type names first.\n\n```csharp\nusing System;\nusing Anthropic;\nusing Anthropic.Models.Messages;       // or Anthropic.Models.Beta.Messages for beta endpoints\n\nAnthropicClient client = new();\n\nvar message = await client.Messages.Create(new MessageCreateParams\n{\n    Model = \"{{OPUS_ID}}\",\n    MaxTokens = 1024,\n    Messages = [ new() { Role = Role.User, Content = \"Hello, Claude\" } ],\n});\n\nConsole.WriteLine(message);\n```\n\nFor beta features (anything behind an `anthropic-beta` header), use the beta client path and namespace \u2014 same overall shape:\n\n```csharp\nusing System;\nusing Anthropic;\nusing Anthropic.Models.Beta.Messages;\n\nAnthropicClient client = new();\n\nvar response = await client.Beta.Messages.Create(new MessageCreateParams\n{\n    Model = \"{{OPUS_ID}}\",\n    MaxTokens = 4096,\n    Betas = [\"<beta-flag>\"],\n    Messages = [ new() { Role = Role.User, Content = \"\u2026\" } ],\n    // Tools = new BetaToolUnion[] { new BetaSomeTool { \u2026 } },   // for tool features\n});\n\nConsole.WriteLine(response);\n```\n\nIf a type name the feature needs isn't in this file, write it following the naming pattern in the Namespace Reference above and fix from compiler output \u2014 producing a `Program.cs` and iterating beats researching.\n\n### Common C# compile errors\n\n- **CS8803 (top-level statements must precede type declarations):** put any `record`/`class`/`struct` definitions **after** the last top-level statement, at the end of the file. A record defined above `var client = new AnthropicClient()` will not compile.\n- **`await foreach` on a `Task<\u2026Page>`:** `client.Models.List()` returns a `Task<ModelListPage>`, which is not directly async-enumerable. Await it first, then iterate: `var page = await client.Models.List(); foreach (var m in page.Items) {\u2026}`. For auto-pagination, check whether the page type exposes `AutoPagingEachAsync()` or similar before reaching for `await foreach`.\n\n## Installation\n\n```bash\ndotnet add package Anthropic\n```\n\n## Client Initialization\n\n```csharp\nusing Anthropic;\n\n// Default (uses ANTHROPIC_API_KEY env var)\nAnthropicClient client = new();\n\n// Explicit API key (use environment variables \u2014 never hardcode keys)\nAnthropicClient client = new() {\n    ApiKey = Environment.GetEnvironmentVariable(\"ANTHROPIC_API_KEY\")\n};\n```\n\n---\n\n## Basic Message Request\n\n```csharp\nusing Anthropic.Models.Messages;\n\nvar parameters = new MessageCreateParams\n{\n    Model = \"{{OPUS_ID}}\",\n    MaxTokens = 16000,\n    Messages = [new() { Role = Role.User, Content = \"What is the capital of France?\" }]\n};\nvar response = await client.Messages.Create(parameters);\n\n// ContentBlock is a union wrapper. .Value unwraps to the variant object,\n// then OfType<T> filters to the type you want. Or use the TryPick* idiom\n// shown in the Thinking section below.\nforeach (var text in response.Content.Select(b => b.Value).OfType<TextBlock>())\n{\n    Console.WriteLine(text.Text);\n}\n```\n\n---\n\n## Thinking\n\n**Adaptive thinking is the recommended mode for Claude 4.6+ models.** Claude decides dynamically when and how much to think.\n\n> **Fable 5, {{OPUS_NAME}}, Opus 4.8, Opus 4.7, Opus 4.6, and Sonnet 4.6:** Use adaptive thinking (below). `new ThinkingConfigEnabled { BudgetTokens = N }` is removed on Fable 5, {{OPUS_NAME}}, Opus 4.8, and 4.7 (400 if sent); deprecated on Opus 4.6 and Sonnet 4.6.\n> **{{OPUS_NAME}}:** thinking is on by default \u2014 omitting `Thinking` runs adaptive (`ThinkingConfigAdaptive` is equivalent), unlike Opus 4.8/4.7 where omitting it meant no thinking. `ThinkingConfigDisabled` is accepted only at effort `high` or lower; pairing it with `xhigh`/`max` returns a 400.\n> **Older models:** Use `new ThinkingConfigEnabled { BudgetTokens = N }` (budget must be < `MaxTokens`, min 1024).\n\n```csharp\nusing Anthropic.Models.Messages;\n\nvar response = await client.Messages.Create(new MessageCreateParams\n{\n    Model = \"{{OPUS_ID}}\",\n    MaxTokens = 16000,\n    // ThinkingConfigParam? implicitly converts from the concrete variant classes \u2014\n    // no wrapper needed.\n    // display opt-in: default is omitted (empty thinking text) on Fable 5 / Mythos 5 / {{OPUS_NAME}} / Opus 4.8 / 4.7\n    Thinking = new ThinkingConfigAdaptive { Display = Display.Summarized },\n    Messages =\n    [\n        new() { Role = Role.User, Content = \"Solve: 27 * 453\" },\n    ],\n});\n\n// ThinkingBlock(s) precede TextBlock in Content. TryPick* narrows the union.\nforeach (var block in response.Content)\n{\n    if (block.TryPickThinking(out ThinkingBlock? t))\n    {\n        Console.WriteLine($\"[thinking] {t.Thinking}\");\n    }\n    else if (block.TryPickText(out TextBlock? text))\n    {\n        Console.WriteLine(text.Text);\n    }\n}\n```\n\nAlternative to `TryPick*`: `.Select(b => b.Value).OfType<ThinkingBlock>()` (same LINQ pattern as the Basic Message example).\n\n---\n\n## Context Editing / Compaction (Beta)\n\n**Beta-namespace prefix is inconsistent** (source-verified against `src/Anthropic/Models/Beta/Messages/*.cs` @ 12.9.0). No prefix: `MessageCreateParams`, `MessageCountTokensParams`, `Role`, `Speed`. **Everything else has the `Beta` prefix**: `BetaMessageParam`, `BetaMessage`, `BetaContentBlock`, `BetaToolUseBlock`, all block param types. The unprefixed `Role` WILL collide with `Anthropic.Models.Messages.Role` if you import both namespaces (CS0104). Safest: import only Beta; if mixing, alias the beta `Role`:\n\n```csharp\nusing Anthropic.Models.Beta.Messages;\nusing NonBeta = Anthropic.Models.Messages;  // only if you also need non-beta types\n// Now: MessageCreateParams, BetaMessageParam, Role (beta's), NonBeta.Role (if needed)\n```\n\n\n`BetaMessage.Content` is `IReadOnlyList<BetaContentBlock>` \u2014 a 15-variant discriminated union. Narrow with `TryPick*`. **Response `BetaContentBlock` is NOT assignable to param `BetaContentBlockParam`** \u2014 there's no `.ToParam()` in C#. Round-trip by converting each block:\n\n```csharp\nusing Anthropic.Models.Beta.Messages;\n\nvar betaParams = new MessageCreateParams   // no Beta prefix \u2014 see unprefixed list above\n{\n    Model = \"{{OPUS_ID}}\",\n    MaxTokens = 16000,\n    Betas = [\"compact-2026-01-12\"],\n    ContextManagement = new BetaContextManagementConfig\n    {\n        Edits = [new BetaCompact20260112Edit()],\n    },\n    Messages = messages,\n};\nBetaMessage resp = await client.Beta.Messages.Create(betaParams);\n\nforeach (BetaContentBlock block in resp.Content)\n{\n    if (block.TryPickCompaction(out BetaCompactionBlock? compaction))\n    {\n        // Content is nullable \u2014 compaction can fail server-side\n        Console.WriteLine($\"compaction summary: {compaction.Content}\");\n    }\n}\n\n// Context-edit metadata lives on a separate nullable field\nif (resp.ContextManagement is { } ctx)\n{\n    foreach (var edit in ctx.AppliedEdits)\n        Console.WriteLine($\"cleared {edit.ClearedInputTokens} tokens\");\n}\n\n// ROUND-TRIP: BetaMessageParam.Content is BetaMessageParamContent (a string|list\n// union). It implicit-converts from List<BetaContentBlockParam>, NOT from the\n// response's IReadOnlyList<BetaContentBlock>. Convert each block:\nList<BetaContentBlockParam> paramBlocks = [];\nforeach (var b in resp.Content)\n{\n    if (b.TryPickText(out var t)) paramBlocks.Add(new BetaTextBlockParam { Text = t.Text });\n    else if (b.TryPickCompaction(out var c)) paramBlocks.Add(new BetaCompactionBlockParam { Content = c.Content });\n    // ... other variants as needed\n}\nmessages.Add(new BetaMessageParam { Role = Role.Assistant, Content = paramBlocks });\n```\n\nAll 15 `BetaContentBlock.TryPick*` variants: `Text`, `Thinking`, `RedactedThinking`, `ToolUse`, `ServerToolUse`, `WebSearchToolResult`, `WebFetchToolResult`, `CodeExecutionToolResult`, `BashCodeExecutionToolResult`, `TextEditorCodeExecutionToolResult`, `ToolSearchToolResult`, `McpToolUse`, `McpToolResult`, `ContainerUpload`, `Compaction`.\n\n**`BetaToolUseBlock.Input` is `IReadOnlyDictionary<string, JsonElement>`** \u2014 index by key then call the `JsonElement` extractor:\n\n```csharp\nif (block.TryPickToolUse(out BetaToolUseBlock? tu))\n{\n    int a = tu.Input[\"a\"].GetInt32();\n    string s = tu.Input[\"name\"].GetString()!;\n}\n```\n\n---\n\n## Effort Parameter\n\nEffort is nested under `OutputConfig`, NOT a top-level property. `ApiEnum<string, Effort>` has an implicit conversion from the enum, so assign `Effort.High` directly.\n\n```csharp\nOutputConfig = new OutputConfig { Effort = Effort.High },\n```\n\nValues: `Effort.Low`, `Effort.Medium`, `Effort.High`, `Effort.Max`. Combine with `Thinking = new ThinkingConfigAdaptive()` for cost-quality control.\n\n---\n\n## Prompt Caching\n\n`System` takes `MessageCreateParamsSystem?` \u2014 a union of `string` or `List<TextBlockParam>`. There is no `SystemTextBlockParam`; use plain `TextBlockParam`. The implicit conversion needs the concrete `List<TextBlockParam>` type (array literals won't convert). For placement patterns and the silent-invalidator audit checklist, see `shared/prompt-caching.md`.\n\n```csharp\nSystem = new List<TextBlockParam> {\n    new() {\n        Text = longSystemPrompt,\n        CacheControl = new CacheControlEphemeral(),  // auto-sets Type = \"ephemeral\"\n    },\n},\n```\n\nOptional `Ttl` on `CacheControlEphemeral`: `new() { Ttl = Ttl.Ttl1h }` or `Ttl.Ttl5m`. `CacheControl` also exists on `Tool.CacheControl` and top-level `MessageCreateParams.CacheControl`.\n\nVerify hits via `response.Usage.CacheCreationInputTokens` / `response.Usage.CacheReadInputTokens`.\n\n---\n\n## Token Counting\n\n```csharp\nMessageTokensCount result = await client.Messages.CountTokens(new MessageCountTokensParams {\n    Model = \"{{OPUS_ID}}\",\n    Messages = [new() { Role = Role.User, Content = \"Hello\" }],\n});\nlong tokens = result.InputTokens;\n```\n\n`MessageCountTokensParams.Tools` uses a different union type (`MessageCountTokensTool`) than `MessageCreateParams.Tools` (`ToolUnion`) \u2014 if you're passing tools, the compiler will tell you when it matters.\n\n---\n\n## PDF / Document Input\n\n`DocumentBlockParam` takes a `DocumentBlockParamSource` union: `Base64PdfSource` / `UrlPdfSource` / `PlainTextSource` / `ContentBlockSource`. `Base64PdfSource` auto-sets `MediaType = \"application/pdf\"` and `Type = \"base64\"`.\n\n```csharp\nnew MessageParam {\n    Role = Role.User,\n    Content = new List<ContentBlockParam> {\n        new DocumentBlockParam { Source = new Base64PdfSource { Data = base64String } },\n        new TextBlockParam { Text = \"Summarize this PDF\" },\n    },\n}\n```\n\n---\n\n## Fast Mode (Beta)\n\n```csharp\nvar response = await client.Beta.Messages.Create(new MessageCreateParams {\n    Model = \"{{OPUS_ID}}\", MaxTokens = 4096,\n    Speed = Speed.Fast,\n    Betas = [\"fast-mode-2026-02-01\"],\n    Messages = [...],\n});\n```\n\n## Models API\n\n```csharp\nvar page = await client.Models.List();\nforeach (var m in page.Items) { Console.WriteLine(m.ID); }\nvar one = await client.Models.Retrieve(\"{{OPUS_ID}}\");\n```\n\n## Long Output (128k) + Prefill\n\nSet `MaxTokens = 128000` on `client.Messages` and use the streaming path (see `streaming.md`). On Claude 4+ models, 128k output is native \u2014 no `output-128k-*` beta header or beta namespace is needed.\n\n**Prefilling the assistant message** (putting a trailing `Role.Assistant` message in the input) is **not supported** on {{FABLE_NAME}}, {{OPUS_NAME}}, Opus 4.8, Opus 4.7, Opus 4.6, and Sonnet 4.6 \u2014 requests return a 400. Use `OutputConfig.Format` (structured outputs) instead.\n\n## Stop Details\n\nWhen `StopReason` is `\"refusal\"`, the response includes structured `StopDetails`:\n\n```csharp\nif (response.StopReason == \"refusal\" && response.StopDetails is { } details)\n{\n    Console.WriteLine($\"Category: {details.Category}\");\n    Console.WriteLine($\"Explanation: {details.Explanation}\");\n}\n```\n\n**Refusal fallbacks ({{FABLE_NAME}}) \u2014 opt in by default.** Fallbacks are opt-in: without them a refused request simply stops. In `{{FABLE_ID}}` code, include `Fallbacks = [new(Model.ClaudeOpus4_8)]` plus the `AnthropicBeta.ServerSideFallback2026_06_01` beta on the beta messages call by default \u2014 a policy decline is re-served by the fallback model inside the same call. Not available on Amazon Bedrock, Vertex AI, or Microsoft Foundry \u2014 use the client-side handler there: `new AnthropicClient { Handlers = [new BetaRefusalFallbackHandler { Fallbacks = [new(Model.ClaudeOpus4_8)] }] }` (namespace `Anthropic.Helpers`), with per-conversation state via `BetaFallbackState.Create()` scoped with `using (fallbackState.Use()) { ... }`. Full semantics (billing, sticky routing, streaming) and a runnable example: `shared/model-migration.md` \u2192 Migrating to {{FABLE_NAME}} \u2192 `refusal` stop reason, and the C# SDK repo's `examples/` (WebFetch via `shared/live-sources.md`).\n\n---\n\n## Managed Agents (Beta)\n\nThe C# SDK supports Managed Agents via `client.Beta.Agents`, `client.Beta.Sessions`, `client.Beta.Environments`, and related namespaces. See `shared/managed-agents-overview.md` for the architecture and `curl/managed-agents.md` for the wire-level reference.\n"

// --- bundle[24167043:24173210]  (6167 B)
//     especificidad 5.452 · 2 anclas — 'WebFetchTool'(×11 g1), 'WebSearchTool'(×16 g1)
QAy=`# Tool Use \u2014 C#

For conceptual overview (tool definitions, tool choice, tips), see [shared/tool-use-concepts.md](../../shared/tool-use-concepts.md).

## Tool Use

### Defining a tool

\`Tool\` (NOT \`ToolParam\`) with an \`InputSchema\` record. \`InputSchema.Type\` is auto-set to \`"object"\` by the constructor \u2014 don't set it. \`ToolUnion\` has an implicit conversion from \`Tool\`, triggered by the collection expression \`[...]\`.

\`\`\`csharp
using System.Text.Json;
using Anthropic.Models.Messages;

var parameters = new MessageCreateParams
{
    Model = Model.ClaudeSonnet4_6,
    MaxTokens = 16000,
    Tools = [
        new Tool {
            Name = "get_weather",
            Description = "Get the current weather in a given location",
            InputSchema = new() {
                Properties = new Dictionary<string, JsonElement> {
                    ["location"] = JsonSerializer.SerializeToElement(
                        new { type = "string", description = "City name" }),
                },
                Required = ["location"],
            },
        },
    ],
    Messages = [new() { Role = Role.User, Content = "Weather in Paris?" }],
};
\`\`\`

Derived from \`anthropic-sdk-csharp/src/Anthropic/Models/Messages/Tool.cs\` and \`ToolUnion.cs:799\` (implicit conversion).

See [shared tool use concepts](../../shared/tool-use-concepts.md) for the loop pattern.
### Converting response content to the follow-up assistant message

When echoing Claude's response back in the assistant turn, **there is no \`.ToParam()\` helper** \u2014 manually reconstruct each \`ContentBlock\` variant as its \`*Param\` counterpart. Do NOT use \`new ContentBlockParam(block.Json)\`: it compiles and serializes, but \`.Value\` stays \`null\` so \`TryPick*\`/\`Validate()\` fail (degraded JSON pass-through, not the typed path).

\`\`\`csharp
using Anthropic.Models.Messages;

Message response = await client.Messages.Create(parameters);

// No .ToParam() \u2014 reconstruct per variant. Implicit conversions from each
// *Param type to ContentBlockParam mean no explicit wrapper.
List<ContentBlockParam> assistantContent = [];
List<ContentBlockParam> toolResults = [];
foreach (ContentBlock block in response.Content)
{
    if (block.TryPickText(out TextBlock? text))
    {
        assistantContent.Add(new TextBlockParam { Text = text.Text });
    }
    else if (block.TryPickThinking(out ThinkingBlock? thinking))
    {
        // Signature MUST be preserved \u2014 the API rejects tampering
        assistantContent.Add(new ThinkingBlockParam
        {
            Thinking = thinking.Thinking,
            Signature = thinking.Signature,
        });
    }
    else if (block.TryPickRedactedThinking(out RedactedThinkingBlock? redacted))
    {
        assistantContent.Add(new RedactedThinkingBlockParam { Data = redacted.Data });
    }
    else if (block.TryPickToolUse(out ToolUseBlock? toolUse))
    {
        // ToolUseBlock has required Caller; ToolUseBlockParam.Caller is optional \u2014 don't copy it
        assistantContent.Add(new ToolUseBlockParam
        {
            ID = toolUse.ID,
            Name = toolUse.Name,
            Input = toolUse.Input,
        });
        // Execute the tool; collect ONE result per tool_use block \u2014 the API
        // rejects the follow-up if any tool_use ID lacks a matching tool_result.
        string result = ExecuteYourTool(toolUse.Name, toolUse.Input);
        toolResults.Add(new ToolResultBlockParam
        {
            ToolUseID = toolUse.ID,
            Content = result,
        });
    }
}

// Follow-up: prior messages + assistant echo + user tool_result(s)
List<MessageParam> followUpMessages =
[
    .. parameters.Messages,
    new() { Role = Role.Assistant, Content = assistantContent },
    new() { Role = Role.User, Content = toolResults },
];
\`\`\`

\`ToolResultBlockParam\` has no tuple constructor \u2014 use the object initializer. \`Content\` is a string-or-list union; a plain \`string\` implicitly converts.

---

## Structured Output

\`\`\`csharp
OutputConfig = new OutputConfig {
    Format = new JsonOutputFormat {
        Schema = new Dictionary<string, JsonElement> {
            ["type"] = JsonSerializer.SerializeToElement("object"),
            ["properties"] = JsonSerializer.SerializeToElement(
                new { name = new { type = "string" } }),
            ["required"] = JsonSerializer.SerializeToElement(new[] { "name" }),
        },
    },
},
\`\`\`

\`JsonOutputFormat.Type\` is auto-set to \`"json_schema"\` by the constructor. \`Schema\` is \`required\`.

---

## Anthropic-Defined Tools

Web search, bash, text editor, and code execution are Anthropic-defined tools with built-in schemas. Web search and code execution are server-executed; bash and text editor are client-executed (you handle the \`tool_use\` locally \u2014 see \`shared/tool-use-concepts.md\`). Type names are version-suffixed; constructors auto-set \`name\`/\`type\`. **Wrap each in \`new ToolUnion(...)\` explicitly.**

\`\`\`csharp
Tools = [
    new ToolUnion(new WebSearchTool20260209()),
    new ToolUnion(new ToolBash20250124()),
    new ToolUnion(new ToolTextEditor20250728()),
    new ToolUnion(new CodeExecutionTool20260120()),
],
\`\`\`

Also available: \`new ToolUnion(new WebFetchTool20260209())\`, \`new ToolUnion(new MemoryTool20250818())\`. \`WebSearchTool20260209\` optionals: \`AllowedDomains\`, \`BlockedDomains\`, \`MaxUses\`, \`UserLocation\`.

---

## Tool Runner (Beta)

The C# SDK provides a \`BetaToolRunner\` for automatic tool execution loops. Define tools with raw JSON schemas, and the runner handles the API call \u2192 tool execution \u2192 result feedback loop.

\`\`\`csharp
using Anthropic.Models.Beta.Messages;

// Define tools and create params as shown in the Tool Use section above,
// but using the beta namespace types (BetaToolUnion, etc.)
var runner = client.Beta.Messages.ToolRunner(betaParams);

await foreach (BetaMessage message in runner)
{
    foreach (var block in message.Content)
    {
        if (block.TryPickText(out var text))
        {
            Console.WriteLine(text.Text);
        }
    }
}
\`\`\`

---

`

// Habia 9 sitios de co-ocurrencia; se emitieron los 6 de mayor cruce. Un contrato con muchas
// realizaciones (una interfaz) los tiene por decenas.
