package vn.syp.tms.admin;

import java.time.LocalDate;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/admin/audit")
public class AdminAuditController {
 private final AdminAuditService service;
 public AdminAuditController(AdminAuditService service){this.service=service;}
 @GetMapping public AdminDtos.Page<Map<String,Object>> list(Authentication auth,@RequestParam(required=false) Long projectId,
  @RequestParam(defaultValue="") String type,@RequestParam(required=false) LocalDate from,@RequestParam(required=false) LocalDate through,
  @RequestParam(defaultValue="UTC") String timezone,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
  return service.list(((SessionPrincipal)auth.getPrincipal()).id(),projectId,type,from,through,timezone,page,size);
 }
}
