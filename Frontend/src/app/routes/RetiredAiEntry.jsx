import React,{useState} from 'react';
import {useChatLauncherHost} from '../features/ai/ChatLauncherSlot';

export function RetiredAiEntry(){
  const {host}=useChatLauncherHost();
  const [notice,setNotice]=useState('');
  function openChat(){
    const launcher=host?.querySelector('button[aria-label="Mở chat AI"]');
    if(launcher&&!launcher.hidden){launcher.click();setNotice('Chat AI đã mở. Chọn Cấu hình AI trên thanh công cụ.');}
    else setNotice('Chọn Cấu hình AI trong Chat đang mở, hoặc mở Chat AI bằng nút ở đầu trang.');
  }
  return <section className="page-container"><h1>Cấu hình AI đã chuyển vào Chat</h1><p>Mở Chat AI và chọn Cấu hình AI trên thanh công cụ để chọn nguồn và mô hình.</p><button className="btn-primary" onClick={openChat}>Mở Chat AI</button>{notice&&<p role="status">{notice}</p>}</section>;
}
