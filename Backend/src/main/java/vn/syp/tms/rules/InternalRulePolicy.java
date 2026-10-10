package vn.syp.tms.rules;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.stereotype.Component;
import vn.syp.tms.shared.web.BusinessException;

/** Declarative internal trial policy; never interprets scripts or arbitrary expressions. */
@Component
public class InternalRulePolicy {
    public static final Set<String> REQUIRED = Set.of("title","steps","expectedResult","actualResult","buildId","environmentId","deviceId");
    private static final Set<String> FIELDS = Set.of("schemaVersion","scope","sourceReference","titlePrefix","requiredFields");
    private final ObjectMapper json;
    public InternalRulePolicy(ObjectMapper json) { this.json=json; }
    public record Policy(int schemaVersion,String scope,String sourceReference,String titlePrefix,List<String> requiredFields) {}
    public Policy parse(String content) {
        try {
            if(content==null || content.length()>4000) throw invalid();
            var tree=json.readTree(content);
            if(!tree.isObject() || tree.size()!=FIELDS.size()) throw invalid();
            var names=new HashSet<String>(); tree.fieldNames().forEachRemaining(names::add);
            if(!names.equals(FIELDS) || !tree.path("schemaVersion").isIntegralNumber() || tree.path("schemaVersion").asInt()!=1
                || !tree.path("scope").isTextual() || !"INTERNAL_DEMO".equals(tree.path("scope").asText())
                || !tree.path("sourceReference").isTextual() || tree.path("sourceReference").asText().isBlank() || tree.path("sourceReference").asText().length()>500
                || !tree.path("titlePrefix").isTextual() || tree.path("titlePrefix").asText().length()>60
                || !tree.path("requiredFields").isArray()) throw invalid();
            var fields=new ArrayList<String>();
            for(var field:tree.path("requiredFields")) { if(!field.isTextual()) throw invalid(); fields.add(field.asText()); }
            if(fields.size()!=REQUIRED.size() || !new HashSet<>(fields).equals(REQUIRED)) throw invalid();
            return new Policy(1,"INTERNAL_DEMO",tree.path("sourceReference").asText(),tree.path("titlePrefix").asText(),List.copyOf(fields));
        } catch (BusinessException e) { throw e; }
        catch (Exception e) { throw invalid(); }
    }
    private BusinessException invalid() {return new BusinessException(422,"INVALID_RULE_POLICY","Quy tắc phải là cấu hình nội bộ có nguồn và đủ trường tối thiểu; không hỗ trợ mã lệnh hoặc biểu thức tùy ý.");}
}
