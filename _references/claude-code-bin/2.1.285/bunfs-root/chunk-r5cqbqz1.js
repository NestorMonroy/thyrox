// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{wn}from"/$bunfs/root/chunk-axx8rx4e.js";var Uc="claude-in-chrome",bYn="javascript_tool";function ak(e){return wn(e)===Uc}var t="--claude-in-chrome-mcp";function ZWr(e){if(e.type!==void 0&&e.type!=="stdio")return!1;return(e.command?.includes(t)??!1)||(e.args?.some((r)=>r.includes(t))??!1)}var FBo=["file_upload","browser_batch"],vhn=[bYn,"read_page","find","form_input","computer","browser_batch","navigate","resize_window","gif_creator","upload_image","get_page_text","tabs_context_mcp","tabs_create_mcp","tabs_close_mcp","read_console_messages","read_network_requests","shortcuts_list","shortcuts_execute","file_upload","switch_browser","list_connected_browsers","select_browser"];function Vde(){return{type:"stdio",command:process.execPath,args:[t],scope:"dynamic"}}
export{Uc,bYn,ak,ZWr,FBo,vhn,Vde};
