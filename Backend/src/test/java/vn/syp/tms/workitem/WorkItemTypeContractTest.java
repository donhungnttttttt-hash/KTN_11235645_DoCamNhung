package vn.syp.tms.workitem;

import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

/** R04/A08: removed work types must not be creatable through the old public input either. */
class WorkItemTypeContractTest {
    @Test void rejectsRetiredTypesWhileKeepingBugAndQa() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            for (String type : java.util.List.of("TASK", "REQUEST", "IMPROVEMENT")) {
                assertThat(factory.getValidator().validate(command(type)))
                    .as("retired type %s cannot be submitted", type).isNotEmpty();
            }
            assertThat(factory.getValidator().validate(command("BUG"))).isEmpty();
            assertThat(factory.getValidator().validate(command("QA"))).isEmpty();
        }
    }
    private WorkItemDtos.Create command(String type) {
        return new WorkItemDtos.Create(type,"Issue","Description","MEDIUM",null,null,null,
            "Steps","Expected","Actual",null,null,null,null,null,null,"type-contract-key");
    }
}
