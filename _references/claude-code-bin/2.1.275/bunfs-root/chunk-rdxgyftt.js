// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import"/$bunfs/root/chunk-q7rz8cer.js";import"/$bunfs/root/chunk-aw1peprz.js";import{ye}from"/$bunfs/root/chunk-4qqe0nh4.js";import"/$bunfs/root/chunk-h401nbms.js";import{j,Dt}from"/$bunfs/root/chunk-d5d0zdsy.js";import"/$bunfs/root/chunk-gytndg57.js";import"/$bunfs/root/chunk-t2x4z9pb.js";import"/$bunfs/root/chunk-gfewy5rb.js";import{I,ke}from"/$bunfs/root/chunk-xbd48fav.js";import"/$bunfs/root/chunk-6ghkw3jc.js";import"/$bunfs/root/chunk-dtjhjxgx.js";import"/$bunfs/root/chunk-j47jt515.js";import"/$bunfs/root/chunk-crr3rzxx.js";import"/$bunfs/root/chunk-ebf04mp3.js";import{S,J,t}from"/$bunfs/root/chunk-4bbpt7sc.js";import"/$bunfs/root/chunk-q4s29khb.js";import"/$bunfs/root/chunk-gh1pqen9.js";import"/$bunfs/root/chunk-5hm0m2yf.js";import{I2}from"/$bunfs/root/chunk-4m9qp5rm.js";import{i}from"/$bunfs/root/chunk-bkjq2ptm.js";import"/$bunfs/root/chunk-epe8zpsz.js";import"/$bunfs/root/chunk-fx21fm70.js";import"/$bunfs/root/chunk-hj17majf.js";import{Be}from"/$bunfs/root/chunk-rawgb24z.js";import"/$bunfs/root/chunk-ayvre55m.js";import"/$bunfs/root/chunk-qwxqekf7.js";import{vf}from"/$bunfs/root/chunk-g8rhxhbp.js";import"/$bunfs/root/chunk-tmptt1gv.js";import"/$bunfs/root/chunk-vtbas3eg.js";import"/$bunfs/root/chunk-74cchpjf.js";import"/$bunfs/root/chunk-kstt0hst.js";import"/$bunfs/root/chunk-nbfvjj3w.js";import"/$bunfs/root/chunk-we8g6eyq.js";import"/$bunfs/root/chunk-q8sknw7e.js";import"/$bunfs/root/chunk-hbrq69f0.js";import"/$bunfs/root/chunk-1d5n9rp4.js";import"/$bunfs/root/chunk-2m8hwn4j.js";import"/$bunfs/root/chunk-v49f6nqy.js";import"/$bunfs/root/chunk-4vqqdm2s.js";import"/$bunfs/root/chunk-75n2g1wh.js";import"/$bunfs/root/chunk-cwfdaz1m.js";import"/$bunfs/root/chunk-hxth9wj3.js";import"/$bunfs/root/chunk-f28b90f9.js";import"/$bunfs/root/chunk-xm6nmg9g.js";import"/$bunfs/root/chunk-g7fm0c2g.js";import"/$bunfs/root/chunk-sdtzs6xq.js";import"/$bunfs/root/chunk-cbmfm0r3.js";import"/$bunfs/root/chunk-y8as26ve.js";import"/$bunfs/root/chunk-8syy9k0k.js";import"/$bunfs/root/chunk-d7rqjcan.js";import"/$bunfs/root/chunk-shccf1t1.js";import"/$bunfs/root/chunk-mfr7w3xb.js";import"/$bunfs/root/chunk-01m22vhx.js";import"/$bunfs/root/chunk-grv4vgbv.js";import"/$bunfs/root/chunk-ffayvr1z.js";import"/$bunfs/root/chunk-gw27mnrz.js";import"/$bunfs/root/chunk-w1amg5qp.js";import"/$bunfs/root/chunk-5r15hsfa.js";import"/$bunfs/root/chunk-anxhwx8e.js";import"/$bunfs/root/chunk-3dnrd59g.js";import"/$bunfs/root/chunk-c1c3wvmj.js";import"/$bunfs/root/chunk-hca13bkw.js";import"/$bunfs/root/chunk-jk1ewzz0.js";import"/$bunfs/root/chunk-j5h14mgz.js";import"/$bunfs/root/chunk-6geqjj5f.js";import"/$bunfs/root/chunk-w21br88b.js";import"/$bunfs/root/chunk-cf542jqn.js";import"/$bunfs/root/chunk-kxr4eyfb.js";import"/$bunfs/root/chunk-2pr871ag.js";import"/$bunfs/root/chunk-96tx2e97.js";import{lot}from"/$bunfs/root/chunk-x4wkm8qw.js";import{d0e}from"/$bunfs/root/chunk-4x488jx9.js";import"/$bunfs/root/chunk-8xz4ncz8.js";import"/$bunfs/root/chunk-9aqjzvk8.js";import"/$bunfs/root/chunk-rj4mppbb.js";import"/$bunfs/root/chunk-1b1s2j3n.js";import"/$bunfs/root/chunk-2whpjj9f.js";import"/$bunfs/root/chunk-0ahj7yw0.js";import"/$bunfs/root/chunk-sdq4073e.js";import"/$bunfs/root/chunk-grjqv34j.js";import"/$bunfs/root/chunk-afr02rb5.js";import"/$bunfs/root/chunk-a1neaaad.js";import"/$bunfs/root/chunk-wd2wq1kn.js";import"/$bunfs/root/chunk-3w3bqp9x.js";import"/$bunfs/root/chunk-pvbbfbpd.js";import{readFile as F}from"fs/promises";import{basename as x,join as G}from"path";import{readdir as y,readFile as C,stat as b}from"fs/promises";import{extname as _,join as v}from"path";var E=52428800,T=200,g=60,D=/<command-name>\/([\w:-]+)<\/command-name>/g,A=/"name":"mcp__([^"]+?)__([^"]+)"/g,f='"content":"<command-name>/',R='"content":"<command-message>',k='"type":"tool_use"',N='"type":"custom-title"',O='"type":"pr-link"',M='"role":"user"',P=/"customTitle":"([^"]+)"/,U=/"prNumber":(\d+)/,L=/"role":"user"[^}]*"content":"([^"]+)"/;async function w(u,a){let s={slashCommandCounts:new Map,mcpServerCounts:new Map,sessionDescriptors:[],sessionFileCount:0},m=Date.now()-a*24*60*60*1000,h;try{h=await y(u)}catch(r){if(Dt(r))return s;throw r}let d=h.filter((r)=>_(r)===".jsonl"),p=(await Promise.all(d.map(async(r)=>{let l=v(u,r);try{let n=await b(l);if(!n.isFile()||n.mtimeMs<m||n.size>E)return null;return l}catch(n){if(Dt(n))return null;throw n}}))).filter((r)=>r!==null);for(let r of p){let l;try{l=await C(r,"utf-8")}catch(e){if(Dt(e))continue;throw e}s.sessionFileCount++;let n={prNumbers:[]};for(let e of l.split(`
`)){if(e.length<10)continue;if(e.includes(f)||e.includes(R))for(let o of e.matchAll(D)){let c=o[1];s.slashCommandCounts.set(c,(s.slashCommandCounts.get(c)??0)+1)}if(e.includes(k)&&e.includes('"name":"mcp__'))for(let o of e.matchAll(A)){let c=o[1];s.mcpServerCounts.set(c,(s.mcpServerCounts.get(c)??0)+1)}if(e.includes(N)){let o=P.exec(e);if(o)n.title=o[1]}if(e.includes(O)){let o=U.exec(e);if(o){let c=Number(o[1]);if(!n.prNumbers.includes(c))n.prNumbers.push(c)}}if(!n.firstMessage&&e.includes(M)&&!e.includes(f)&&!e.includes('"content":[')){let o=L.exec(e);if(o){let c=o[1].replace(/\\n/g," ").replace(/\\"/g,'"');if(c.length>3&&!c.startsWith("<"))n.firstMessage=c.slice(0,T)}}}if(n.title||n.prNumbers.length>0||n.firstMessage)s.sessionDescriptors.push(n)}if(s.sessionDescriptors.length>g)s.sessionDescriptors.sort((r,l)=>{let n=(r.title?2:0)+(r.prNumbers.length>0?1:0);return(l.title?2:0)+(l.prNumbers.length>0?1:0)-n}),s.sessionDescriptors=s.sessionDescriptors.slice(0,g);return s}var W=30;function B(u){try{return new URL(u).origin}catch{return}}async function q(u){try{let a=await F(G(u,".mcp.json"),"utf8"),s=J(a);if(s&&typeof s==="object"&&"mcpServers"in s&&s.mcpServers&&typeof s.mcpServers==="object")return s.mcpServers}catch(a){if(!j(a))t(`team-onboarding: failed to read .mcp.json: ${a instanceof Error?a.message:String(a)}`,{level:"error"})}return{}}async function Y(u){let a=ye(),s=vf(a),m=await w(s,u),h=[...m.slashCommandCounts.entries()].sort((e,o)=>o[1]-e[1]).map(([e,o])=>({name:`/${e}`,count:o})),d=await q(a),p=[...m.mcpServerCounts.entries()].sort((e,o)=>o[1]-e[1]).map(([e,o])=>{let c=d[e];return{name:e,callCount:o,urlOrigin:typeof c?.url==="string"?B(c.url):void 0}}),r=(await Be("git",["config","user.name"],{cwd:a})).stdout.trim(),l=(await Be("git",["remote","get-url","origin"],{cwd:a})).stdout.trim();return{usageData:S({generatedBy:r||void 0,currentRepo:I2(l)??x(a),windowDays:u,sessionCount:m.sessionFileCount,slashCommands:h,mcpServers:p,sessionDescriptors:m.sessionDescriptors},null,2),sessionCount:m.sessionFileCount,slashCommandCount:m.slashCommandCounts.size,mcpServerCount:m.mcpServerCounts.size}}var H=`# Welcome to [Team Name]

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

