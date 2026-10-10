package vn.syp.tms.identity;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.shared.web.ApiExceptionHandler;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    private final IdentityService users;
    public UserController(IdentityService users) { this.users = users; }
    @GetMapping
    public IdentityDtos.UserPage list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return users.list(page, size);
    }
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IdentityDtos.User create(@Valid @RequestBody IdentityDtos.CreateUser input, Authentication actor, HttpServletRequest request) {
        return users.create(actor.getName(), input, ApiExceptionHandler.requestId(request));
    }
    @PatchMapping("/{id}")
    public IdentityDtos.User update(@PathVariable String id, @Valid @RequestBody IdentityDtos.UpdateUser input,
                                    Authentication actor, HttpServletRequest request) {
        return users.update(actor.getName(), id, input, ApiExceptionHandler.requestId(request));
    }
}
