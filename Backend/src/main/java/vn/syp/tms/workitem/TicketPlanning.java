package vn.syp.tms.workitem;

import java.util.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import static vn.syp.tms.workitem.WorkItemStore.*;

final class TicketPlanning {
    private TicketPlanning() {}
    static List<Map<String,Object>> milestones(WorkItemStore db,long p,long id){return db.rows("SELECT m.id,m.name,m.archived_at AS archivedAt FROM ticket_milestones t JOIN milestones m ON m.project_id=t.project_id AND m.id=t.milestone_id WHERE t.project_id=? AND t.work_item_id=? ORDER BY m.id",p,id);}
    static boolean apply(WorkItemStore db,long p,long id,Map<String,Object> old,FeatureIssueDtos.Planning input){
        if(input==null)return false;
        if(input.startOn()!=null&&input.dueOn()!=null&&input.dueOn().isBefore(input.startOn()))fail(422,"INVALID_TICKET_DATES","Hạn chót phải từ ngày bắt đầu trở đi.");
        for(LocalDate date:new LocalDate[]{input.startOn(),input.dueOn()})if(date!=null&&(date.getYear()<1000||date.getYear()>9999))fail(422,"INVALID_TICKET_DATES","Ngày phải thuộc khoảng năm 1000–9999.");
        for(BigDecimal hours:new BigDecimal[]{input.estimatedHours(),input.actualHours()})if(hours!=null&&(hours.signum()<0||hours.scale()>2||hours.compareTo(new BigDecimal("99999999.99"))>0))fail(422,"INVALID_TICKET_HOURS","Số giờ phải không âm và có tối đa hai chữ số thập phân.");
        if(input.milestoneIds()==null||input.milestoneIds().size()>30||input.milestoneIds().stream().anyMatch(x->x==null||x<1)||new HashSet<>(input.milestoneIds()).size()!=input.milestoneIds().size())fail(422,"INVALID_MILESTONES","Danh sách mốc quan trọng không hợp lệ.");
        var previous=milestones(db,p,id).stream().map(x->number(x,"id")).toList();
        for(long milestone:input.milestoneIds())if(db.count("SELECT COUNT(*) FROM milestones WHERE project_id=? AND id=? AND (archived_at IS NULL OR id IN (SELECT milestone_id FROM ticket_milestones WHERE project_id=? AND work_item_id=?))",p,milestone,p,id)!=1)fail(422,"INVALID_MILESTONES","Mốc quan trọng phải thuộc dự án và đang hoạt động.");
        boolean changed=!Objects.equals(Objects.toString(old.get("startOn"),null),Objects.toString(input.startOn(),null))||!Objects.equals(Objects.toString(old.get("dueOn"),null),Objects.toString(input.dueOn(),null))||!hoursEqual(old.get("estimatedHours"),input.estimatedHours())||!hoursEqual(old.get("actualHours"),input.actualHours())||!new HashSet<>(previous).equals(new HashSet<>(input.milestoneIds()));
        if(!changed)return false;
        db.update("UPDATE work_item_feature_context SET start_on=?,due_on=?,estimated_hours=?,actual_hours=? WHERE project_id=? AND work_item_id=?",input.startOn(),input.dueOn(),input.estimatedHours(),input.actualHours(),p,id);
        db.update("DELETE FROM ticket_milestones WHERE project_id=? AND work_item_id=?",p,id);
        for(long milestone:input.milestoneIds())db.update("INSERT INTO ticket_milestones(project_id,work_item_id,milestone_id) VALUES(?,?,?)",p,id,milestone);
        return true;
    }
    private static boolean hoursEqual(Object current,BigDecimal next){return current==null?next==null:next!=null&&new BigDecimal(current.toString()).compareTo(next)==0;}
}
