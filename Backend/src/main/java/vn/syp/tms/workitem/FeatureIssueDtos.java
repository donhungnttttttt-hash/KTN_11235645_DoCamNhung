package vn.syp.tms.workitem;

import jakarta.validation.constraints.*;
import java.util.UUID;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;

public final class FeatureIssueDtos {
    private FeatureIssueDtos() {}
    public record Create(@NotBlank @Pattern(regexp="BUG|QA") String type,@NotNull @Positive Long featureId,
        @Positive Long documentId,@Positive Long rowId,boolean monkey,@NotBlank @Size(max=300) String title,
        @Size(max=20000) String description,@Size(max=20000) String steps,@Size(max=20000) String expectedResult,
        @Size(max=20000) String actualResult,@NotNull UUID requestKey,
        @Size(max=20000) String preconditions,@Size(max=1000) String frequency,@Size(max=1000) String environment,@Size(max=1000) String device,
        @Positive Long assigneeMembershipId,String ticketState,String closureReason,@Positive Long sourceRevisionId,
        @PositiveOrZero Long sourceResultVersion,@Size(max=255) String manualTestVersion) {
        public Create(String type,Long featureId,Long documentId,Long rowId,boolean monkey,String title,String description,String steps,String expectedResult,String actualResult,UUID requestKey){this(type,featureId,documentId,rowId,monkey,title,description,steps,expectedResult,actualResult,requestKey,null,null,null,null,null,null,null,null,null,null);}
    }
    public record Update(@NotBlank @Size(max=300) String title,@Size(max=20000) String description,
        @Size(max=20000) String steps,@Size(max=20000) String expectedResult,@Size(max=20000) String actualResult,
        @Positive Long assigneeMembershipId,@Pattern(regexp="HIGH|MEDIUM|LOW") String priority,@Size(max=1000) String reason,
        @NotNull @PositiveOrZero Long expectedVersion,@Size(max=20000) String preconditions,@Size(max=1000) String frequency,
        @Size(max=1000) String environment,@Size(max=1000) String device) {
        public Update(String title,String description,String steps,String expectedResult,String actualResult,Long assigneeMembershipId,String priority,String reason,Long expectedVersion){this(title,description,steps,expectedResult,actualResult,assigneeMembershipId,priority,reason,expectedVersion,null,null,null,null);}
    }
    public record Status(@NotBlank @Size(max=32) String status,@NotBlank @Size(max=1000) String reason,
        @NotNull @PositiveOrZero Long expectedVersion) {}
    public record Comment(@NotBlank @Size(max=20000) String body,@NotNull @PositiveOrZero Long expectedVersion,@NotNull UUID requestKey) {}
    public record Restore(@NotNull @PositiveOrZero Long expectedVersion,@NotNull UUID requestKey) {}
    /** Bean fields distinguish omitted optional mutations from an explicit invalid null. */
    public static final class Action {
        @Size(max=20000) public String body;
        @JsonSetter(nulls=Nulls.FAIL) public String state;
        public String closureReason;
        @JsonSetter(nulls=Nulls.FAIL) @Positive public Long assigneeMembershipId;
        @JsonSetter(nulls=Nulls.FAIL) public String verifierUserId;
        public Boolean convertToBug;
        @NotNull @PositiveOrZero public Long expectedVersion;
        @NotNull public UUID requestKey;
        public Action() {}
        public Action(String body,String state,String closureReason,Long assigneeMembershipId,String verifierUserId,Boolean convertToBug,Long expectedVersion,UUID requestKey){this.body=body;this.state=state;this.closureReason=closureReason;this.assigneeMembershipId=assigneeMembershipId;this.verifierUserId=verifierUserId;this.convertToBug=convertToBug;this.expectedVersion=expectedVersion;this.requestKey=requestKey;}
        public String body(){return body;} public String state(){return state;} public String closureReason(){return closureReason;}
        public Long assigneeMembershipId(){return assigneeMembershipId;} public String verifierUserId(){return verifierUserId;}
        public Boolean convertToBug(){return convertToBug;} public Long expectedVersion(){return expectedVersion;} public UUID requestKey(){return requestKey;}
    }
    public record Responsibilities(@NotNull List<String> duties,@NotNull @PositiveOrZero Long expectedVersion) {}
    public record Filter(int page,int size,Long featureId,Long documentId,Long rowId,String type,String status,String keyword,String column,boolean deleted) {
        public Filter(int page,int size,Long featureId,Long documentId,Long rowId,String type,String status,String keyword,String column){this(page,size,featureId,documentId,rowId,type,status,keyword,column,false);}
        public Filter(int page,int size,Long featureId,Long documentId,Long rowId,String type,String status,String keyword){this(page,size,featureId,documentId,rowId,type,status,keyword,null);}
    }
}
