package vn.syp.tms.notes;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.project.ProjectService;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.project.SettingsVersion;
import vn.syp.tms.shared.web.BusinessException;

@Service
@Transactional
public class ProjectNotesService {
    private final ProjectNotesStore store;
    private final ProjectService projects;
    private final ProjectAudit audit;
    public ProjectNotesService(ProjectNotesStore store,ProjectService projects,ProjectAudit audit){this.store=store;this.projects=projects;this.audit=audit;}
    @Transactional(readOnly=true)
    public ProjectNotesDtos.Page list(long project,String actor,int page,int size){
        readAccess(project,actor);
        if(page<0||size<1||size>100)throw new BusinessException(422,"INVALID_PAGE","Trang hoặc kích thước trang không hợp lệ.");
        long count=store.count(project);
        return new ProjectNotesDtos.Page(store.list(project,size,(long)page*size),count,page,size,(count+size-1)/size);
    }
    @Transactional(readOnly=true)
    public ProjectNote get(long project,String actor,long id){readAccess(project,actor);return requireNote(project,id,false);}
    public ProjectNote create(long project,String actor,ProjectNotesDtos.Create input){
        writeAccess(project,actor);validate(input.title(),input.body());
        long id=store.create(project,actor,input.title().strip(),input.body());
        audit.record(project,actor,"PROJECT_NOTE",id,"CREATE");
        return requireNote(project,id,false);
    }
    public ProjectNote update(long project,String actor,long id,ProjectNotesDtos.Update input){
        writeAccess(project,actor);validate(input.title(),input.body());
        var current=requireNote(project,id,true);SettingsVersion.require(current.version(),input.expectedVersion());
        requireChanged(store.update(project,id,actor,input.title().strip(),input.body(),current.version()));
        audit.record(project,actor,"PROJECT_NOTE",id,"UPDATE");
        return requireNote(project,id,false);
    }
    public void remove(long project,String actor,long id,Long version){
        writeAccess(project,actor);var current=requireNote(project,id,true);SettingsVersion.require(current.version(),version);
        requireChanged(store.archive(project,id,actor,current.version()));
        audit.record(project,actor,"PROJECT_NOTE",id,"ARCHIVE");
    }
    private void readAccess(long project,String actor){requireProjectId(project);projects.requireReadAccess(project,actor);}
    private void writeAccess(long project,String actor){requireProjectId(project);projects.lockWritableProject(project,actor);}
    private void requireProjectId(long project){if(project<1)throw missing();}
    private ProjectNote requireNote(long project,long id,boolean lock){
        if(id<1)throw missing();var note=store.get(project,id,lock);if(note==null)throw missing();return note;
    }
    private BusinessException missing(){return new BusinessException(404,"NOT_FOUND","Không tìm thấy Note trong dự án.");}
    private void requireChanged(int count){if(count!=1)throw new BusinessException(409,"VERSION_CONFLICT","Note đã thay đổi. Tải lại để đối chiếu trước khi lưu.");}
    private void validate(String title,String body){
        if(title==null||title.isBlank()||title.length()>200||body==null||body.isBlank()||body.length()>10000)
            throw new BusinessException(422,"VALIDATION_ERROR","Nhập tiêu đề tối đa 200 ký tự và nội dung tối đa 10.000 ký tự.");
    }
}
