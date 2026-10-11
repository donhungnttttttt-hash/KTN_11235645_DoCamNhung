package vn.syp.tms.testcase;

import java.util.*;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/test-documents/{documentId}")
public class TestDocumentEditingController {
    private final TestDocumentEditingService editing;
    public TestDocumentEditingController(TestDocumentEditingService editing){this.editing=editing;}
    private String actor(Authentication auth){return ((SessionPrincipal)auth.getPrincipal()).id();}
    @PostMapping("/approvals")
    public Map<String,Integer> approve(Authentication auth,@PathVariable long projectId,@PathVariable long documentId,
            @Valid @RequestBody TestDocumentDtos.ApproveRows input){return Map.of("approvedCount",editing.approveRows(projectId,actor(auth),documentId,input));}
    @PutMapping("/rows/{rowId}/cells/{column}")
    public Map<String,Boolean> edit(Authentication auth,@PathVariable long projectId,@PathVariable long documentId,@PathVariable long rowId,
            @PathVariable int column,@Valid @RequestBody TestDocumentDtos.EditCell input){
        editing.edit(projectId,actor(auth),documentId,rowId,column,input);return Map.of("saved",true);
    }
    @GetMapping("/rows/{rowId}/cells/{column}/history")
    public List<Map<String,Object>> history(Authentication auth,@PathVariable long projectId,@PathVariable long documentId,@PathVariable long rowId,@PathVariable int column){
        return editing.history(projectId,actor(auth),documentId,rowId,column);
    }
    @PutMapping("/rows/{rowId}/second-test")
    public Map<String,Boolean> assign(Authentication auth,@PathVariable long projectId,@PathVariable long documentId,@PathVariable long rowId,
            @Valid @RequestBody TestDocumentDtos.AssignSecondTest input){
        editing.assign(projectId,actor(auth),documentId,rowId,input);return Map.of("saved",true);
    }
}
