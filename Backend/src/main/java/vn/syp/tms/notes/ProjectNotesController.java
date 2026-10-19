package vn.syp.tms.notes;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/notes")
public class ProjectNotesController {
    private final ProjectNotesService service;
    public ProjectNotesController(ProjectNotesService service){this.service=service;}
    private String actor(Authentication auth){return ((SessionPrincipal)auth.getPrincipal()).id();}
    @GetMapping
    public ProjectNotesDtos.Page list(Authentication auth,@PathVariable long projectId,
            @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return service.list(projectId,actor(auth),page,size);}
    @GetMapping("/{noteId}")
    public ProjectNote get(Authentication auth,@PathVariable long projectId,@PathVariable long noteId){return service.get(projectId,actor(auth),noteId);}
    @PostMapping
    public ResponseEntity<ProjectNote> create(Authentication auth,@PathVariable long projectId,@Valid @RequestBody ProjectNotesDtos.Create input){
        var note=service.create(projectId,actor(auth),input);
        return ResponseEntity.created(URI.create("/api/v1/projects/"+projectId+"/notes/"+note.id())).body(note);
    }
    @PutMapping("/{noteId}")
    public ProjectNote update(Authentication auth,@PathVariable long projectId,@PathVariable long noteId,@Valid @RequestBody ProjectNotesDtos.Update input){return service.update(projectId,actor(auth),noteId,input);}
    @DeleteMapping("/{noteId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(Authentication auth,@PathVariable long projectId,@PathVariable long noteId,@RequestParam(required=false) Long expectedVersion){service.remove(projectId,actor(auth),noteId,expectedVersion);}
}
