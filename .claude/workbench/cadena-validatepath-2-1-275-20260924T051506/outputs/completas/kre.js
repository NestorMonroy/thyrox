function kre(e){let n=e.split(/[\\/]+/);return n.some((r,s)=>{if(r!=="..")return!1;let g=n.slice(0,s).join("/");return RR(g)!==-1||g.includes("[")&&n.slice(s+1).join("/").includes("]")})}
