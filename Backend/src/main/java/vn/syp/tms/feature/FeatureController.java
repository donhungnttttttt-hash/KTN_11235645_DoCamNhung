package vn.syp.tms.feature;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/projects/{projectId}")
public class FeatureController {
    private final FeatureService service;
    public FeatureController(FeatureService service){this.service=service;}
    private String actor(Authentication auth){return ((SessionPrincipal)auth.getPrincipal()).id();}
    @GetMapping("/features")
    public Map<String,Object> list(Authentication auth,@PathVariable long projectId,
            @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,
            @RequestParam(defaultValue="") String keyword,@RequestParam(defaultValue="false") boolean archived,
            @RequestParam(required=false) String createdFrom,@RequestParam(required=false) String createdTo,
            @RequestParam(defaultValue="created-desc") String sort) {
        return service.list(projectId,actor(auth),page,size,keyword,archived,createdFrom,createdTo,sort);
    }
    @GetMapping("/features/{id}") public Map<String,Object> get(Authentication auth,@PathVariable long projectId,@PathVariable long id){return service.get(projectId,actor(auth),id);}
    @PostMapping("/features") public ResponseEntity<Map<String,Object>> create(Authentication auth,@PathVariable long projectId,@Valid @RequestBody FeatureDtos.Create input){var result=service.create(projectId,actor(auth),input);return ResponseEntity.created(URI.create("/api/v1/projects/"+projectId+"/features/"+result.get("id"))).body(result);}
    @PutMapping("/features/{id}") public Map<String,Object> update(Authentication auth,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody FeatureDtos.Update input){return service.update(projectId,actor(auth),id,input);}
    @PostMapping("/features/{id}/archive") public Map<String,Object> archive(Authentication auth,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody FeatureDtos.Version input){return service.archive(projectId,actor(auth),id,input,true);}
    @PostMapping("/features/{id}/restore") public Map<String,Object> restore(Authentication auth,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody FeatureDtos.Version input){return service.archive(projectId,actor(auth),id,input,false);}
    @GetMapping("/features/{id}/documents") public Map<String,Object> documents(Authentication auth,@PathVariable long projectId,@PathVariable long id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="") String keyword){return service.listDocuments(projectId,actor(auth),id,page,size,keyword);}
    @PostMapping("/features/{featureId}/documents/{id}/archive") public Map<String,Object> archiveDocument(Authentication auth,@PathVariable long projectId,@PathVariable long featureId,@PathVariable long id,@Valid @RequestBody FeatureDtos.Version input){return service.hideDocument(projectId,actor(auth),featureId,id,input);}
    @PostMapping(value="/features/{featureId}/import-previews",consumes="multipart/form-data") public Map<String,Object> preview(Authentication auth,@PathVariable long projectId,@PathVariable long featureId,@RequestParam MultipartFile file){return service.preview(projectId,actor(auth),featureId,file);}
    @GetMapping("/features/{featureId}/import-previews/{id}") public Map<String,Object> preview(Authentication auth,@PathVariable long projectId,@PathVariable long featureId,@PathVariable long id){return service.getPreview(projectId,actor(auth),featureId,id);}
    @PostMapping("/features/{featureId}/import-previews/{id}/commit") public Map<String,Object> commit(Authentication auth,@PathVariable long projectId,@PathVariable long featureId,@PathVariable long id){return service.commit(projectId,actor(auth),featureId,id);}
    @GetMapping("/test-documents/{id}/assignments") public Map<String,Object> assignments(Authentication auth,@PathVariable long projectId,@PathVariable long id){return service.assignments(projectId,actor(auth),id);}
    @PutMapping("/test-documents/{id}/assignments") public Map<String,Object> assignments(Authentication auth,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody FeatureDtos.Assignments input){return service.assign(projectId,actor(auth),id,input);}
    @GetMapping("/test-documents/{id}/assignment-history") public Map<String,Object> history(Authentication auth,@PathVariable long projectId,@PathVariable long id,@RequestParam(defaultValue="0") long before){return service.history(projectId,actor(auth),id,before);}
}
