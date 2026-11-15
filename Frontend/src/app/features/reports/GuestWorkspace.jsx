import {useGuestLanguage,GuestLanguageProvider,GuestLanguagePicker} from '../../i18n/GuestLanguage';
import React from 'react';
import {AccountMenu} from '../auth/AccountMenu';
import {ProjectSelector} from '../projects/ProjectSelector';
import {useProject} from '../projects/ProjectProvider';
import {GuestDashboard} from './GuestDashboard';
import '../projects/projects.css';
import './guest-workspace.css';

export function GuestWorkspace(){return <GuestLanguageProvider><GuestContent/></GuestLanguageProvider>;}
function GuestContent(){
 const {t,language}=useGuestLanguage();
 const {currentProject,loading,error,refreshProjects}=useProject();
 return <div className="guest-workspace" lang={language}><header className="guest-header"><strong>{t('TMS · Customer Portal')}</strong><ProjectSelector/><GuestLanguagePicker/><AccountMenu/></header>
 {loading?<p className="page-container" role="status">{t("Đang tải dự án…")}</p>:error?<p className="page-container" role="alert">{t(error)} <button onClick={()=>refreshProjects()}>{t("Thử lại")}</button></p>:currentProject?<GuestDashboard projectId={currentProject.id}/>:<p className="page-container">{t("Chưa có dự án được chia sẻ với bạn.")}</p>}
 </div>;
}
