package vn.syp.tms.workitem;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController @RequestMapping("/api/v1")
public class TicketController {
    private final TicketResponsibilities responsibilities; private final TicketNotifications notifications;
    public TicketController(TicketResponsibilities responsibilities,TicketNotifications notifications){this.responsibilities=responsibilities;this.notifications=notifications;}
    private String actor(Authentication a){return ((SessionPrincipal)a.getPrincipal()).id();}
    @GetMapping("/projects/{p}/ticket-responsibilities") public Object responsibilities(Authentication a,@PathVariable long p){return responsibilities.list(p,actor(a));}
    @PutMapping("/projects/{p}/ticket-responsibilities/{member}") public Object responsibilities(Authentication a,@PathVariable long p,@PathVariable long member,@Valid @RequestBody FeatureIssueDtos.Responsibilities input){return responsibilities.update(p,actor(a),member,input);}
    @GetMapping("/projects/{p}/issues/options") public Object options(Authentication a,@PathVariable long p,@RequestParam String type,@RequestParam(required=false) Long assigneeMembershipId){return responsibilities.options(p,actor(a),type,assigneeMembershipId);}
    @GetMapping("/me/ticket-notifications") public Object notifications(Authentication a,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return notifications.list(actor(a),page,size);}
    @PutMapping("/me/ticket-notifications/{id}/read") public Object read(Authentication a,@PathVariable long id){return notifications.read(actor(a),id);}
}
