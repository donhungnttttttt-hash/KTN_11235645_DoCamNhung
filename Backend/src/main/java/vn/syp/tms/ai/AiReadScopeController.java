package vn.syp.tms.ai;

import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

/** AI read scope does not change ordinary ProjectService membership or CRUD policy. */
@RestController
@RequestMapping("/api/v1/ai/projects")
public class AiReadScopeController {
    private final AiPortfolioContext context;
    public AiReadScopeController(AiPortfolioContext context) {this.context=context;}
    @GetMapping public List<Map<String,Object>> projects(Authentication auth) {
        return context.projects(actor(auth)).stream().map(row->{
            var value=new LinkedHashMap<String,Object>();
            for(var key:List.of("id","code","name","archived"))value.put(key,row.get(key));
            value.put("myRole",row.get("membershipRole"));return (Map<String,Object>)value;
        }).toList();
    }
    @GetMapping("/{projectId}/features") public List<Map<String,Object>> features(Authentication auth,@PathVariable long projectId) {return context.features(actor(auth),projectId);}
    private String actor(Authentication auth) {return ((SessionPrincipal)auth.getPrincipal()).id();}
}
