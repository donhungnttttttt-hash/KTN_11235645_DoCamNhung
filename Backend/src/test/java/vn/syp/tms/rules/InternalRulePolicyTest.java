package vn.syp.tms.rules;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.shared.web.BusinessException;

class InternalRulePolicyTest {
    final ObjectMapper json=new ObjectMapper();
    final InternalRulePolicy policy=new InternalRulePolicy(json);
    Map<String,Object> valid() {return new LinkedHashMap<>(Map.of("schemaVersion",1,"scope","INTERNAL_DEMO","sourceReference","ADR-006","titlePrefix","[QA]","requiredFields",new ArrayList<>(InternalRulePolicy.REQUIRED)));}
    @Test void acceptsDeclarativePolicyWithoutChangingReferenceText() throws Exception {
        var result=policy.parse(json.writeValueAsString(valid()));
        assertThat(result.titlePrefix()).isEqualTo("[QA]");assertThat(result.requiredFields()).containsExactlyInAnyOrderElementsOf(InternalRulePolicy.REQUIRED);
    }
    @Test void rejectsMalformedUnknownAndUnboundedPolicy() {
        for(String value:Arrays.asList(null,"","null","[]","broken","x".repeat(4001),"{\"script\":\"alert(1)\"}"))assertThatThrownBy(()->policy.parse(value)).isInstanceOf(BusinessException.class);
    }
    @Test void refusesCoercionMissingFieldsOrWeakenedRequiredFields() throws Exception {
        for(var entry:List.of(Map.entry("schemaVersion",(Object)"1"),Map.entry("schemaVersion",(Object)2),Map.entry("scope",(Object)"CUSTOMER"),Map.entry("scope",(Object)1),Map.entry("sourceReference",(Object)" "),Map.entry("sourceReference",(Object)"x".repeat(501)),Map.entry("sourceReference",(Object)42),Map.entry("titlePrefix",(Object)false),Map.entry("titlePrefix",(Object)"x".repeat(61)),Map.entry("requiredFields",(Object)"title"),Map.entry("requiredFields",(Object)List.of(1)),Map.entry("requiredFields",(Object)List.of("title")),Map.entry("requiredFields",(Object)List.of("title","title","title","title","title","title","title")))) {
            var value=valid();value.put(entry.getKey(),entry.getValue());String payload=json.writeValueAsString(value);
            assertThatThrownBy(()->policy.parse(payload)).as(entry.getKey()).isInstanceOf(BusinessException.class);
        }
        var value=valid();value.remove("scope");value.put("script","no");String payload=json.writeValueAsString(value);
        assertThatThrownBy(()->policy.parse(payload)).isInstanceOf(BusinessException.class);
    }
}
