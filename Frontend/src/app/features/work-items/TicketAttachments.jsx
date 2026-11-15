import React,{useEffect,useState,useRef} from 'react';
const imageType=type=>['image/png','image/jpeg'].includes(type);
const videoType=type=>type==='video/mp4';
function VideoPreview({url,name}){
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[url]);
 return <><video className="ticket-video-preview" src={url} controls playsInline preload="metadata" aria-label={`Xem video ${name}`} onError={()=>setFailed(true)}/>{failed&&<p className="wi-note" role="status">Trình duyệt không phát được video này. Bạn có thể tải tệp để xem trên máy.</p>}</>;
}
export const attachmentAccept='.png,.jpg,.jpeg,.pdf,.mp4,.txt,.log,.csv,.json,.zip,.xlsx,.docx';
export function DraftAttachments({files,onRemove,preview=false,disabled=false}){
 const [urls,setUrls]=useState([]);
 useEffect(()=>{const next=files.map(file=>imageType(file.type)||videoType(file.type)?URL.createObjectURL(file):null);setUrls(next);return()=>next.forEach(url=>url&&URL.revokeObjectURL(url));},[files]);
 return <div className={`ticket-files ${preview?'is-preview':''}`}>{files.map((file,index)=><figure key={`${file.name}-${index}`}>{preview&&urls[index]&&(videoType(file.type)?<VideoPreview url={urls[index]} name={file.name}/>:<a href={urls[index]} target="_blank" rel="noreferrer"><img src={urls[index]} alt={file.name}/></a>)}<figcaption><span>{file.name} · {Math.ceil(file.size/1024)} KB</span>{preview&&urls[index]&&videoType(file.type)&&<a href={urls[index]} download={file.name}>Tải video</a>}{onRemove&&<button type="button" disabled={disabled} aria-label={`Bỏ tệp ${file.name}`} onClick={()=>onRemove(index)}>×</button>}</figcaption></figure>)}</div>;
}
function ImageViewer({url,name,onClose}){const ref=useRef(null);useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);return <dialog ref={ref} className="ticket-image-view" aria-label={name} onCancel={onClose}><button type="button" autoFocus onClick={onClose}>Đóng ảnh</button><img src={url} alt={name}/></dialog>;}
function SavedAttachment({file,projectId,issueId,api}){
 const [url,setUrl]=useState(''),[error,setError]=useState(''),[open,setOpen]=useState(false);
 useEffect(()=>{const controller=new AbortController();let objectUrl;
  api.attachment(projectId,issueId,file.id,{signal:controller.signal}).then(blob=>{if(controller.signal.aborted)return;objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[api,projectId,issueId,file.id]);
 return <figure>{url&&imageType(file.mediaType)&&<button type="button" className="ticket-image-button" aria-label={`Xem ảnh ${file.name}`} onClick={()=>setOpen(true)}><img src={url} alt={file.name}/></button>}{url&&videoType(file.mediaType)&&<VideoPreview url={url} name={file.name}/>}<figcaption>{url?<a href={url} download={file.name}>{file.name}</a>:<span>{file.name} · {error||'Đang tải…'}</span>}</figcaption>{open&&<ImageViewer url={url} name={file.name} onClose={()=>setOpen(false)}/>}</figure>;
}
export function TicketAttachments({files=[],...props}){return files.length?<div className="ticket-files is-preview">{files.map(file=><SavedAttachment key={file.id} file={file} {...props}/>)}</div>:null;}
