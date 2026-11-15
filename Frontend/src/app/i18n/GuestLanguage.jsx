import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {guestJapanese} from './guestJapanese';

export function translateGuest(language,key,values={}){
 const template=language==='ja'?(guestJapanese[key]??key):key;
 return String(template??'').replace(/\{(\w+)\}/g,(match,name)=>values[name]===undefined?match:String(values[name]));
}
function languageTools(language){
 const locale=language==='ja'?'ja-JP':'vi-VN';
 return {language,locale,t:(key,values)=>translateGuest(language,key,values),
  number:value=>new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(Number(value)||0),
  dateTime:(value,timeZone='Asia/Ho_Chi_Minh')=>value?new Date(value).toLocaleString(locale,{timeZone}):'—',
  date:value=>value?new Date(value).toLocaleDateString(locale):'—'};
}
// Shared controls remain Vietnamese outside the customer portal.
const GuestLanguageContext=createContext({...languageTools('vi'),setLanguage:()=>{}});
export const useGuestLanguage=()=>useContext(GuestLanguageContext);
export function GuestLanguageProvider({children}){
 // Each new portal session starts in Japanese, regardless of browser/storage locale.
 const [language,setLanguage]=useState('ja');
 const value=useMemo(()=>({...languageTools(language),setLanguage:next=>setLanguage(next==='vi'?'vi':'ja')}),[language]);
 useEffect(()=>{const previous=document.documentElement.lang;document.documentElement.lang=language;return()=>{document.documentElement.lang=previous;};},[language]);
 return <GuestLanguageContext.Provider value={value}>{children}</GuestLanguageContext.Provider>;
}
export function GuestLanguagePicker(){const {language,setLanguage}=useGuestLanguage();return <label className="guest-language"><span aria-hidden="true">文 / A</span><select aria-label="言語 / Ngôn ngữ" value={language} onChange={e=>setLanguage(e.target.value)}><option value="ja">日本語</option><option value="vi">Tiếng Việt</option></select></label>;}
