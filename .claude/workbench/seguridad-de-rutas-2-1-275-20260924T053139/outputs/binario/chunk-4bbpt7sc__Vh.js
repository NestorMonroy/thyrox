function Vh(e,n,r){return Vt($e(n,r),(i)=>{if(i.kind==="lstat")return e.lstatSync(i.path);if(i.kind==="opendirNofollow")return e.openDirNoFollowSync(i.path),"ok";return e.readlinkSync(i.path)})}
