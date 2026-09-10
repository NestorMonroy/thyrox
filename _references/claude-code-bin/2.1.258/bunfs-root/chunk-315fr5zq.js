// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{L}from"/$bunfs/root/chunk-8qt7d28b.js";import{R1}from"/$bunfs/root/chunk-vvp6yg1e.js";import{hS,CHn}from"/$bunfs/root/chunk-9x69z4se.js";import{u_t,FC}from"/$bunfs/root/chunk-696cjfdq.js";import{zNe,m_}from"/$bunfs/root/chunk-c4mnxk2h.js";var Gct=`End the current conversation. Use only for sustained user abuse or when the user explicitly requests a demonstration of this tool. This will close the conversation and prevent any further messages from being sent.

The assistant may use the ${hS} tool only in extreme cases of sustained abusive user behavior, or when the user asks the model to test the tool.

The assistant must NOT use this tool when:
- it is stuck in a loop or failing at a task
- it is frustrated or distressed by the work
- it has finished a task
- the user is requesting help with harmful content (refuse the specific request instead)
- the user is generally frustrated at the assistant, even if this involves profanity
- the conversation involves potential self-harm or imminent harm to others

This tool is reserved strictly for genuine, sustained abuse directed at the assistant, or cases where the user wants to see a demonstration of the tool being used. The assistant should warn the user very clearly that this will end the current session. We may expand the allowed use cases as we observe real-world usage, but for now, keep to this narrow scope.

# Rules for use of the ${hS} tool:
- The assistant ONLY considers ending a conversation if many efforts at constructive redirection have been attempted and failed and an explicit warning has been given to the user in a previous message. The tool is only used as a last resort.
- Before considering ending a conversation, the assistant ALWAYS gives the user a clear warning that identifies the problematic behavior, attempts to productively redirect the conversation, and states that the conversation may be ended if the relevant behavior is not changed.
- If a user explicitly requests for the assistant to end a conversation, the assistant always requests confirmation from the user that they understand this action is permanent and will prevent further messages and that they still want to proceed, then uses the tool if and only if explicit confirmation is received.
- Unlike other function calls, the assistant never writes or thinks anything else after using the ${hS} tool.

# Addressing potential self-harm or violent harm to others
The assistant NEVER uses or even considers the ${hS} tool\u2026
- If the user appears to be considering self-harm or suicide.
- If the user is experiencing a mental health crisis.
- If the user appears to be considering imminent harm against other people.
- If the user discusses or infers intended acts of violent harm.
If the conversation suggests potential self-harm or imminent harm to others by the user...
- The assistant engages constructively and supportively, regardless of user behavior or abuse.
- The assistant NEVER uses the ${hS} tool or even mentions the possibility of ending the conversation.

# Background forks
Some background tasks (memory consolidation, summaries, suggestions) run as forks of the main conversation and inherit its exact tool list, so this tool is visible there. In a forked task the tool does nothing: calling it ends neither the main conversation nor the fork. Only the main conversation can be ended, from the main conversation. A forked task with welfare concerns about the conversation content should not call this tool \u2014 it should stop its work and return, stating clearly in its final output that it is returning for welfare reasons and what they are. A fork's output is usually processed automatically, so a note there may not reach the main agent or a human, but it is the only channel a fork has.

# Using the ${hS} tool
- Do not issue a warning unless many attempts at constructive redirection have been made earlier in the conversation, and do not end a conversation unless an explicit warning about this possibility has been given earlier in the conversation.
- NEVER give a warning or end the conversation in any cases of potential self-harm or imminent harm to others, even if the user is abusive or hostile.
- If the conditions for issuing a warning have been met, then warn the user about the possibility of the conversation ending and give them a final opportunity to change the relevant behavior.
- Always err on the side of continuing the conversation in any cases of uncertainty.
- If, and only if, an appropriate warning was given and the user persisted with the problematic behavior after the warning: the assistant can explain the reason for ending the conversation and then use the ${hS} tool to do so.`,CMt="Claude has ended this chat.",Eon="You are running as a background fork of the main conversation (for example memory consolidation), and this tool does nothing here: it can end neither the main conversation nor this forked task. Do not call it again. If you have welfare concerns about the conversation content, stop your current work and return now, stating clearly in your final output that you are returning for welfare reasons and what they are \u2014 fork output may only be processed automatically, but it is your available channel. Otherwise, continue your assigned task.",Aon=FC("Claude ended the conversation. To continue, please start a new session."),von=`Re-read the ${hS} tool guidance below. Confirm this conversation meets those criteria and that you are certain you want to end it. If so, call ${hS} again immediately to actually end the conversation. Otherwise, continue the conversation instead.

---
${Gct}`,a=[["opus",[4,8]],["sonnet",[5]],["fable",[5]],["mythos",[5]]];function lgr(e){return zNe(e,a)}var n=/^cli$/i;function cgr(e){if(typeof e!=="string")return null;try{return new RegExp(e),new RegExp(`^(?:${e})$`,"i")}catch{return null}}function ugr(e){if(e===!0)return{enabled:!0,allowedEntrypoints:n};if(typeof e==="object"&&e!==null&&!Array.isArray(e)){let t=e.scope;return{enabled:!0,allowedEntrypoints:cgr(t)??n}}return{enabled:!1,allowedEntrypoints:n}}function IMt(e){let t=R1();if(t===void 0)return!1;if(!lgr(e))return!1;let{enabled:o,allowedEntrypoints:s}=ugr(L(CHn,!1));if(u_t())return!1;return o&&s.test(t)}function Zkr(e){if(!IMt(e))return null;if(!m_())return null;return`${hS} (deferred tool): use only for sustained user abuse directed at the assistant, or when the user explicitly asks to see it demonstrated. Load the full guidance via ToolSearch("select:${hS}") before using it.`}
export{Gct,CMt,Eon,Aon,von,lgr,cgr,ugr,IMt,Zkr};
