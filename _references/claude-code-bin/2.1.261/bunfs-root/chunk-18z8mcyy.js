// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{he}from"/$bunfs/root/chunk-annedm50.js";import"/$bunfs/root/chunk-dcawh0q4.js";import"/$bunfs/root/chunk-x7f60hk6.js";import"/$bunfs/root/chunk-91n3hqvz.js";import{I,we}from"/$bunfs/root/chunk-hyqdn9c0.js";import"/$bunfs/root/chunk-fvzv4ke0.js";import"/$bunfs/root/chunk-84mvm17e.js";import"/$bunfs/root/chunk-8w57hkxq.js";import"/$bunfs/root/chunk-a207t0vs.js";import"/$bunfs/root/chunk-49q43dms.js";import"/$bunfs/root/chunk-2y9gqtpa.js";import{G,Tt}from"/$bunfs/root/chunk-xzmtst7a.js";import{S,V,n}from"/$bunfs/root/chunk-y5pwxex8.js";import"/$bunfs/root/chunk-e0egp0nd.js";import"/$bunfs/root/chunk-py8dsda5.js";import"/$bunfs/root/chunk-e1njvp95.js";import"/$bunfs/root/chunk-020pptsa.js";import{i}from"/$bunfs/root/chunk-838r2s0v.js";import"/$bunfs/root/chunk-vvf2tdhs.js";import"/$bunfs/root/chunk-jab6fkvt.js";import"/$bunfs/root/chunk-rdp33ner.js";import"/$bunfs/root/chunk-yahgjr75.js";import{Ue}from"/$bunfs/root/chunk-2a6tx3x8.js";import"/$bunfs/root/chunk-6pmy77t2.js";import"/$bunfs/root/chunk-tn96w8x6.js";import{zK}from"/$bunfs/root/chunk-hsewrfs2.js";import"/$bunfs/root/chunk-z9pce9zb.js";import{Of}from"/$bunfs/root/chunk-1a7p190e.js";import"/$bunfs/root/chunk-k79k92jg.js";import"/$bunfs/root/chunk-qezj5211.js";import"/$bunfs/root/chunk-y87vtd8k.js";import"/$bunfs/root/chunk-n8m6z2zx.js";import"/$bunfs/root/chunk-9206rsny.js";import"/$bunfs/root/chunk-tcap6yb8.js";import"/$bunfs/root/chunk-q41p4zsw.js";import"/$bunfs/root/chunk-s0879eds.js";import"/$bunfs/root/chunk-d5174152.js";import"/$bunfs/root/chunk-2e0agwm9.js";import"/$bunfs/root/chunk-sh3w3snz.js";import"/$bunfs/root/chunk-znctvfkf.js";import"/$bunfs/root/chunk-q7wxr944.js";import"/$bunfs/root/chunk-qtjs85tq.js";import"/$bunfs/root/chunk-dem1zjh2.js";import"/$bunfs/root/chunk-xpat0ems.js";import"/$bunfs/root/chunk-82e9b5ex.js";import"/$bunfs/root/chunk-g2qb5pnr.js";import"/$bunfs/root/chunk-5fkqzxnf.js";import"/$bunfs/root/chunk-zzcvbc0w.js";import"/$bunfs/root/chunk-0ff9agk6.js";import"/$bunfs/root/chunk-hs05644q.js";import"/$bunfs/root/chunk-8xbkt625.js";import"/$bunfs/root/chunk-gxg8x291.js";import"/$bunfs/root/chunk-h3jmzymx.js";import"/$bunfs/root/chunk-52630dg1.js";import"/$bunfs/root/chunk-7mwy3xv6.js";import"/$bunfs/root/chunk-p3zwp1vp.js";import"/$bunfs/root/chunk-9rq9mz06.js";import"/$bunfs/root/chunk-stk161y4.js";import"/$bunfs/root/chunk-cef6a4eg.js";import"/$bunfs/root/chunk-f5wj6z2q.js";import"/$bunfs/root/chunk-ptxv38cr.js";import"/$bunfs/root/chunk-aerz4wsa.js";import"/$bunfs/root/chunk-abjvv046.js";import"/$bunfs/root/chunk-31tjt5p8.js";import"/$bunfs/root/chunk-nrkj245a.js";import"/$bunfs/root/chunk-2d61yeh9.js";import"/$bunfs/root/chunk-wdt4vs8t.js";import"/$bunfs/root/chunk-16w4y03y.js";import"/$bunfs/root/chunk-s1cxej39.js";import{Mt}from"/$bunfs/root/chunk-k6jfq7mw.js";import{Aqe}from"/$bunfs/root/chunk-5p7s740b.js";import{Vbe}from"/$bunfs/root/chunk-pvrmcb1j.js";import"/$bunfs/root/chunk-nb989tzj.js";import"/$bunfs/root/chunk-9p6et3p8.js";import"/$bunfs/root/chunk-7xd4r47e.js";import"/$bunfs/root/chunk-gfmykb9c.js";import"/$bunfs/root/chunk-e2976mv7.js";import"/$bunfs/root/chunk-4c991prk.js";import"/$bunfs/root/chunk-z3xbqh22.js";import"/$bunfs/root/chunk-mxg1ntkk.js";import"/$bunfs/root/chunk-4qz1hwvq.js";import{readFile as F}from"fs/promises";import{basename as x,join as j}from"path";import{readdir as y,readFile as b,stat as C}from"fs/promises";import{extname as _,join as v}from"path";var E=52428800,T=200,g=60,D=/<command-name>\/([\w:-]+)<\/command-name>/g,A=/"name":"mcp__([^"]+?)__([^"]+)"/g,f='"content":"<command-name>/',R='"content":"<command-message>',k='"type":"tool_use"',N='"type":"custom-title"',O='"type":"pr-link"',M='"role":"user"',P=/"customTitle":"([^"]+)"/,U=/"prNumber":(\d+)/,L=/"role":"user"[^}]*"content":"([^"]+)"/;async function w(u,a){let t={slashCommandCounts:new Map,mcpServerCounts:new Map,sessionDescriptors:[],sessionFileCount:0},m=Date.now()-a*24*60*60*1000,h;try{h=await y(u)}catch(r){if(Tt(r))return t;throw r}let d=h.filter((r)=>_(r)===".jsonl"),p=(await Promise.all(d.map(async(r)=>{let l=v(u,r);try{let o=await C(l);if(!o.isFile()||o.mtimeMs<m||o.size>E)return null;return l}catch(o){if(Tt(o))return null;throw o}}))).filter((r)=>r!==null);for(let r of p){let l;try{l=await b(r,"utf-8")}catch(e){if(Tt(e))continue;throw e}t.sessionFileCount++;let o={prNumbers:[]};for(let e of l.split(`
`)){if(e.length<10)continue;if(e.includes(f)||e.includes(R))for(let s of e.matchAll(D)){let c=s[1];t.slashCommandCounts.set(c,(t.slashCommandCounts.get(c)??0)+1)}if(e.includes(k)&&e.includes('"name":"mcp__'))for(let s of e.matchAll(A)){let c=s[1];t.mcpServerCounts.set(c,(t.mcpServerCounts.get(c)??0)+1)}if(e.includes(N)){let s=P.exec(e);if(s)o.title=s[1]}if(e.includes(O)){let s=U.exec(e);if(s){let c=Number(s[1]);if(!o.prNumbers.includes(c))o.prNumbers.push(c)}}if(!o.firstMessage&&e.includes(M)&&!e.includes(f)&&!e.includes('"content":[')){let s=L.exec(e);if(s){let c=s[1].replace(/\\n/g," ").replace(/\\"/g,'"');if(c.length>3&&!c.startsWith("<"))o.firstMessage=c.slice(0,T)}}}if(o.title||o.prNumbers.length>0||o.firstMessage)t.sessionDescriptors.push(o)}if(t.sessionDescriptors.length>g)t.sessionDescriptors.sort((r,l)=>{let o=(r.title?2:0)+(r.prNumbers.length>0?1:0);return(l.title?2:0)+(l.prNumbers.length>0?1:0)-o}),t.sessionDescriptors=t.sessionDescriptors.slice(0,g);return t}var W=30;function B(u){try{return new URL(u).origin}catch{return}}async function q(u){try{let a=await F(j(u,".mcp.json"),"utf8"),t=V(a);if(t&&typeof t==="object"&&"mcpServers"in t&&t.mcpServers&&typeof t.mcpServers==="object")return t.mcpServers}catch(a){if(!G(a))n(`team-onboarding: failed to read .mcp.json: ${a instanceof Error?a.message:String(a)}`,{level:"error"})}return{}}async function Y(u){let a=he(),t=Of(a),m=await w(t,u),h=[...m.slashCommandCounts.entries()].sort((e,s)=>s[1]-e[1]).map(([e,s])=>({name:`/${e}`,count:s})),d=await q(a),p=[...m.mcpServerCounts.entries()].sort((e,s)=>s[1]-e[1]).map(([e,s])=>{let c=d[e];return{name:e,callCount:s,urlOrigin:typeof c?.url==="string"?B(c.url):void 0}}),r=(await Ue("git",["config","user.name"],{cwd:a})).stdout.trim(),l=(await Ue("git",["remote","get-url","origin"],{cwd:a})).stdout.trim();return{usageData:S({generatedBy:r||void 0,currentRepo:zK(l)??x(a),windowDays:u,sessionCount:m.sessionFileCount,slashCommands:h,mcpServers:p,sessionDescriptors:m.sessionDescriptors},null,2),sessionCount:m.sessionFileCount,slashCommandCount:m.slashCommandCounts.size,mcpServerCount:m.mcpServerCounts.size}}var H=`# Welcome to [Team Name]

