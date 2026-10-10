package vn.syp.tms.integration;

import java.util.*;

/** Only approved bug fields cross the boundary. Internal comments, evidence and assignees stay local. */
public record RedminePayload(long projectId,long trackerId,long statusId,long priorityId,
                             String subject,String description,String marker,boolean privateIssue) {
    static RedminePayload from(Map<String,Object> bug,RedmineConfiguration.Mapping mapping,String marker) {
        String title=bug.get("key")+" — "+bug.get("title");
        String subject=title.codePoints().limit(255).collect(StringBuilder::new,(builder, point) -> builder.appendCodePoint(point),(left, right) -> left.append(right)).toString();
        String description="TMS: "+bug.get("key")+"\nTiêu đề: "+bug.get("title")
            +"\n\nBước tái hiện:\n"+bug.get("steps")+"\n\nKết quả mong đợi:\n"+bug.get("expectedResult")
            +"\n\nKết quả thực tế:\n"+bug.get("actualResult")+"\n\nBuild: "+bug.get("buildLabel")
            +"\nMôi trường: "+bug.get("environmentName")+"\nThiết bị: "+bug.get("deviceName");
        if(bug.get("fixedBuildLabel")!=null)description+="\nBuild đã sửa: "+bug.get("fixedBuildLabel");
        return new RedminePayload(mapping.externalProjectId(),mapping.trackerId(),mapping.statuses().get(bug.get("status")),
            mapping.priorities().get(bug.get("priority")),subject,description,marker,true);
    }
    Map<String,Object> wire(long fieldId) {
        return Map.of("issue",Map.of("project_id",projectId,"tracker_id",trackerId,"status_id",statusId,
            "priority_id",priorityId,"subject",subject,"description",description,"is_private",privateIssue,
            "custom_fields",List.of(Map.of("id",fieldId,"value",marker))));
    }
}
