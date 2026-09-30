// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Ln,$u}from"/$bunfs/root/chunk-d37h8mav.js";import{Jr,xr}from"/$bunfs/root/chunk-0j2vcydt.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";var t={claudeMd:!0,skills:!0,workflows:!1,plugins:!0,pluginMonitors:!1,themes:!1,hljsLanguages:!0,hooks:!0,statusLine:!1,fileSuggestion:!1,mcpAutoDiscovered:!1,mcpClaudeAi:!1,mcpAgentFrontmatter:!0,agents:!0,outputStyles:!1,lspServers:!0,keybindings:!1},l={claudeMd:!1,skills:!1,workflows:!1,plugins:!1,pluginMonitors:!1,themes:!1,hljsLanguages:!1,hooks:!0,statusLine:!0,fileSuggestion:!0,mcpAutoDiscovered:!1,mcpClaudeAi:!1,mcpAgentFrontmatter:!1,agents:!1,outputStyles:!1,lspServers:!1,keybindings:!1},o={claudeMd:!1,skills:!1,workflows:!1,plugins:!1,pluginMonitors:!1,themes:!1,hljsLanguages:!1,hooks:!1,statusLine:!0,fileSuggestion:!0,mcpAutoDiscovered:!1,mcpClaudeAi:!1,mcpAgentFrontmatter:!1,agents:!1,outputStyles:!1,lspServers:!1,keybindings:!1};function jr(e,s){if(o[e]&&Ln())return!0;if(xr()&&!l[e])return!0;if(Jr()&&!s?.explicitlyRequested)return t[e];return!1}function MH(){return Boolean(a.CLAUDE_CODE_DISABLE_CLAUDE_MDS||jr("claudeMd",{explicitlyRequested:$u().length>0}))}
export{jr,MH};
