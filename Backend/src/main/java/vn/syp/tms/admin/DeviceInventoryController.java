package vn.syp.tms.admin;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;
import static vn.syp.tms.admin.DeviceInventoryDtos.*;
@RestController @RequestMapping("/api/v1")
public class DeviceInventoryController {
 private final DeviceInventoryService service;
 public DeviceInventoryController(DeviceInventoryService service){this.service=service;}
 private String actor(Authentication a){return ((SessionPrincipal)a.getPrincipal()).id();}
 @GetMapping("/admin/device-assets") public AdminDtos.Page<Map<String,Object>> assets(Authentication a,@RequestParam(required=false) Long projectId,@RequestParam(defaultValue="") String keyword,@RequestParam(defaultValue="") String status,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return service.assets(actor(a),projectId,keyword,status,page,size);}
 @GetMapping("/admin/device-assets/{id}") public Map<String,Object> asset(Authentication a,@PathVariable long id){return service.asset(actor(a),id);}
 @PostMapping("/admin/device-assets") @ResponseStatus(org.springframework.http.HttpStatus.CREATED) public Map<String,Object> create(Authentication a,@Valid @RequestBody Asset input){return service.create(actor(a),input);}
 @PatchMapping("/admin/device-assets/{id}") public Map<String,Object> update(Authentication a,@PathVariable long id,@Valid @RequestBody Asset input){return service.update(actor(a),id,input);}
 @GetMapping("/admin/device-allocations") public AdminDtos.Page<Map<String,Object>> allocations(Authentication a,@RequestParam(required=false) Long projectId,@RequestParam(required=false) Long assetId,@RequestParam(defaultValue="false") boolean history,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return service.allocations(actor(a),projectId,assetId,history,page,size);}
 @PostMapping("/admin/device-allocations") @ResponseStatus(org.springframework.http.HttpStatus.CREATED) public Map<String,Object> assign(Authentication a,@Valid @RequestBody Assign input){return service.assign(actor(a),input);}
 @PatchMapping("/admin/device-allocations/{id}") public Map<String,Object> receive(Authentication a,@PathVariable long id,@Valid @RequestBody Return input){return service.receive(actor(a),id,input);}
 @GetMapping("/projects/{id}/device-allocations") public AdminDtos.Page<Map<String,Object>> project(Authentication a,@PathVariable long id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return service.projectAllocations(actor(a),id,page,size);}
}
