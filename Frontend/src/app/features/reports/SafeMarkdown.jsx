import {useGuestLanguage} from '../../i18n/GuestLanguage';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './safe-markdown.css';

function safeUrl(value){try{return ['http:','https:'].includes(new URL(value).protocol)?value:'';}catch{return '';}}
// Keep rejected URLs inert; no raw HTML plugin or remote image requests.
function inertLinks(){return tree=>{
 const visit=node=>{if(node.children)node.children=node.children.map(child=>{
  if(child.type==='link'&&!safeUrl(child.url))return {type:'text',value:`[${(child.children||[]).map(x=>x.value||'').join('')}](${child.url})`};
  if(child.type==='image'||child.type==='imageReference')return {type:'text',value:child.alt||''};
  visit(child);return child;
 });};visit(tree);
};}
export function SafeMarkdown({markdown=''}){
 const {t}=useGuestLanguage();
 return <div className="safe-markdown">{String(markdown).trim()?<ReactMarkdown remarkPlugins={[remarkGfm,inertLinks]} urlTransform={safeUrl} components={{
  a:({node,...props})=>props.href?<a {...props} target="_blank" rel="noopener noreferrer"/>:<span>{props.children}</span>,
  img:()=>null,
  table:({node,...props})=><div className="markdown-table-scroll"><table {...props}/></div>,
 }}>{String(markdown)}</ReactMarkdown>:<p>{t("Chưa có nội dung Markdown.")}</p>}</div>;
}
