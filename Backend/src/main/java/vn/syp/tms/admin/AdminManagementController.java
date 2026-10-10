package vn.syp.tms.admin;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.project.ProjectDtos;

@RestController @RequestMapping("/api/v1/admin")
public class AdminManagementController {
    private final AdminProjectService service;
    public AdminManagementController(AdminProjectService service){this.service=service;}
    private String actor(Authentication a){return ((SessionPrincipal)a.getPrincipal()).id();}
    @PostMapping("/projects") @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public Map<String,Object> create(Authentication a,@Valid @RequestBody AdminProjectService.Create input){return service.create(actor(a),input);}
    @PatchMapping("/projects/{id}") public Map<String,Object> update(Authentication a,@PathVariable long id,@Valid @RequestBody ProjectDtos.UpdateProject input){return service.update(actor(a),id,input);}
    @GetMapping("/projects/{id}/members") public List<ProjectDtos.MemberInfo> members(Authentication a,@PathVariable long id){return service.members(actor(a),id);}
    @PutMapping("/projects/{id}/members/{user}") public ProjectDtos.MemberInfo set(Authentication a,@PathVariable long id,@PathVariable String user,@Valid @RequestBody ProjectDtos.SetMember input){return service.setMember(actor(a),id,user,input);}
    @DeleteMapping("/projects/{id}/members/{user}") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void remove(Authentication a,@PathVariable long id,@PathVariable String user,@RequestParam long expectedVersion){service.removeMember(actor(a),id,user,expectedVersion);}
    @GetMapping("/users") public AdminDtos.Page<Map<String,Object>> users(Authentication a,@RequestParam(required=false) Long projectId,@RequestParam(defaultValue="") String keyword,@RequestParam(required=false) String role,@RequestParam(required=false) Boolean enabled,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return service.users(actor(a),projectId,keyword,role,enabled,page,size);}
}