**Sharing** \u2014 call the ${lot} tool twice:

1. **Right after rendering the draft code block** (still in step 5, before the Review questions). Call with \`mode='check'\` \u2014 this uploads the draft to an existing guide (or creates a new one). Either way you get a \`share_url\` and \`short_code\`. Instead of the \`---\` / \`**Review**\` header from step 5, bridge directly from the link into the numbered questions (no horizontal rule):

   Here's a draft \u2014 a few quick questions to finish it up:

   <share URL>

   Then ask the three numbered questions from step 5 as normal. Save the \`short_code\` from the tool result \u2014 you'll need it in step 2.

2. **After the user answers the Review questions** and you've updated ONBOARDING.md, call it again with \`mode='update'\` and the \`short_code\` from step 1 to refresh the same link. Replace step 5's "drop it in your team docs" close with:

   Here's your onboarding guide: <updated URL>

   Send this to teammates and they'll get a guided walkthrough when they open it in Claude Code.

If the tool returns 'unavailable' at any point, skip that call and use the manual close from step 5 instead.`,X=["Edit(ONBOARDING.md)","Bash(ls *)",lot],V={type:"prompt",name:"team-onboarding",description:"Help teammates ramp on Claude Code with a guide from your usage",allowedTools:X,contentLength:0,policyGate:{policy:"allow_team_onboarding"},isHidden:!1,progressMessage:"scanning usage data",effort:"low",requires:{workspace:!0},userFacingName(){return"team-onboarding"},source:"builtin",disableModelInvocation:!0,async getPromptForCommand(u,a){let s=I("tengu_flint_harbor_prompt",{}),m=typeof s?.prompt==="string"?s.prompt:K,h=typeof s?.guideTemplate==="string"?s.guideTemplate:H,d=typeof s?.windowDays==="number"?Math.min(Math.max(Math.floor(s.windowDays),1),365):W;i("tengu_team_onboarding_invoked",{window_days:d}),await ke((o)=>({...o,teamOnboardingLastUsedAt:Date.now()}),a.storageV5);let{usageData:p,sessionCount:r,slashCommandCount:l,mcpServerCount:n}=await Y(d),e=m.replaceAll("{{WINDOW_DAYS}}",String(d)).replaceAll("{{GUIDE_TEMPLATE}}",h).replaceAll("{{USAGE_DATA}}",p)+(d0e()?z:"");return i("tengu_team_onboarding_generated",{session_count:r,slash_command_count:l,mcp_server_count:n,window_days:d}),[{type:"text",text:e}]}},Ce=V;export{Ce as default};
