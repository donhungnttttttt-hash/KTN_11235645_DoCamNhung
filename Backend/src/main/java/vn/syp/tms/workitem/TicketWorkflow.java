package vn.syp.tms.workitem;

import java.util.*;
import static vn.syp.tms.workitem.WorkItemStore.fail;

/** Pure canonical workflow; UI columns and permission decisions share the same transitions. */
public final class TicketWorkflow {
    private TicketWorkflow() {}
    public record Transition(String state,String closureReason,String columnId,String label) {}
    public record Rights(boolean manager,boolean reviewer,boolean coordinator,boolean assigned,boolean verifier) {}
    public static final List<Transition> COLUMNS=List.of(
        new Transition("SPEC_CONFIRM",null,"spec","Xác nhận spec"),new Transition("NEW",null,"new","Chưa xử lý"),
        new Transition("IN_PROGRESS",null,"progress","Đang xử lý"),new Transition("WAITING_CONFIRM",null,"verify","Chờ xác nhận"),
        new Transition("CLOSED","PROCESSED","processed","Đóng – Đã xử lý"),new Transition("CLOSED","FIXED","fixed","Đóng – Đã sửa"),
        new Transition("CLOSED","CANNOT_REPRODUCE","cannot_reproduce","Đóng – Không thể tái hiện"),
        new Transition("CLOSED","WONT_FIX","wont_fix","Đóng – Không xử lý"),new Transition("CLOSED","UNSUPPORTED","unsupported","QA – Đóng – Không được hỗ trợ"));
    public static Transition combination(String type,String state,String reason) {
        var result=COLUMNS.stream().filter(v->Objects.equals(v.state(),state)&&Objects.equals(v.closureReason(),reason)).findFirst().orElse(null);
        boolean qa="QA".equals(type);
        if(result==null||!Set.of("BUG","QA").contains(type)||qa!=Set.of("spec","unsupported").contains(result.columnId()))fail(422,"INVALID_TICKET_STATE","Tổ hợp loại, trạng thái và lý do đóng không hợp lệ.");
        return result;
    }
    public static String initial(String type){return "QA".equals(type)?"SPEC_CONFIRM":"NEW";}
    public static List<Transition> initialChoices(String type,boolean manager,boolean selfAssigned){
        var choices=new ArrayList<Transition>();choices.add(combination(type,initial(type),null));
        choices.addAll(allowed(type,initial(type),null,new Rights(manager,false,selfAssigned&&"BUG".equals(type),selfAssigned,true)));return List.copyOf(choices);
    }
    public static boolean awaiting(String state,String reason){return "WAITING_CONFIRM".equals(state)||"CLOSED".equals(state)&&"PROCESSED".equals(reason);}
    public static boolean finalized(String state,String reason){return "CLOSED".equals(state)&&reason!=null&&!"PROCESSED".equals(reason);}
    public static String mirror(Transition value){return switch(value.columnId()){
        case "spec"->"clarify";case "new"->"open";case "progress"->"progress";case "verify"->"recheck";case "processed"->"resolved";
        case "fixed","unsupported"->"closed";case "cannot_reproduce"->"unreproducible";case "wont_fix"->"wontfix";default->throw new IllegalArgumentException("Unknown column");};}
    public static List<Transition> allowed(String type,String state,String reason,Rights rights){
        return COLUMNS.stream().filter(target->{
            if("QA".equals(type)!=Set.of("spec","unsupported").contains(target.columnId()))return false;
            if(Objects.equals(state,target.state())&&Objects.equals(reason,target.closureReason()))return false;
            if(rights.manager())return true;
            if(state==null)return false;
            if("QA".equals(type))return "SPEC_CONFIRM".equals(state)&&rights.reviewer()&&"unsupported".equals(target.columnId());
            if(rights.verifier()&&awaiting(state,reason)&&("new".equals(target.columnId())||("PROCESSED".equals(reason)?"fixed":"cannot_reproduce").equals(target.columnId())))return true;
            if(rights.coordinator()&&!finalized(state,reason)&&"wont_fix".equals(target.columnId()))return true;
            return rights.assigned()&&switch(target.columnId()){
                case "progress"->"NEW".equals(state);
                case "processed","verify"->"IN_PROGRESS".equals(state);
                default->false;
            };
        }).toList();
    }
}