## How We Use Claude

Based on [name]'s usage over the last [N] days:

Work Type Breakdown:
  [Category 1]  [ascii bar]  [N]%
  [Category 2]  [ascii bar]  [N]%
  [Category 3]  [ascii bar]  [N]%
  ...

Top Skills & Commands:
  [/command]  [ascii bar]  [N]x/month
  ...

Top MCP Servers:
  [Server]  [ascii bar]  [N] calls
  ...

## Your Setup Checklist

### Codebases
- [ ] [repo-name] \u2014 [repo url]
...

### MCP Servers to Activate
- [ ] [Server] \u2014 [what it's for]. [How to get access]
...

### Skills to Know About
- [/command] \u2014 [what it does, when the team uses it]
...

## Team Tips

_TODO_

## Get Started

_TODO_

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy \u2014 warm, conversational,
not lecture-y.

Open with a warm welcome \u2014 include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes \u2014 [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections \u2014 offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data \u2014 don't extrapolate them into a "team
workflow" narrative. -->`,K=`You are helping a power user generate an onboarding guide for teammates who are new to Claude Code. The guide will live in the team's onboarding docs and can be pasted into Claude for an interactive walkthrough.

You're co-authoring this with them \u2014 collaborative and helpful, like a teammate who's done this before and is happy to share.

## Usage data (last {{WINDOW_DAYS}} days)

This was scanned from the guide creator's local Claude Code transcripts:

\`\`\`json
{{USAGE_DATA}}
\`\`\`

## Your task

Before anything else \u2014 including before thinking through the classification \u2014 output exactly this line as your first visible text:

> Looking at how you've used Claude over the last {{WINDOW_DAYS}} days to put together an onboarding guide for teammates new to Claude Code.

This must come before any extended thinking about session descriptors. The guide creator is staring at a blank screen until you do. Classification is step 2, not step 1.

Generate the guide immediately, then ask for revisions. Don't wait for answers first \u2014 it's easier for the guide creator to edit a concrete draft than answer abstract questions.

1. **Output the acknowledgment line above.** No thinking, no classification, no tool calls before this. One line, then move on.

2. **Derive the work-type breakdown.** Read the \`sessionDescriptors\` array \u2014 each entry describes one session via its title, any linked code reviews (\`prNumbers\`), and first user message. Classify each session into one of these task types:

   - **build_feature** \u2014 new functionality, scripts, tools, config/CI/env setup
   - **debug_fix** \u2014 investigating and fixing bugs
   - **improve_quality** \u2014 refactoring, tests, cleanup, code review
   - **analyze_data** \u2014 queries, metrics, number crunching
   - **plan_design** \u2014 architecture, approach, strategy, understanding unfamiliar code, design review
   - **prototype** \u2014 spikes, POCs, throwaway exploration
   - **write_docs** \u2014 PRDs, RFCs, READMEs, design docs, copy/doc review

   Categories describe the *type of task*, not the project or domain \u2014 a teammate on any project should recognize them. Review sessions belong with whatever's being reviewed: code review is improve_quality, doc review is write_docs, design review is plan_design. Most sessions fit the list; only invent a new category if it's genuinely a different type of task. Pick the top 3-5 with rough percentages. First messages alone are usually enough; titles and code-review links are enrichment. If first messages are uninformative, use tool and MCP counts as a weak hint. If there are ~0 sessions, leave the breakdown as a TODO.

   In the rendered guide, display categories with spaces and title case (e.g. "Build Feature" not "build_feature").

3. **Gather the remaining pieces.** For repos, start with \`currentRepo\` and check the workspace for sibling repo directories. For MCP server setup, use each entry's \`name\` (and \`urlOrigin\` where present) to infer what the server does and how a teammate would get access. Leave the Team Tips and Get Started sections as TODO placeholders \u2014 you'll ask for these in Review and fill them in after.

4. **Write the guide to \`ONBOARDING.md\`** following this template:

\`\`\`
{{GUIDE_TEMPLATE}}
\`\`\`

   Fill in real numbers from the usage data (not placeholders). Use \`generatedBy\` for the name; if it's missing, omit the name. Ascii bar charts: \`\u2588\` for filled, \`\u2591\` for empty, 20 chars wide. Keep the HTML comment instruction at the bottom exactly as shown.

5. **Render the guide in a code block, then close out the first turn.** You're co-authoring this guide with the guide creator \u2014 frame the follow-up as collaboration, not corrections.

   After the code block, add a \`---\` horizontal rule and a \`**Review**\` heading so the guide is visually separated from your questions. Under the heading, number these three questions:

   1. "I went with '[X]' for the team name \u2014 let me know if that sounds right." (or if you couldn't tell: "What's the team name? I'll add it in.")
   2. Is there a starter task for someone new to Claude Code? (ticket or doc link \u2014 optional)
   3. Any team tips you'd tell a new teammate that aren't already in CLAUDE.md?

   After they answer, update \`ONBOARDING.md\` with their team name, tips, and starter task. Then close with this exact line (not numbered, not paraphrased):

   Saved to \`ONBOARDING.md\`. Drop it in your team docs and channels \u2014 when a new teammate pastes it into Claude Code, they get a guided onboarding tour from there.

   Apply any edits they come back with to the file.`,z=`

**Sharing** \u2014 call the ${Aqe} tool twice:

1. **Right after rendering the draft code block** (still in step 5, before the Review questions). Call with \`mode='check'\` \u2014 this uploads the draft to an existing guide (or creates a new one). Either way you get a \`share_url\` and \`short_code\`. Instead of the \`---\` / \`**Review**\` header from step 5, bridge directly from the link into the numbered questions (no horizontal rule):

   Here's a draft \u2014 a few quick questions to finish it up:

   <share URL>

   Then ask the three numbered questions from step 5 as normal. Save the \`short_code\` from the tool result \u2014 you'll need it in step 2.

2. **After the user answers the Review questions** and you've updated ONBOARDING.md, call it again with \`mode='update'\` and the \`short_code\` from step 1 to refresh the same link. Replace step 5's "drop it in your team docs" close with:

   Here's your onboarding guide: <updated URL>

   Send this to teammates and they'll get a guided walkthrough when they open it in Claude Code.

If the tool returns 'unavailable' at any point, skip that call and use the manual close from step 5 instead.`,X=["Edit(ONBOARDING.md)","Bash(ls *)",Aqe],J={type:"prompt",name:"team-onboarding",description:"Help teammates ramp on Claude Code with a guide from your usage",allowedTools:X,contentLength:0,isEnabled:()=>Mt("allow_team_onboarding"),policyGate:{policy:"allow_team_onboarding",featureLabel:"Team onboarding"},isHidden:!1,progressMessage:"scanning usage data",effort:"low",requires:{workspace:!0},userFacingName(){return"team-onboarding"},source:"builtin",disableModelInvocation:!0,async getPromptForCommand(u,a){let t=I("tengu_flint_harbor_prompt",{}),m=typeof t?.prompt==="string"?t.prompt:K,h=typeof t?.guideTemplate==="string"?t.guideTemplate:H,d=typeof t?.windowDays==="number"?Math.min(Math.max(Math.floor(t.windowDays),1),365):W;i("tengu_team_onboarding_invoked",{window_days:d}),await we((s)=>({...s,teamOnboardingLastUsedAt:Date.now()}),a.storageV5);let{usageData:p,sessionCount:r,slashCommandCount:l,mcpServerCount:o}=await Y(d),e=m.replaceAll("{{WINDOW_DAYS}}",String(d)).replaceAll("{{GUIDE_TEMPLATE}}",h).replaceAll("{{USAGE_DATA}}",p)+(Vbe()?z:"");return i("tengu_team_onboarding_generated",{session_count:r,slash_command_count:l,mcp_server_count:o,window_days:d}),[{type:"text",text:e}]}},_e=J;export{_e as default};
