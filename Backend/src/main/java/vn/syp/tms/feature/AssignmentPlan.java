package vn.syp.tms.feature;

import java.util.*;
import vn.syp.tms.shared.web.BusinessException;

/** Pure responsibility change command; persistence serializes its document version. */
public final class AssignmentPlan {
    private AssignmentPlan() {}
    public record Change(Long assigneeMembershipId,List<Long> rowIds) {}
    public static Map<Long,Long> apply(Map<Long,Long> current,List<Change> changes,Long self,boolean manager) {
        if(changes==null||changes.isEmpty())throw invalid();
        var owners=new HashSet<Long>();
        for(var change:changes){
            if(change==null||change.assigneeMembershipId()==null||change.assigneeMembershipId()<1||change.rowIds()==null||!owners.add(change.assigneeMembershipId()))throw invalid();
            if(!manager&&(!Objects.equals(self,change.assigneeMembershipId())||changes.size()!=1))
                throw new BusinessException(403,"FORBIDDEN","Chỉ thay đổi phạm vi của chính bạn.");
        }
        var result=new LinkedHashMap<>(current);
        result.replaceAll((row,owner)->owners.contains(owner)?null:owner);
        var selected=new HashSet<Long>();
        for(var change:changes)for(Long row:change.rowIds()){
            if(row==null||!current.containsKey(row))throw invalid();
            if(!selected.add(row)||result.get(row)!=null)
                throw new BusinessException(409,"ASSIGNMENT_CONFLICT","Phạm vi bị trùng với người khác. Giữ lựa chọn và điều chỉnh lại.");
            result.put(row,change.assigneeMembershipId());
        }
        return Collections.unmodifiableMap(result);
    }
    private static BusinessException invalid(){return new BusinessException(422,"INVALID_SCOPE","Phạm vi case không hợp lệ hoặc không thuộc file.");}
}
