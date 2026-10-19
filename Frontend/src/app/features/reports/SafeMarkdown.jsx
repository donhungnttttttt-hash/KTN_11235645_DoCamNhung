import React from 'react';

function inlineLinks(text){
  const nodes=[];const links=/\[([^\]]+)\]\(([^\s)]+)\)/g;let start=0,match;
  while((match=links.exec(text))){
    nodes.push(text.slice(start,match.index));let safe=false;
    try{safe=['http:','https:'].includes(new URL(match[2]).protocol);}catch{/* Non-absolute and unsafe links remain literal text. */}
    nodes.push(safe?<a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer">{match[1]}</a>:match[0]);start=links.lastIndex;
  }
  nodes.push(text.slice(start));return nodes;
}
function inline(text){return text.split(/(`[^`]*`)/g).map((part,index)=>part.startsWith('`')&&part.endsWith('`')?<code key={index}>{part.slice(1,-1)}</code>:<React.Fragment key={index}>{inlineLinks(part)}</React.Fragment>);}

/** A deliberately small Markdown reader; React escapes every text/code/HTML token. */
export function SafeMarkdown({markdown=''}){
  const lines=String(markdown).replace(/\r\n?/g,'\n').split('\n'),blocks=[];let index=0;
  while(index<lines.length){
    const line=lines[index];
    if(!line.trim()){index++;continue;}
    if(/^```/.test(line)){
      const key=index,code=[];index++;while(index<lines.length&&!/^```/.test(lines[index]))code.push(lines[index++]);if(index<lines.length)index++;
      blocks.push(<pre key={key}><code>{code.join('\n')}</code></pre>);continue;
    }
    const heading=/^(#{1,6})\s+(.+)$/.exec(line);
    if(heading){blocks.push(React.createElement(`h${Math.min(6,heading[1].length+2)}`,{key:index},inline(heading[2])));index++;continue;}
    const list=/^\s*(?:([-*+])|\d+[.)])\s+(.+)$/.exec(line);
    if(list){
      const key=index,ordered=!list[1],items=[];
      while(index<lines.length){const item=/^\s*(?:([-*+])|\d+[.)])\s+(.+)$/.exec(lines[index]);if(!item||(!item[1])!==ordered)break;items.push(<li key={index}>{inline(item[2])}</li>);index++;}
      blocks.push(React.createElement(ordered?'ol':'ul',{key},items));continue;
    }
    const key=index,text=[line];index++;
    while(index<lines.length&&lines[index].trim()&&!/^(?:```|#{1,6}\s|\s*(?:[-*+]|\d+[.)])\s)/.test(lines[index]))text.push(lines[index++]);
    blocks.push(<p key={key}>{inline(text.join('\n'))}</p>);
  }
  return <div className="safe-markdown">{blocks.length?blocks:<p>Chưa có nội dung Markdown.</p>}</div>;
}
